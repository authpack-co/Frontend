const utils = {
    showModal(modalName, itemId) {
        const modal = document.getElementById(modalName + 'Modal');
        modal.classList.add('show');

        if (itemId) {
            modal.dataset.itemId = itemId;
        }
    },

    closeModals() {
        const modals = document.querySelectorAll(".modals .show");
        modals.forEach(item => {
            item.classList.remove("show");
            this.resetModal(item);
        });
    },

    resetModal(modal) {
        // Limpa erro no input
        this.clearInputError(modal);

        // Retorna botão para estado inicial
        const buttonContent = modal.querySelector(".buttonContent");

        if (buttonContent && !buttonContent.classList.contains("content-state")) setElementState(buttonContent, "content");
    },

    setModalError(modal, message) {
        const inputElement = modal.querySelector("input");
        const errorMessage = modal.querySelector(".error-message");

        if (inputElement) {
            inputElement.classList.add("invalid");
        }

        errorMessage.classList.remove("hidden");
        errorMessage.textContent = message;
    },

    clearInputError(modal) {
        const inputElement = modal.querySelector("input");
        const errorMessage = modal.querySelector(".error-message");

        if (inputElement) {
            inputElement.classList.remove("invalid");
        }

        if (errorMessage) {
            errorMessage.textContent = "";
            errorMessage.classList.add("hidden");
        }
    },

    setShareModalOpenState(isOpen) {
        const toggle = document.querySelector('#sharePackageModal #generalToggle');
        const statusBadge = document.querySelector('#sharePackageModal #statusBadge');
        const linkDisplay = document.querySelector('#sharePackageModal #generalLinkDisplay');
        if (!toggle || !statusBadge || !linkDisplay) return;
        const statusText = statusBadge.querySelector('span');

        if (isOpen) {
            toggle.classList.add('active');
            statusBadge.className = 'status-badge status-open';
            statusText.textContent = 'Acesso público';
            linkDisplay.classList.remove('disabled');
        } else {
            toggle.classList.remove('active');
            statusBadge.className = 'status-badge status-closed';
            statusText.textContent = 'Acesso restrito';
            linkDisplay.classList.add('disabled');
        }
    },

    buildInviteUrl(key) {
        if (!key) return '';
        return `${window.location.origin}/pages/package-invite/?key=${encodeURIComponent(key)}`;
    },

    formatExpiry(expiresAt) {
        const now = Date.now();
        const target = new Date(expiresAt).getTime();
        const diffMs = target - now;
        if (diffMs <= 0) return 'expirou';
        const totalMin = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMin / 60);
        const mins = totalMin % 60;
        if (hours > 0 && mins > 0) return `expira em ${hours}h ${mins}min`;
        if (hours > 0) return `expira em ${hours}h`;
        return `expira em ${mins}min`;
    },

    validateField(value, config = {}) {
        const trimmed = value.trim();
        const type = config.type;

        // impede valores vazios
        if (!config.allowEmpty && trimmed.length === 0) {
            if (type === "name") {
                return { valid: false, reason: 'O nome não pode estar vazio.' };
            } else if (type === "key") {
                return { valid: false, reason: 'A chave não pode estar vazia.' };
            } else {
                return { valid: false, reason: 'Este campo não pode estar vazio.' };
            }
        }

        // checa tamanho mínimo
        if (config.minLength && trimmed.length < config.minLength) {
            return { valid: false, reason: `Mínimo de ${config.minLength} caracteres.` };
        }

        // checa tamanho máximo
        if (config.maxLength && trimmed.length > config.maxLength) {
            return { valid: false, reason: `Máximo de ${config.maxLength} caracteres.` };
        }

        // validações específicas por tipo de campo
        if (type === "name") {
            if (trimmed.length > 20) {
                return { valid: false, reason: "O nome deve ter no máximo 20 caracteres." };
            }

            if (/[<>/"'{};]/.test(trimmed)) {
                return { valid: false, reason: "O nome contém caracteres não permitidos." };
            }
        }

        if (type === "key") {
            const isUUIDv4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!isUUIDv4.test(trimmed)) {
                return { valid: false, reason: "Chave inválida." };
            }
        }

        return { valid: true };
    },

    getElementState(el) {
        const state = el.classList.endsWith("-state") ? el.classList.toString().split(" ").find(c => c.endsWith("-state")).replace("-state", "") : null;
        return state;
    }
}

// Dynamic Event Listeners ==========

const listenerMap = [
    { selector: '.options-btn', event: 'click', handler: handleToggleOptions },
    { selector: '.session-options-btn', event: 'click', handler: handleToggleSessionOptions },
    { selector: '.preset-collection .list-item', event: 'click', handler: handleListItemClick },
    { selector: '.edit-package-btn', event: 'click', handler: setupEditPackageForm },
    { selector: '.delete-package-btn', event: 'click', handler: setupDeletePackageForm },
    { selector: '.abort-package-access-btn', event: 'click', handler: setupAbortPackageAccessForm },
    { selector: '.remove-user-access-btn', event: 'click', handler: setupRemoveUserAccessForm },
    { selector: '.share-package-btn', event: 'click', handler: setupSharePackageForm },
    { selector: '.update-package-btn', event: 'click', handler: handleUpdatePackage },
    { selector: '.edit-session-btn', event: 'click', handler: setupEditSessionForm },
    { selector: '.delete-session-btn', event: 'click', handler: setupDeleteSessionForm },
    { selector: '.connect-session-btn', event: 'click', handler: handleConnectSession },
    { selector: '.list-item.user .details-btn', event: 'click', handler: showUserScreen },
    { selector: '.session-card .details-btn', event: 'click', handler: showSessionScreen }
];

const listenerSelectors = listenerMap.map(l => l.selector).join(',');

function processElement(el) {
    if (!(el instanceof HTMLElement) || el.dataset.listenersBound) return;
    el.dataset.listenersBound = 'true';

    for (const { selector, event, handler } of listenerMap) {
        if (el.matches(selector)) el.addEventListener(event, handler);
    }

    // Tratamentos especiais
    if (el.matches('.session-icon img')) {
        el.addEventListener('error', e => {
            e.target.src = chrome.runtime.getURL('popup/images/fallbackIcon.png');
        });
    }
}

function initExistingElements() {
    for (const { selector } of listenerMap) {
        document.querySelectorAll(selector).forEach(processElement);
    }
}

initExistingElements();

// Observa mudanças no DOM para aplicar listeners a novos elementos

const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;
            processElement(node);
            node.querySelectorAll?.(listenerSelectors).forEach(processElement);
        }
    }
});

observer.observe(document, { childList: true, subtree: true });


// Handlers dos eventos


function handleToggleOptions(e) {
    e.stopPropagation();
    const activePackageOptions = document.querySelectorAll('.package-options:not(.hidden)');
    activePackageOptions.forEach(packageOptions => {
        packageOptions.classList.add('hidden');
    });

    const packageOptions = e.currentTarget.nextElementSibling;
    packageOptions?.classList.toggle('hidden');
}

function handleToggleSessionOptions(e) {
    e.stopPropagation();

    // Fecha todas as session-options abertas
    const activeSessionOptions = document.querySelectorAll('.session-options:not(.hidden)');
    activeSessionOptions.forEach(opt => {
        if (opt !== e.currentTarget.closest('.session-card')?.querySelector('.session-options')) {
            opt.classList.add('hidden');
        }
    });

    const card = e.currentTarget.closest('.session-card');
    const sessionOptions = card?.querySelector('.session-options');
    sessionOptions?.classList.toggle('hidden');
}

function handleListItemClick(e) {
    const clickedItem = e.target.closest('.list-item');
    if (!clickedItem) return;

    const isSession = clickedItem.classList.contains('session');
    const isExpanded = clickedItem.classList.contains('expanded');

    const itemsToCollapse = isSession
        ? document.querySelectorAll('.session')
        : document.querySelectorAll('.user');

    itemsToCollapse.forEach(i => i.classList.remove('expanded'));

    clickedItem.classList.toggle('expanded', !isExpanded);
}

async function handleRemoveUser(e) {
    e.stopPropagation();

    const removeUserAccessModal = document.querySelector('#removeUserAccessModal');
    const packageId = removeUserAccessModal.dataset.packageId;
    const userId = removeUserAccessModal.dataset.userId;

    const buttonContent = removeUserAccessBtn.closest('.buttonContent');

    // Verifica se já está em estado de loading (evita múltiplas ações)
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;

    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para remover usuário do package
    const fetchRemoveUser = await fetchManager.removeUserFromPackage({ packageId, userId });

    if (!fetchRemoveUser.ok) {
        notify("error", "Não foi possível remover o usuário do pacote.");
        setElementState(buttonContent, "content");
        return;
    }

    // fecha modal
    utils.closeModals();

    // Remove usuário do array local de usuários do package
    const packageData = packagesList.userCollection.find(pkg => pkg.id == packageId);
    const userIdx = packageData.users.findIndex(user => user.id == userId);
    packageData.users.splice(userIdx, 1);

    // Atualiza stats do package em cache
    packageData.stats.totalUsers -= 1;

    // Recalcula tier do package (remoção de usuário pode rebaixar de Plus p/ Basic)
    recalculateAllPackageTiers();

    // Notifica ação
    notify("success", "Usuário removido do pacote.");

    // Remove usuário da tela
    const userEl = document.querySelector("#package-details .users-panel .user[data-user-id='" + userId + "']");
    userEl.classList.add("fadeOut");

    userEl.addEventListener("animationend", () => {
        userEl.remove();

        // Renderiza package stats atualizados
        const periodSelected = document.querySelector(".usage-chart-container .chart-period-select option:checked").value;
        const period = periodSelected === "today" ? 1 : (periodSelected === "7days" ? 7 : 30);
        loadPackageStats(packageData, period);

        // Se não houver mais usuários, seta estado para empty
        if (packageData.users.length === 0) {
            const usersPanelContainer = document.querySelector("#package-details .users-panel-container");
            setElementState(usersPanelContainer, "empty");
        }
    }, { once: true });
}

async function handleConnectSession(e) {
    e.stopPropagation();

    // Ignora clique se o botão estiver desabilitado (pacote inativo)
    if (this.disabled) return;

    // Verifica se a extensão está instalada
    if (document.documentElement.getAttribute('data-authpack-active') !== '1') {
        utils.showModal("extensionRequired");
        return;
    }

    // Obtém detalhes do pacote e da sessão
    const packageEl = this.closest('#package-details');
    const packageId = packageEl.dataset.packageId;

    const sessionEl = this.closest('.session-card') || this.closest('.list-item.session');
    const sessionId = sessionEl.dataset.sessionId;

    const isAccess = sessionEl.closest('.preset-collection') ? false : true;

    const packageData = isAccess
        ? packagesList.userAccess.find(pkg => pkg.id == packageId)
        : packagesList.userCollection.find(pkg => pkg.id == packageId);
    const sessionData = packageData.sessions.find(session => session.id == sessionId);

    // O connect passa pela extensão (fluxo unificado connectSession): a ponte (bridge.js) relança
    // como "redirectUser", que pré-seta os cookies, abre a aba e o connectHold restaura in-page.
    // (O window.open direto parou de funcionar quando o connect foi unificado no pré-stage.)
    window.postMessage({
        source: 'authpack-page',
        type: 'authpack:connect',
        session: {
            id: sessionId,
            packageId: packageId,
            isAcquired: isAccess,
            url: sessionData.url,
            sessionName: sessionData.name || "",
            sessionIcon: sessionData.icon || "",
            ownerName: packageData?.owner?.name || "",
        }
    }, location.origin);
}

function handleUpdatePackage(e) {
    e.stopPropagation();

    // Fecha o menu de opções
    document.querySelectorAll('.package-options:not(.hidden)').forEach(o => o.classList.add('hidden'));

    // Exige a extensão instalada (ela é quem abre/captura/fecha as abas)
    if (document.documentElement.getAttribute('data-authpack-active') !== '1') {
        utils.showModal("extensionRequired");
        return;
    }

    const packageEl = this.closest('.access-item');
    const packageId = packageEl.dataset.packageId;
    const packageData = packagesList.userCollection.find(pkg => pkg.id == packageId);
    if (!packageData) return;

    const sessions = (packageData.sessions || []).map(s => ({ id: s.id, url: s.url, icon: s.icon, name: s.name }));

    const modal = document.getElementById('updatePackageModal');
    const nameEl = modal.querySelector('.up-pkg-name');
    const statusEl = modal.querySelector('.up-status');
    const countEl = modal.querySelector('.up-count');
    const fillEl = modal.querySelector('.up-bar-fill');
    const listEl = modal.querySelector('.up-list');
    const closeBtn = modal.querySelector('.up-close');
    const total = sessions.length;

    // Reset
    nameEl.textContent = packageData.name || '';
    fillEl.style.width = '0%';
    countEl.textContent = `0/${total}`;
    closeBtn.disabled = true;
    listEl.innerHTML = '';
    modal.removeAttribute('data-result');

    // Render uma linha por sessão (cada uma resolve de forma independente)
    const rowById = {};
    sessions.forEach(s => {
        const row = document.createElement('li');
        row.className = 'up-item';
        row.dataset.sessionId = s.id;
        row.dataset.state = 'pending';

        const icon = document.createElement('img');
        icon.className = 'up-item-icon';
        icon.src = s.icon || '';
        icon.alt = '';
        icon.addEventListener('error', () => {
            const fb = document.createElement('span');
            fb.className = 'up-item-icon up-item-icon--fb';
            fb.textContent = (s.name || '?').trim().charAt(0).toUpperCase();
            icon.replaceWith(fb);
        });

        let label = s.name;
        if (!label) { try { label = new URL(s.url).hostname.replace(/^www\./, ''); } catch { label = s.url; } }
        const nameSpan = document.createElement('span');
        nameSpan.className = 'up-item-name';
        nameSpan.textContent = label;

        const status = document.createElement('span');
        status.className = 'up-item-status';

        row.append(icon, nameSpan, status);
        listEl.appendChild(row);
        rowById[s.id] = row;
    });

    if (total === 0) {
        statusEl.textContent = 'Sem sessões para atualizar';
        closeBtn.disabled = false;
        utils.showModal('updatePackage', packageId);
        closeBtn.onclick = () => utils.closeModals();
        return;
    }

    statusEl.textContent = 'Atualizando sessões…';
    utils.showModal('updatePackage', packageId);

    // Escuta o progresso transmitido pela extensão (via content/bridge.js)
    function onMessage(ev) {
        if (ev.origin !== location.origin) return;
        const d = ev.data;
        if (d?.source !== 'authpack-extension') return;

        if (d.type === 'authpack:updateProgress') {
            const row = rowById[d.current?.id];
            if (row) row.dataset.state = d.current.status === 'ok' ? 'ok' : 'error';
            countEl.textContent = `${d.done}/${d.total}`;
            fillEl.style.width = `${Math.round((d.done / d.total) * 100)}%`;
        } else if (d.type === 'authpack:updateDone') {
            window.removeEventListener('message', onMessage);
            fillEl.style.width = '100%';
            // Garante que nenhuma linha fique presa em "pendente"
            Object.values(rowById).forEach(r => { if (r.dataset.state === 'pending') r.dataset.state = 'error'; });
            const failed = d.failed?.length || 0;
            countEl.textContent = `${d.ok}/${d.total}`;
            statusEl.textContent = failed === 0
                ? 'Todas as sessões foram atualizadas'
                : `${d.ok} atualizada(s) · ${failed} com falha`;
            modal.dataset.result = failed === 0 ? 'success' : 'partial';
            closeBtn.disabled = false;
        }
    }
    window.addEventListener('message', onMessage);
    closeBtn.onclick = () => { window.removeEventListener('message', onMessage); utils.closeModals(); };

    // Dispara o refresh na extensão
    window.postMessage({ source: 'authpack-page', type: 'authpack:updatePackage', packageId, sessions }, location.origin);
}

function setupEditPackageForm(e) {
    e.stopPropagation();

    // Fecha modais abertos
    const activePackageOptions = document.querySelectorAll('.package-options:not(.hidden)');
    activePackageOptions.forEach(packageOptions => {
        packageOptions.classList.add('hidden');
    });

    const packageEl = this.closest('.access-item');
    const packageId = packageEl.dataset.packageId;
    const packageName = packageEl.querySelector(".access-title").textContent;

    const editPackageModal = document.querySelector("#editPackageModal");
    const editPackageInput = editPackageModal.querySelector("input");

    editPackageInput.value = packageName;

    utils.showModal("editPackage", packageId);

    editPackageModal.addEventListener('transitionend', () => {
        editPackageInput.focus();

        // coloca o cursor no final
        const len = editPackageInput.value.length;
        editPackageInput.setSelectionRange(len, len);
    }, { once: true });

}

function setupSharePackageForm(e) {
    e.stopPropagation();
    // Fecha modais abertos
    const activePackageOptions = document.querySelectorAll('.package-options:not(.hidden)');
    activePackageOptions.forEach(packageOptions => {
        packageOptions.classList.add('hidden');
    });

    const packageEl = this.closest('.access-item');
    const packageId = packageEl.dataset.packageId;

    const sharePackageModal = document.querySelector("#sharePackageModal");
    const inputName = sharePackageModal.querySelector(".share-pkg-name");
    const generalLinkUrl = sharePackageModal.querySelector("#generalLinkUrl");

    const packageData = packagesList.userCollection.find(pkg => pkg.id == packageId);
    const isOpen = packageData.open !== 0;

    inputName.value = packageData.name;
    generalLinkUrl.textContent = utils.buildInviteUrl(packageData.key);
    utils.setShareModalOpenState(isOpen);

    // Reset unique-keys list to empty placeholder; will be populated by loader.
    const list = sharePackageModal.querySelector("#uniqueKeysList");
    list.innerHTML = '<li class="unique-keys-empty">Carregando…</li>';

    utils.showModal("sharePackage", packageId);

    // Fetch active unique keys for this package.
    loadActiveUniqueKeys(packageId);
}

async function loadActiveUniqueKeys(packageId) {
    const list = document.querySelector("#sharePackageModal #uniqueKeysList");
    const res = await fetchManager.getActiveUniqueKeys(packageId);

    if (!res.ok) {
        list.innerHTML = '<li class="unique-keys-empty">Não foi possível carregar os links únicos.</li>';
        return;
    }

    renderUniqueKeysList(res.result.data || []);
}

function renderUniqueKeysList(keys) {
    const list = document.querySelector("#sharePackageModal #uniqueKeysList");
    list.innerHTML = '';

    if (!keys.length) {
        const empty = document.createElement('li');
        empty.className = 'unique-keys-empty';
        empty.textContent = 'Nenhum link único ativo no momento.';
        list.appendChild(empty);
        return;
    }

    keys.forEach(k => list.appendChild(buildUniqueKeyItem(k)));
}

function buildUniqueKeyItem(k) {
    const url = utils.buildInviteUrl(k.key);

    const li = document.createElement('li');
    li.className = 'unique-key-item';

    const info = document.createElement('div');
    info.className = 'unique-key-info';

    const urlEl = document.createElement('span');
    urlEl.className = 'unique-key-url';
    urlEl.textContent = url;
    urlEl.title = url;

    const expiryEl = document.createElement('span');
    expiryEl.className = 'unique-key-expiry';
    expiryEl.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
        </svg>
        <span>${utils.formatExpiry(k.expiresAt)}</span>
    `;

    info.appendChild(urlEl);
    info.appendChild(expiryEl);

    const actions = document.createElement('div');
    actions.className = 'unique-key-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'unique-key-copy';
    copyBtn.textContent = 'Copiar';
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(url).then(() => {
            copyBtn.textContent = 'Copiado';
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.textContent = 'Copiar';
                copyBtn.classList.remove('copied');
            }, 1200);
        }).catch(() => notify('error', 'Não foi possível copiar o link.'));
    });

    const revokeBtn = document.createElement('button');
    revokeBtn.className = 'unique-key-revoke';
    revokeBtn.title = 'Revogar link';
    revokeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
    `;
    revokeBtn.addEventListener('click', async () => {
        const packageId = sharePackageModal.dataset.itemId;
        revokeBtn.disabled = true;
        copyBtn.disabled = true;

        const res = await fetchManager.revokeUniqueKey(packageId, k.id);

        if (!res.ok) {
            revokeBtn.disabled = false;
            copyBtn.disabled = false;
            notify('error', res.result && res.result.errorMessage ? res.result.errorMessage : 'Não foi possível revogar o link.');
            return;
        }

        // Remove item da lista com fade-out; mostra empty state se ficar vazia.
        li.classList.add('removing');
        setTimeout(() => {
            const list = li.parentElement;
            li.remove();
            if (list && !list.querySelector('.unique-key-item')) {
                const empty = document.createElement('li');
                empty.className = 'unique-keys-empty';
                empty.textContent = 'Nenhum link único ativo no momento.';
                list.appendChild(empty);
            }
        }, 200);

        notify('success', 'Link único revogado.');
    });

    actions.appendChild(copyBtn);
    actions.appendChild(revokeBtn);

    li.appendChild(info);
    li.appendChild(actions);
    return li;
}

function setupDeletePackageForm(e) {
    e.stopPropagation();

    // Fecha modais abertos
    const activePackageOptions = document.querySelectorAll('.package-options:not(.hidden)');
    activePackageOptions.forEach(packageOptions => {
        packageOptions.classList.add('hidden');
    });

    const packageEl = this.closest('.access-item');
    const packageId = packageEl.dataset.packageId;
    const packageName = packageEl.querySelector(".access-title").textContent;

    const deletePackageModal = document.querySelector("#deletePackageModal");
    const dynamicTitle = deletePackageModal.querySelector(".modal-body .form-text strong");

    dynamicTitle.textContent = packageName;
    utils.showModal("deletePackage", packageId);
}

function setupAbortPackageAccessForm(e) {
    e.stopPropagation();

    // Fecha modais abertos 
    const activePackageOptions = document.querySelectorAll('.package-options:not(.hidden)');
    activePackageOptions.forEach(packageOptions => {
        packageOptions.classList.add('hidden');
    });

    const packageEl = this.closest('.access-item');
    const packageId = packageEl.dataset.packageId;
    const packageName = packageEl.querySelector(".access-title").textContent;

    const abortPackageModal = document.querySelector("#abortPackageAccessModal");
    const dynamicTitle = abortPackageModal.querySelector(".modal-body .form-text strong");

    dynamicTitle.textContent = packageName;
    utils.showModal("abortPackageAccess", packageId);
}

function setupRemoveUserAccessForm(e) {
    e.stopPropagation();

    const userEl = this.closest(".user");
    const userId = userEl.dataset.userId;
    const userName = userEl.querySelector(".item-name").textContent;

    const packageDetailsEl = document.querySelector("#package-details");
    const packageId = packageDetailsEl.dataset.packageId;

    const removeUserAccessModal = document.querySelector("#removeUserAccessModal");
    removeUserAccessModal.dataset.packageId = packageId;
    removeUserAccessModal.dataset.userId = userId;

    const dynamicTitle = removeUserAccessModal.querySelector(".modal-body .form-text strong");
    dynamicTitle.textContent = userName;
    utils.showModal("removeUserAccess");
}

function setupEditSessionForm(event) {
    event.stopPropagation();

    const sessionEl = this.closest(".session-card") || this.closest(".session");
    const sessionId = sessionEl.dataset.sessionId;
    const sessionName = sessionEl.querySelector(".session-card-name")?.textContent || sessionEl.querySelector(".item-name")?.textContent;

    // Fecha session-options se estiver aberto
    const sessionOptions = sessionEl.querySelector('.session-options');
    if (sessionOptions) sessionOptions.classList.add('hidden');

    const editSessionModal = document.querySelector("#editSessionModal");
    const editSessionInput = editSessionModal.querySelector("input");

    editSessionInput.value = sessionName;

    utils.showModal("editSession", sessionId);

    editSessionModal.addEventListener('transitionend', () => {
        editSessionInput.focus();

        // coloca o cursor no final
        const len = editSessionInput.value.length;
        editSessionInput.setSelectionRange(len, len);
    }, { once: true });
}

function setupDeleteSessionForm(event) {
    event.stopPropagation();

    const sessionEl = this.closest(".session-card") || this.closest(".session");
    const sessionId = sessionEl.dataset.sessionId;
    const sessionName = sessionEl.querySelector(".session-card-name")?.textContent || sessionEl.querySelector(".item-name")?.textContent;

    // Fecha session-options se estiver aberto
    const sessionOptions = sessionEl.querySelector('.session-options');
    if (sessionOptions) sessionOptions.classList.add('hidden');

    const deleteSessionModal = document.querySelector("#deleteSessionModal");
    const dynamicTitle = deleteSessionModal.querySelector(".modal-body .form-text strong");

    dynamicTitle.textContent = sessionName;
    utils.showModal("deleteSession", sessionId);
}

function showUserScreen(event) {
    event.stopPropagation();
    const userEl = this.closest(".user");
    const userId = userEl.dataset.userId;

    const packageDetails = document.querySelector("#package-details");
    const packageId = packageDetails.dataset.packageId;

    const screensContainer = document.querySelector(".screens-container");
    screensContainer.classList.add("show-next-screen");

    const secondaryScreenSection = screensContainer.querySelector(".screen-section.secondary");
    const presetUserOverview = secondaryScreenSection.querySelector(".preset-user-overview");
    presetUserOverview.dataset.userId = userId;

    setElementState(secondaryScreenSection, "user-overview");

    // scroll até screens container
    const yOffset = -120;
    const y = screensContainer.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });

    screensContainer.addEventListener('transitionend', () => {
        const primaryScreenSection = screensContainer.querySelector(".screen-section.primary");
        setElementState(primaryScreenSection, "none");
    }, { once: true });

    const package = packagesList.userCollection.find(p => p.id === packageId);
    const user = package.users.find(u => u.id === userId);

    // Obtém o período selecionado
    const periodSelected = document.querySelector("#packageChartPeriodSelect option:checked").value;
    const userPeriodSelect = document.querySelector("#userChartPeriodSelect");
    userPeriodSelect.value = periodSelected;

    const chartContainer = userPeriodSelect.closest(".usage-chart-container");
    const chartTitle = chartContainer.querySelector('.chart-title');

    switch (periodSelected) {
        case "today":
            chartTitle.textContent = "Uso do pacote hoje";
            break;
        case "7days":
            chartTitle.textContent = "Uso do pacote nos últimos 7 dias";
            break;
        case "30days":
            chartTitle.textContent = "Uso do pacote nos últimos 30 dias";
            break;
    }

    const period = periodSelected === "today" ? 0 : (periodSelected === "7days" ? 7 : 30);

    renderUserDetails(user, package, period);
}

function showSessionScreen(event) {
    event.stopPropagation();
    const sessionEl = this.closest(".session-card") || this.closest(".session");
    const sessionId = sessionEl.dataset.sessionId;

    const packageDetails = document.querySelector("#package-details");
    const packageId = packageDetails.dataset.packageId;

    const screensContainer = document.querySelector(".screens-container");
    screensContainer.classList.add("show-next-screen");

    const secondaryScreenSection = screensContainer.querySelector(".screen-section.secondary");
    const presetSessionOverview = secondaryScreenSection.querySelector(".preset-session-overview");
    presetSessionOverview.dataset.sessionId = sessionId;

    setElementState(secondaryScreenSection, "session-overview");

    // scroll até screens container
    const yOffset = -120;
    const y = screensContainer.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });

    screensContainer.addEventListener('transitionend', () => {
        const primaryScreenSection = screensContainer.querySelector(".screen-section.primary");
        setElementState(primaryScreenSection, "none");
    }, { once: true });

    const package = packagesList.userCollection.find(p => p.id === packageId);
    const session = package.sessions.find(s => s.id === sessionId);

    // Obtém o período selecionado
    const periodSelected = document.querySelector("#packageChartPeriodSelect option:checked").value;
    const sessionPeriodSelect = document.querySelector("#sessionChartPeriodSelect");
    sessionPeriodSelect.value = periodSelected;

    const chartContainer = sessionPeriodSelect.closest(".usage-chart-container");
    const chartTitle = chartContainer.querySelector('.chart-title');

    switch (periodSelected) {
        case "today":
            chartTitle.textContent = "Uso do pacote hoje";
            break;
        case "7days":
            chartTitle.textContent = "Uso do pacote nos últimos 7 dias";
            break;
        case "30days":
            chartTitle.textContent = "Uso do pacote nos últimos 30 dias";
            break;
    }

    const period = periodSelected === "today" ? 0 : (periodSelected === "7days" ? 7 : 30);

    renderSessionDetails(session, package, period);
}

// Fixed Event Listeners ==========

// Close modals
const closeBtns = document.querySelectorAll(".close-btn");
closeBtns.forEach(item => item.addEventListener("click", event => {
    utils.closeModals();
}));

// Plus Subscribe
const plusSubscribeBtns = document.querySelectorAll('.plus-subscribe-btn');
plusSubscribeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        utils.showModal("plusSubscribe");
    });
});

// Plus CTA (redirect to checkout page)
const plusCtaBtn = document.querySelector('.plus-cta-btn');
if (plusCtaBtn) {
    plusCtaBtn.addEventListener('click', async () => {
        if (plusCtaBtn.disabled) return;

        plusCtaBtn.disabled = true;
        const originalText = plusCtaBtn.textContent;
        plusCtaBtn.textContent = 'Redirecionando...';

        try {
            const res = await fetchManager.createCheckoutOrder({ origin: 'platform' });

            if (!res.ok) {
                const errMsg = res.result?.error === 'ALREADY_SUBSCRIBED_TO_THIS_PLAN'
                    ? 'Você já possui uma assinatura ativa.'
                    : res.result?.error || 'Erro ao iniciar checkout.';
                alert(errMsg);
                plusCtaBtn.disabled = false;
                plusCtaBtn.textContent = originalText;
                return;
            }

            const orderId = res.result?.id;
            if (!orderId) {
                alert('Erro ao criar pedido. Tente novamente.');
                plusCtaBtn.disabled = false;
                plusCtaBtn.textContent = originalText;
                return;
            }

            window.location.href = `/pages/checkout/?orderId=${orderId}`;
        } catch (err) {
            console.error('Plus checkout redirect error:', err);
            alert('Erro inesperado. Tente novamente.');
            plusCtaBtn.disabled = false;
            plusCtaBtn.textContent = originalText;
        }
    });
}

const cancelBtns = document.querySelectorAll(".cancel-btn");
cancelBtns.forEach(item => item.addEventListener("click", event => {
    utils.closeModals();
}));

// Abre o modal Plus automaticamente quando vindo do upsell (ex.: extensão -> ?upgrade=plus)
(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgrade") === "plus") {
        utils.showModal("plusSubscribe");

        // Limpa o query param para não reabrir ao recarregar
        params.delete("upgrade");
        const query = params.toString();
        const cleanUrl = window.location.pathname + (query ? `?${query}` : "") + window.location.hash;
        window.history.replaceState({}, "", cleanUrl);
    }
})();

// ==== Click outside to close
document.addEventListener('click', e => {
    // Close package options if click outside
    if (!e.target.closest('.options-btn')) {
        const activePackageOptions = document.querySelectorAll('.package-options:not(.hidden)');
        activePackageOptions.forEach(packageOptions => {
            packageOptions.classList.add('hidden');
        });
    }

    // Close session options if click outside
    if (!e.target.closest('.session-options-btn') && !e.target.closest('.session-options')) {
        const activeSessionOptions = document.querySelectorAll('.session-options:not(.hidden)');
        activeSessionOptions.forEach(opt => {
            opt.classList.add('hidden');
        });
    }

    // Close product options if click outside
    if (!e.target.closest('.product-options-btn') && !e.target.closest('.product-options')) {
        const activeProductOptions = document.querySelectorAll('.product-options:not(.hidden)');
        activeProductOptions.forEach(opt => {
            opt.classList.add('hidden');
        });
    }

});

// Create package
const createPackageModal = document.querySelector('#createPackageModal');
const createPackageInput = createPackageModal.querySelector('input');
const confirmCreatePackageBtn = createPackageModal.querySelector('.confirm-btn');

const createPackageBtns = document.querySelectorAll('.create-package-btn');
createPackageBtns.forEach(createPackageBtn => {
    createPackageBtn.addEventListener('click', () => {
        // Verifica limite do plano free (3 pacotes basic)
        if (currentUserInfo?.plan === 'free') {
            const basicCount = packagesList.userCollection.filter(pkg => pkg.tier === 'basic').length;
            if (basicCount >= FREE_PLAN_LIMITS.basicPackages) {
                utils.showModal("plusSubscribe");
                return;
            }
        }

        utils.showModal("createPackage");
        createPackageInput.value = "";

        createPackageModal.addEventListener('transitionend', () => {
            createPackageInput.focus();

            // coloca o cursor no final
            const len = createPackageInput.value.length;
            createPackageInput.setSelectionRange(len, len);
        }, { once: true });
    });
});

const createPackageHandler = async (event) => {
    // Valida valor do input
    const packageName = createPackageInput.value.trim();
    const isValidName = utils.validateField(packageName, { maxLength: 20, allowEmpty: false, type: "name" });
    if (!isValidName.valid) {
        return utils.setModalError(createPackageModal, isValidName.reason);
    }

    // Verifica se já está em estado de loading (evita múltiplas ações)
    let buttonContent;
    if (event.currentTarget.classList.contains("confirm-btn")) {
        buttonContent = event.currentTarget.closest(".buttonContent");
    } else {
        const container = createPackageInput.closest(".input-actions");
        buttonContent = container.querySelector(".buttonContent");
    }
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;

    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para criar novo package
    const fetchCreatePackage = await fetchManager.createPackage({ name: packageName });

    console.log(fetchCreatePackage);

    // Se houver erro durante a criação do package
    if (!fetchCreatePackage.ok) {
        notify("error", "Não foi possível criar pacote.");
        return utils.closeModals();
    }

    // Se não tiver packages, seta estado de content
    if (packagesList.userCollection.length === 0) {
        setElementState(document.querySelector("#packages-list"), "collection");
    }

    // Adiciona novo package no array local de packages
    const packageData = fetchCreatePackage.result.data;
    packagesList.userCollection.push(packageData);

    // Atualiza contador x/3 (tier do novo pacote já vem correto do backend)
    updateFreePlanPackageCounter();

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Pacote criado.");

    // Adiciona novo package na tela
    const createdPackageEl = createPackageElement(packageData, false);
    createdPackageEl.classList.add("fadeInFromRight");

    const packagesGrid = document.querySelector("#packages-list .preset-collection .access-grid");
    packagesGrid.insertBefore(createdPackageEl, packagesGrid.lastChild);

    // Seleciona package
    selectPackage(packageData.id)

    createdPackageEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // evita scroll vertical
        inline: "end"     // rola horizontalmente até o fim
    });

    createdPackageEl.addEventListener("animationend", () => {
        createdPackageEl.classList.remove("fadeInFromRight");
    }, { once: true });

    // Atualiza o contador do plano free (x/3) após criar pacote
    updateFreePlanPackageCounter();
};

confirmCreatePackageBtn.addEventListener('click', createPackageHandler);
createPackageInput.addEventListener('keydown', event => {
    const isErrorShown = !createPackageModal.querySelector(".error-message").classList.contains("hidden");
    if (isErrorShown) {
        utils.clearInputError(createPackageModal);
    }

    if (event.key === "Enter") {
        createPackageHandler(event);
    }
});

// Edit Package
const editPackageModal = document.querySelector('#editPackageModal');
const editPackageInput = editPackageModal.querySelector('input');
const confirmEditPackageBtn = editPackageModal.querySelector('.confirm-btn');

const editPackageHandler = async (event) => {
    // Valida valor do input
    const newPackageName = editPackageInput.value.trim();
    const isValidName = utils.validateField(newPackageName, { maxLength: 20, allowEmpty: false, type: "name" });
    if (!isValidName.valid) {
        return utils.setModalError(editPackageModal, isValidName.reason);
    }

    // Verifica se já está em estado de loading (evita múltiplas ações)
    let buttonContent;
    if (event.currentTarget.classList.contains("confirm-btn")) {
        buttonContent = event.currentTarget.closest(".buttonContent");
    } else {
        const container = editPackageInput.closest(".input-actions");
        buttonContent = container.querySelector(".buttonContent");
    }
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;


    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para editar package
    const packageId = editPackageModal.dataset.itemId;
    const fetchEditPackage = await fetchManager.editPackage({ id: packageId, name: newPackageName });

    console.log(fetchEditPackage);

    // Se houver erro durante a edição do package
    if (!fetchEditPackage.ok) {
        notify("error", "Não foi possível editar pacote.");
        return utils.closeModals();
    }

    // Edita package no array local de packages
    const packageIdx = packagesList.userCollection.findIndex(pkg => pkg.id == packageId);
    packagesList.userCollection[packageIdx].name = newPackageName;

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Pacote editado.");

    // Edita package na tela
    const packageToEdit = document.querySelector(`#packages-list .preset-collection .access-grid .access-item[data-package-id="${packageId}"]`);

    const packageTitle = packageToEdit.querySelector(".access-title");
    packageTitle.textContent = newPackageName;
    packageToEdit.classList.add("fadeIn");

    renderPackageDetails(packagesList.userCollection[packageIdx]);

    packageToEdit.addEventListener("animationend", () => {
        packageToEdit.classList.remove("fadeIn");
    }, { once: true });
}

confirmEditPackageBtn.addEventListener('click', editPackageHandler);
editPackageInput.addEventListener('keydown', event => {
    const isErrorShown = !editPackageModal.querySelector(".error-message").classList.contains("hidden");
    if (isErrorShown) {
        utils.clearInputError(editPackageModal);
    }

    if (event.key === "Enter") {
        editPackageHandler(event);
    }
});

// Delete Package
const deletePackageModal = document.querySelector('#deletePackageModal');
const confirmDeletePackageBtn = deletePackageModal.querySelector('.confirm-btn');

const deletePackageHandler = async (event) => {
    // Verifica se já está em estado de loading (evita múltiplas ações)
    let buttonContent;
    if (event.currentTarget.classList.contains("confirm-btn")) {
        buttonContent = event.currentTarget.closest(".buttonContent");
    } else {
        const container = deletePackageModal.closest(".input-actions");
        buttonContent = container.querySelector(".buttonContent");
    }
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;

    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para excluir package
    const packageId = deletePackageModal.dataset.itemId;
    const fetchDeletePackage = await fetchManager.deletePackage({ id: packageId });

    console.log(fetchDeletePackage);

    // Se houver erro durante a  do session
    if (!fetchDeletePackage.ok) {
        notify("error", "Não foi possível excluir pacote.");
        return utils.closeModals();
    }

    // Deleta package no array local de packages
    const packageIdx = packagesList.userCollection.findIndex(pkg => pkg.id == packageId);
    const deletedTier = packagesList.userCollection[packageIdx].tier;
    packagesList.userCollection.splice(packageIdx, 1);

    // Se um Basic foi removido, verifica se algum Plus pode ser rebaixado
    if (deletedTier === 'basic') {
        downgradePlusAfterBasicDeletion();
    } else {
        // Plus removido: só atualiza o contador x/3
        updateFreePlanPackageCounter();
    }

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Pacote deletado.");

    // Remove package da tela
    const packageToDelete = document.querySelector(`#packages-list .preset-collection .access-grid .access-item[data-package-id="${packageId}"]`);
    packageToDelete.classList.add("fadeOut");

    packageToDelete.addEventListener("animationend", () => {
        packageToDelete.remove();

        // Se não houver mais packages, seta estado para empty
        if (packagesList.userCollection.length === 0) {
            setElementState(document.querySelector("#packages-list"), "empty-collection");
        }

        // Se não houver nenhum package selecionado, deseleciona detalhes
        const selectedPackageEl = document.querySelector(`#packages-list .preset-collection .access-grid .access-item.selected`);
        if (!selectedPackageEl) {
            setElementState(document.querySelector("#package-details"), "empty");
        }
    }, { once: true });
}

confirmDeletePackageBtn.addEventListener('click', deletePackageHandler);

// Abort Package Access
const abortPackageAccessModal = document.querySelector('#abortPackageAccessModal');
const confirmAbortPackageAccessBtn = abortPackageAccessModal.querySelector('.confirm-btn');

const abortPackageAccessHandler = async (event) => {
    // Verifica se já está em estado de loading (evita múltiplas ações)
    let buttonContent;
    if (event.currentTarget.classList.contains("confirm-btn")) {
        buttonContent = event.currentTarget.closest(".buttonContent");
    } else {
        const container = abortPackageAccessModal.closest(".input-actions");
        buttonContent = container.querySelector(".buttonContent");
    }
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;

    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para encerrar acesso
    const packageId = abortPackageAccessModal.dataset.itemId;
    const fetchAbortAccess = await fetchManager.abortPackageAccess({ id: packageId });

    console.log(fetchAbortAccess);

    // Se houver erro durante a criação do session
    if (!fetchAbortAccess.ok) {
        notify("error", "Não foi possível encerrar acesso ao pacote.");
        return utils.closeModals();
    }

    // Deleta package no array local de packages
    const packageIdx = packagesList.userAccess.findIndex(pkg => pkg.id == packageId);
    packagesList.userAccess.splice(packageIdx, 1);

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Acesso Encerrado.");

    // Remove package da tela
    const packageToDelete = document.querySelector(`#packages-list .preset-access .access-grid .access-item[data-package-id="${packageId}"]`);
    packageToDelete.classList.add("fadeOut");

    packageToDelete.addEventListener("animationend", () => {
        packageToDelete.remove();

        // Se não houver mais packages, seta estado para empty
        if (packagesList.userAccess.length === 0) {
            setElementState(document.querySelector("#packages-list"), "empty-access");
        }

        // Se não houver nenhum package selecionado, deseleciona detalhes
        const selectedPackageEl = document.querySelector(`#packages-list .preset-access .access-grid .access-item.selected`);
        if (!selectedPackageEl) {
            setElementState(document.querySelector("#package-details"), "empty");
        }
    }, { once: true });
};

confirmAbortPackageAccessBtn.addEventListener('click', abortPackageAccessHandler);

// Remove User
const removeUserAccessModal = document.querySelector("#removeUserAccessModal");
const removeUserAccessBtn = removeUserAccessModal.querySelector(".confirm-btn");
removeUserAccessBtn.addEventListener('click', handleRemoveUser);


// Activate Package
const activationInputs = document.querySelectorAll(".activation-input input");
const activationBtns = document.querySelectorAll(".activation-input button");
const activatePackageHandler = async event => {
    // Valida valor do input
    const activationSection = event.currentTarget.closest(".activation-input");
    const activationBtn = activationSection.querySelector("button");
    const activationInput = activationSection.querySelector("input");
    const key = activationInput.value.trim();
    const isValidKey = utils.validateField(key, { allowEmpty: false, type: "key" });

    // Se a chave não for válida
    if (!isValidKey.valid) {
        return utils.setModalError(activationSection, isValidKey.reason);
    }

    // Verifica se já está em estado de loading (evita múltiplas ações)
    const buttonContent = activationBtn.closest(".buttonContent");
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;

    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para usar package key
    const fetchUsePackageKey = await fetchManager.usePackageKey({ key });

    console.log(fetchUsePackageKey);

    // Se houver erro durante a ativação
    if (!fetchUsePackageKey.ok) {
        // Seta botão para estado inicial
        setElementState(buttonContent, "content");

        if (fetchUsePackageKey.status === 400) {
            notify("error", fetchUsePackageKey.result.errorMessage);
        } else {
            notify("error", fetchUsePackageKey.result.errorMessage);
        }

        return;
    }

    // Se não tiver packages, seta estado de content
    if (packagesList.userAccess.length === 0) {
        setElementState(document.querySelector("#packages-list"), "access");
    }

    // Adiciona novo package no array local de packages
    const packageData = fetchUsePackageKey.result.data;
    packagesList.userAccess.push(packageData);

    // Notifica ação
    notify("success", "Pacote Ativado.");

    // Seta estado do botão para content, reseta e limpa input
    setElementState(buttonContent, "content");
    activationInput.value = "";
    utils.clearInputError(activationSection);

    // Adiciona novo package na tela
    const packageEl = createPackageElement(packageData, true);
    packageEl.classList.add("fadeInFromRight");

    const packagesGrid = document.querySelector("#packages-list .preset-access .access-grid");
    packagesGrid.insertBefore(packageEl, packagesGrid.lastChild);

    // Seleciona package
    selectPackage(packageData.id, false)

    packageEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // evita scroll vertical
        inline: "end"     // rola horizontalmente até o fim
    });

    packageEl.addEventListener("animationend", () => {
        packageEl.classList.remove("fadeInFromRight");
    }, { once: true });
};

activationBtns.forEach(activationBtn => {
    activationBtn.addEventListener('click', activatePackageHandler);
});

activationInputs.forEach(input => {
    input.addEventListener('keydown', event => {
        const activationSection = event.currentTarget.closest(".activation-input");
        const isErrorShown = !activationSection.querySelector(".error-message").classList.contains("hidden");
        if (isErrorShown) {
            utils.clearInputError(activationSection);
        }
        if (event.key === "Enter") {
            activatePackageHandler(event);
        }
    });
});

// Share Package (v2: link público + links únicos)
const sharePackageModal = document.querySelector('#sharePackageModal');
const generalToggle = sharePackageModal.querySelector('#generalToggle');
const copyGeneralLinkBtn = sharePackageModal.querySelector('#copyGeneralLinkBtn');
const renewGeneralKeyBtn = sharePackageModal.querySelector('#renewGeneralKeyBtn');
const generateUniqueKeyBtn = sharePackageModal.querySelector('#generateUniqueKeyBtn');

// Toggle público (open/closed) — apenas o link geral é afetado; links únicos seguem válidos.
generalToggle.addEventListener('click', async () => {
    const packageId = sharePackageModal.dataset.itemId;
    const fetchToggleAccess = await fetchManager.togglePackageState({ id: packageId });

    if (!fetchToggleAccess.ok) {
        notify("error", "Não foi possível alterar o acesso.");
        return utils.closeModals();
    }

    const packageIdx = packagesList.userCollection.findIndex(pkg => pkg.id == packageId);
    const packageData = packagesList.userCollection[packageIdx];
    const wasOpen = packageData.open !== 0;
    packagesList.userCollection[packageIdx].open = wasOpen ? 0 : 1;

    utils.setShareModalOpenState(!wasOpen);
});

// Copia o link público.
copyGeneralLinkBtn.addEventListener('click', () => {
    const url = sharePackageModal.querySelector("#generalLinkUrl").textContent;
    if (!url || url === '—') return;
    navigator.clipboard.writeText(url).then(() => {
        copyGeneralLinkBtn.textContent = "Copiado";
        setTimeout(() => {
            copyGeneralLinkBtn.textContent = "Copiar";
        }, 1000);
    }).catch(() => {
        notify("error", "Não foi possível copiar o link.");
    });
});

// Renova a key geral — invalida o link público anterior.
renewGeneralKeyBtn.addEventListener('click', async () => {
    const packageId = sharePackageModal.dataset.itemId;
    const fetchRenewKey = await fetchManager.renewPackageKey({ id: packageId });

    if (!fetchRenewKey.ok) {
        notify("error", "Não foi possível renovar a chave.");
        return utils.closeModals();
    }

    const newKey = fetchRenewKey.result.data.key;

    // Atualiza chave no array local + URL na tela.
    const packageIdx = packagesList.userCollection.findIndex(pkg => pkg.id == packageId);
    packagesList.userCollection[packageIdx].key = newKey;

    const urlEl = sharePackageModal.querySelector("#generalLinkUrl");
    urlEl.textContent = utils.buildInviteUrl(newKey);

    notify("success", "Link público renovado.");
});

// Gera um novo link único (válido por 24h, uso único).
generateUniqueKeyBtn.addEventListener('click', async () => {
    const packageId = sharePackageModal.dataset.itemId;

    const buttonLabel = generateUniqueKeyBtn.querySelector('span');
    const originalLabel = buttonLabel ? buttonLabel.textContent : null;
    generateUniqueKeyBtn.disabled = true;
    if (buttonLabel) buttonLabel.textContent = 'Gerando…';

    const res = await fetchManager.createUniqueKey(packageId);

    generateUniqueKeyBtn.disabled = false;
    if (buttonLabel && originalLabel) buttonLabel.textContent = originalLabel;

    if (!res.ok) {
        notify("error", res.result && res.result.errorMessage ? res.result.errorMessage : "Não foi possível gerar o link único.");
        return;
    }

    // Append to current list (prepend so newest shows first).
    const list = sharePackageModal.querySelector("#uniqueKeysList");
    const emptyState = list.querySelector('.unique-keys-empty');
    if (emptyState) emptyState.remove();
    list.insertBefore(buildUniqueKeyItem(res.result.data), list.firstChild);

    notify("success", "Link único gerado.");
});

// Edit Session
const editSessionModal = document.querySelector('#editSessionModal');
const editSessionInput = editSessionModal.querySelector('input');
const confirmEditSessionBtn = editSessionModal.querySelector('.confirm-btn');
const editSessionHandler = async (event) => {
    // Valida valor do input
    const newSessionName = editSessionInput.value.trim();
    const isValidName = utils.validateField(newSessionName, { maxLength: 50, allowEmpty: false, type: "name" });
    if (!isValidName.valid) {
        return utils.setModalError(editSessionModal, isValidName.reason);
    }
    // Verifica se já está em estado de loading (evita múltiplas ações)
    let buttonContent;
    if (event.currentTarget.classList.contains("confirm-btn")) {
        buttonContent = event.currentTarget.closest(".buttonContent");
    } else {
        const container = editSessionInput.closest(".input-actions");
        buttonContent = container.querySelector(".buttonContent");
    }
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;
    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para editar session
    const sessionId = editSessionModal.dataset.itemId;
    const fetchEditSession = await fetchManager.editSession({ id: sessionId, name: newSessionName });

    console.log(fetchEditSession);

    // Se houver erro durante a edição da session
    if (!fetchEditSession.ok) {
        notify("error", "Não foi possível editar sessão.");
        return utils.closeModals();
    }

    // Edita session no array local de packages
    const sessionPkgIdx = packagesList.userCollection.findIndex(pkg => pkg.sessions.some(sess => sess.id == sessionId));
    const sessionIdx = packagesList.userCollection[sessionPkgIdx].sessions.findIndex(sess => sess.id == sessionId);
    packagesList.userCollection[sessionPkgIdx].sessions[sessionIdx].name = newSessionName;

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Sessão editada.");

    // Edita session na tela
    const sessionToEdit = document.querySelector(`.sessions-panel .session-card[data-session-id="${sessionId}"]`);
    sessionToEdit.querySelector(".session-card-name").textContent = newSessionName;
    sessionToEdit.classList.add("fadeIn");

    sessionToEdit.addEventListener("animationend", () => {
        sessionToEdit.classList.remove("fadeIn");
    }, { once: true });
}

confirmEditSessionBtn.addEventListener('click', editSessionHandler);
editSessionInput.addEventListener('keydown', event => {
    const isErrorShown = !editSessionModal.querySelector(".error-message").classList.contains("hidden");
    if (isErrorShown) {
        utils.clearInputError(editSessionModal);
    }
    if (event.key === "Enter") {
        editSessionHandler(event);
    }
});

// Delete Session
const deleteSessionModal = document.querySelector('#deleteSessionModal');
const confirmDeleteSessionBtn = deleteSessionModal.querySelector('.confirm-btn');
const deleteSessionHandler = async (event) => {
    // Verifica se já está em estado de loading (evita múltiplas ações)
    let buttonContent;
    if (event.currentTarget.classList.contains("confirm-btn")) {
        buttonContent = event.currentTarget.closest(".buttonContent");
    } else {
        const container = deleteSessionModal.closest(".input-actions");
        buttonContent = container.querySelector(".buttonContent");
    }
    const isLoadingState = buttonContent.classList.contains("loading-state");

    if (isLoadingState) return;

    // Seta estado de loading
    setElementState(buttonContent, "loading");

    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Envia fetch para excluir session
    const sessionId = deleteSessionModal.dataset.itemId;
    const fetchDeleteSession = await fetchManager.deleteSession({ id: sessionId });

    console.log(fetchDeleteSession);

    // Se houver erro durante a  do session
    if (!fetchDeleteSession.ok) {
        notify("error", "Não foi possível excluir sessão.");
        return utils.closeModals();
    }

    // Deleta session no array local de packages
    const sessionPkgIdx = packagesList.userCollection.findIndex(pkg => pkg.sessions.some(sess => sess.id == sessionId));
    const sessionIdx = packagesList.userCollection[sessionPkgIdx].sessions.findIndex(sess => sess.id == sessionId);
    const affectedPkg = packagesList.userCollection[sessionPkgIdx];
    affectedPkg.sessions.splice(sessionIdx, 1);

    // Atualiza stats em cache
    if (affectedPkg.stats) affectedPkg.stats.totalSessions -= 1;

    // Recalcula tier do package (remoção de sessão pode rebaixar de Plus p/ Basic)
    recalculateAllPackageTiers();

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Sessão deletada.");

    // Remove session da tela
    const sessionToDelete = document.querySelector(`.sessions-panel .session-card[data-session-id="${sessionId}"]`);
    sessionToDelete.classList.add("fadeOut");

    sessionToDelete.addEventListener("animationend", () => {
        sessionToDelete.remove();

        // Atualiza icon stack do package card na coleção
        const packageCard = document.querySelector(`.preset-collection .access-grid .access-item[data-package-id="${affectedPkg.id}"]`);
        if (packageCard) {
            const iconStack = packageCard.querySelector(".icon-stack");
            if (iconStack) {
                iconStack.innerHTML = "";
                affectedPkg.sessions.slice(0, 3).forEach(session => {
                    const stackIcon = createElement('div', 'stack-icon');
                    const img = document.createElement('img');
                    img.alt = session.name;
                    img.src = session.icon;
                    stackIcon.appendChild(img);
                    iconStack.appendChild(stackIcon);
                });
            }
        }

        // Re-renderiza completamente o painel de detalhes do pacote afetado
        // (atualiza lista de sessões, stats, badges de tier, etc.)
        renderPackageDetails(affectedPkg);
    }, { once: true });

}

confirmDeleteSessionBtn.addEventListener('click', deleteSessionHandler);

// Back buttons
const backBtns = document.querySelectorAll('.screen-section.secondary .back-btn');
backBtns.forEach(btn => btn.addEventListener('click', (e) => {
    const screensContainer = e.target.closest('.screens-container');
    const screenSection = e.target.closest('.screen-section');

    // Se a screen section for secondary, pega a primary e seta estado de content
    if (screenSection.classList.contains('secondary')) {
        const primaryScreenSection = screensContainer.querySelector('.screen-section.primary');
        setElementState(primaryScreenSection, "content");
    }

    screensContainer.classList.remove('show-next-screen');

    screensContainer.addEventListener('transitionend', () => {
        setElementState(screenSection, "none");
    }, { once: true });
}));

// ============================================================================
// Plus — Free Trial activation (launch program, single-use per user)
// Embedded in the Plus subscribe modal, no separate page.
// ============================================================================
(function plusTrialModule() {
    const plusModal      = document.getElementById('plusSubscribeModal');
    if (!plusModal) return;

    const plusContent    = plusModal.querySelector('.plus-modal-content');
    const successPane    = document.getElementById('plus-modal-success');
    const trialWrap      = document.getElementById('plus-trial-wrap');
    const trialBtn       = document.getElementById('plus-trial-btn');
    const trialError     = document.getElementById('plus-trial-error');
    const successCta     = document.getElementById('plus-success-cta');
    const expiryDateEl   = document.getElementById('plus-success-expiry-date');
    const confettiCanvas = document.getElementById('plusConfetti');

    if (!plusContent || !successPane || !trialBtn) return;

    const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

    function formatExpiry(input) {
        const d = input ? new Date(input) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        if (isNaN(d.getTime())) return '—';
        return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
    }

    // ─── Eligibility: hide trial CTA if user already redeemed or is already plus ──
    function applyEligibility() {
        const user = (typeof currentUserInfo !== 'undefined' && currentUserInfo) || null;
        if (!user) return;
        const alreadyPlus     = user.plan === 'plus';
        const alreadyRedeemed = !!user.plus_trial_redeemed_at;
        if (trialWrap) trialWrap.style.display = (alreadyPlus || alreadyRedeemed) ? 'none' : '';
    }

    // ─── Reset modal back to the offer (called on every open) ───────────────────
    function resetToOffer() {
        successPane.hidden = true;
        plusContent.style.display = '';
        if (trialError) { trialError.hidden = true; trialError.textContent = ''; }
        trialBtn.classList.remove('is-loading');
        trialBtn.disabled = false;
        applyEligibility();
    }

    // ─── Swap to success state ──────────────────────────────────────────────────
    function showSuccess(expiresAt) {
        expiryDateEl.textContent = formatExpiry(expiresAt);
        plusContent.style.display = 'none';
        successPane.hidden = false;
        // Confetti burst on the next paint so the layout has settled
        requestAnimationFrame(() => fireConfetti());
    }

    // ─── Hook into utils.showModal so the modal resets each time it opens ───────
    if (typeof utils !== 'undefined' && typeof utils.showModal === 'function') {
        const _origShowModal = utils.showModal.bind(utils);
        utils.showModal = function (modalName, itemId) {
            if (modalName === 'plusSubscribe') resetToOffer();
            return _origShowModal(modalName, itemId);
        };
    }

    // ─── Activation handler ─────────────────────────────────────────────────────
    async function activateTrial() {
        if (trialBtn.disabled) return;
        if (trialError) { trialError.hidden = true; trialError.textContent = ''; }
        trialBtn.classList.add('is-loading');
        trialBtn.disabled = true;

        try {
            const response = await fetchManager.redeemPlusTrial();
            // Brief beat so the transition feels deliberate
            await new Promise(r => setTimeout(r, 450));

            if (response.ok && response.result?.data) {
                // Update local cache so the rest of the app reflects Plus immediately
                if (typeof currentUserInfo !== 'undefined' && currentUserInfo) {
                    currentUserInfo.plan = 'plus';
                    currentUserInfo.planExpiresAt = response.result.data.plan_expires_at;
                    currentUserInfo.plus_trial_redeemed_at = new Date().toISOString();
                }
                showSuccess(response.result.data.plan_expires_at);
                return;
            }

            // 409 → already plus or already redeemed → still show success state
            if (response.status === 409) {
                const exp = (typeof currentUserInfo !== 'undefined' && currentUserInfo?.planExpiresAt) || null;
                showSuccess(exp);
                return;
            }

            const msg = response.result?.errorMessage || 'Não foi possível ativar agora. Tente novamente em instantes.';
            if (trialError) { trialError.textContent = msg; trialError.hidden = false; }
            trialBtn.classList.remove('is-loading');
            trialBtn.disabled = false;
        } catch (err) {
            console.error('[PlusTrial] activation error:', err);
            if (trialError) {
                trialError.textContent = 'Erro inesperado. Tente novamente em instantes.';
                trialError.hidden = false;
            }
            trialBtn.classList.remove('is-loading');
            trialBtn.disabled = false;
        }
    }

    trialBtn.addEventListener('click', activateTrial);

    if (successCta) {
        successCta.addEventListener('click', () => {
            utils.closeModals?.();
            // Reload so plan-gated UI (sidebar card, hidden buttons, etc) re-renders
            window.location.reload();
        });
    }

    // ─── Confetti (scoped to the modal canvas) ──────────────────────────────────
    let _ctx = null;
    let _dpr = 1;
    let _particles = [];
    let _raf = null;

    function sizeCanvas() {
        if (!confettiCanvas) return;
        _dpr = Math.max(1, window.devicePixelRatio || 1);
        const rect = confettiCanvas.getBoundingClientRect();
        confettiCanvas.width  = rect.width  * _dpr;
        confettiCanvas.height = rect.height * _dpr;
        _ctx = confettiCanvas.getContext('2d');
        _ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0);
    }

    const COLORS = ['#60a5fa', '#3b82f6', '#93c5fd', '#fbbf24', '#fcd34d', '#16a34a', '#ffffff'];
    const SHAPES = ['rect', 'circle', 'strip'];

    function spawnBurst() {
        if (!confettiCanvas) return;
        sizeCanvas();
        const W = confettiCanvas.clientWidth;
        const H = confettiCanvas.clientHeight;
        const cannons = [
            { x: 0,     y: H * 0.92, angle: -Math.PI / 3,        spread: Math.PI / 5,   count: 50, power: 13 },
            { x: W,     y: H * 0.92, angle: -2 * Math.PI / 3,    spread: Math.PI / 5,   count: 50, power: 13 },
            { x: W / 2, y: H * 0.55, angle: -Math.PI / 2,        spread: Math.PI / 1.4, count: 80, power: 7 },
        ];

        cannons.forEach(c => {
            for (let k = 0; k < c.count; k++) {
                const ang = c.angle + (Math.random() - 0.5) * c.spread;
                const v = c.power * (0.55 + Math.random() * 0.7);
                _particles.push({
                    x: c.x, y: c.y,
                    vx: Math.cos(ang) * v,
                    vy: Math.sin(ang) * v,
                    g: 0.22 + Math.random() * 0.08,
                    drag: 0.992,
                    rot: Math.random() * Math.PI * 2,
                    vRot: (Math.random() - 0.5) * 0.32,
                    size: 5 + Math.random() * 6,
                    color: COLORS[(Math.random() * COLORS.length) | 0],
                    shape: SHAPES[(Math.random() * SHAPES.length) | 0],
                    life: 0,
                    maxLife: 160 + Math.random() * 80,
                    wobble: Math.random() * Math.PI * 2,
                    wobbleSpeed: 0.05 + Math.random() * 0.05,
                });
            }
        });

        if (!_raf) _raf = requestAnimationFrame(loop);
    }

    function loop() {
        if (!_ctx || !confettiCanvas) { _raf = null; return; }
        const W = confettiCanvas.clientWidth;
        const H = confettiCanvas.clientHeight;
        _ctx.clearRect(0, 0, W, H);

        for (let i = _particles.length - 1; i >= 0; i--) {
            const p = _particles[i];
            p.life++;
            p.vy += p.g;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.wobble += p.wobbleSpeed;
            p.x += p.vx + Math.sin(p.wobble) * 0.6;
            p.y += p.vy;
            p.rot += p.vRot;

            const fadeStart = p.maxLife * 0.7;
            const alpha = p.life > fadeStart
                ? Math.max(0, 1 - (p.life - fadeStart) / (p.maxLife - fadeStart))
                : 1;

            _ctx.save();
            _ctx.globalAlpha = alpha;
            _ctx.translate(p.x, p.y);
            _ctx.rotate(p.rot);
            _ctx.fillStyle = p.color;
            if (p.shape === 'circle') {
                _ctx.beginPath();
                _ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
                _ctx.fill();
            } else if (p.shape === 'strip') {
                _ctx.fillRect(-p.size * 0.7, -p.size * 0.15, p.size * 1.4, p.size * 0.3);
            } else {
                _ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size * 0.6);
            }
            _ctx.restore();

            if (p.life >= p.maxLife || p.y > H + 60) _particles.splice(i, 1);
        }

        if (_particles.length > 0) {
            _raf = requestAnimationFrame(loop);
        } else {
            _raf = null;
            _ctx.clearRect(0, 0, W, H);
        }
    }

    function fireConfetti() {
        spawnBurst();
        setTimeout(spawnBurst, 350);
        setTimeout(spawnBurst, 800);
    }

    window.addEventListener('resize', () => { if (!successPane.hidden) sizeCanvas(); });
})();