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
            statusText.textContent = 'Acesso público ativo';
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
    { selector: '.add-session-btn', event: 'click', handler: handleAddSession },
    { selector: '.update-session-btn', event: 'click', handler: handleUpdateSession },
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
    const removedUser = packageData.users[userIdx];
    packageData.users.splice(userIdx, 1);

    // Atualiza stats do package em cache
    packageData.stats.totalUsers -= 1;

    // Contador de pessoas: o criador não conta; pacote suspenso já não contava.
    if (removedUser && !removedUser.isCreator && !packageData.suspended && currentUserInfo) {
        currentUserInfo.peopleUsed = Math.max(0, Number(currentUserInfo.peopleUsed || 0) - 1);
        updatePeopleCounter();
    }

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

    // Exige extensão instalada E apontando para esta conta (ver extensionState.js).
    if (!await extensionState.ensure()) return;

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

// Prepara o modal compartilhado (mesma casca do "Adicionar sessão") para o modo
// atualizar e devolve os elementos que os dois fluxos usam.
function setupUpdateModal(packageData) {
    const modal = document.getElementById('addSessionModal');

    modal.dataset.mode = 'update';
    modal.removeAttribute('data-result');

    const pkgNameEl = modal.querySelector('.as-pkg-name');
    const subtitleEl = modal.querySelector('.as-head-subtitle');
    const pkgIconEl = modal.querySelector('.as-pkg-icon');

    if (pkgNameEl) pkgNameEl.textContent = packageData.name || '';
    if (subtitleEl) subtitleEl.textContent = 'Recapture as sessões deste pacote';

    if (pkgIconEl) {
        pkgIconEl.innerHTML = '';
        if (packageData.icon) {
            pkgIconEl.textContent = packageData.icon;
        } else {
            pkgIconEl.innerHTML = `<span class="as-pkg-icon--fb">${(packageData.name || '?').charAt(0).toUpperCase()}</span>`;
        }
    }

    // Reset do progresso (o captureFlow reescreve, mas o modal pode reabrir sujo).
    modal.querySelector('.as-list').innerHTML = '';
    modal.querySelector('.as-bar-fill').style.width = '0%';
    modal.querySelector('.as-close').disabled = true;

    return modal;
}

// Nome legível de uma sessão (cai no host quando não tem nome).
function sessionLabel(session) {
    if (session.name) return session.name;
    try { return new URL(session.url).hostname.replace(/^www\./, ''); } catch { return session.url; }
}

// O ref casa progresso com linha. Para sessões é o id — nunca a URL: duas contas do
// mesmo serviço no mesmo pacote compartilham a URL e se cruzariam.
function sessionTarget(session) {
    return {
        ref: String(session.id),
        id: session.id,
        name: sessionLabel(session),
        url: session.url,
        icon: session.icon,
    };
}

// Atualiza o card da sessão na tela depois de uma recaptura bem-sucedida.
function refreshSessionCard(sessionId) {
    const card = document.querySelector(
        `.session-card[data-session-id="${sessionId}"], .list-item.session[data-session-id="${sessionId}"]`
    );
    if (!card) return;
    card.classList.add('fadeInFromTop');
    card.addEventListener('animationend', () => card.classList.remove('fadeInFromTop'), { once: true });
}

// "Atualizar" no menu ⋯ do PACOTE: abre a mesma casca do adicionar, mas listando as
// sessões do próprio pacote, todas marcadas.
async function handleUpdatePackage(e) {
    e.stopPropagation();

    // Fecha o menu de opções
    document.querySelectorAll('.package-options:not(.hidden)').forEach(o => o.classList.add('hidden'));

    // Exige a extensão instalada e sincronizada (ela é quem abre/captura/fecha as abas)
    if (!await extensionState.ensure()) return;

    const packageEl = this.closest('.access-item');
    const packageId = packageEl.dataset.packageId;
    const packageData = packagesList.userCollection.find(pkg => pkg.id == packageId);
    if (!packageData) return;

    const sessions = (packageData.sessions || []).filter(s => s && s.id && s.url);

    const modal = setupUpdateModal(packageData);
    const listEl = modal.querySelector('.us-list');
    const countEl = modal.querySelector('.us-count');
    const toggleAllBtn = modal.querySelector('.us-toggle-all');
    const confirmBtn = modal.querySelector('.as-confirm');
    const cancelBtn = modal.querySelector('.as-cancel');
    const footerStatusText = modal.querySelector('.as-footer-status-text');
    const footerStatusWrapper = modal.querySelector('.as-footer-status-wrapper');

    modal.dataset.phase = 'select';
    confirmBtn.textContent = 'Atualizar';

    // Todas selecionadas por padrão — atualizar o pacote inteiro é o caso comum.
    const selected = new Set(sessions.map(s => String(s.id)));

    function syncFooter() {
        const n = selected.size;
        confirmBtn.disabled = n === 0;
        countEl.textContent = `${n} de ${sessions.length} selecionada${sessions.length === 1 ? '' : 's'}`;
        toggleAllBtn.textContent = n === sessions.length ? 'Desmarcar todas' : 'Selecionar todas';
        footerStatusWrapper.classList.toggle('is-active', n > 0);
        footerStatusText.textContent = n === 0
            ? 'Nenhuma sessão selecionada'
            : `${n} ${n === 1 ? 'sessão será atualizada' : 'sessões serão atualizadas'}`;
    }

    function renderList() {
        listEl.innerHTML = '';

        sessions.forEach(session => {
            const ref = String(session.id);
            const item = document.createElement('li');
            item.className = 'us-item' + (selected.has(ref) ? ' is-selected' : '');
            item.dataset.ref = ref;

            const icon = document.createElement('img');
            icon.className = 'us-item-icon';
            icon.alt = '';
            AuthPackFavicon.apply(icon, {
                icon: session.icon, url: session.url,
                onFinalError: () => {
                    const fb = document.createElement('span');
                    fb.className = 'us-item-icon us-item-icon--fb';
                    fb.textContent = sessionLabel(session).trim().charAt(0).toUpperCase();
                    icon.replaceWith(fb);
                }
            });

            const info = document.createElement('div');
            info.className = 'us-item-info';

            const nameEl = document.createElement('span');
            nameEl.className = 'us-item-name';
            nameEl.textContent = sessionLabel(session);

            const hostEl = document.createElement('span');
            hostEl.className = 'us-item-host';
            try { hostEl.textContent = new URL(session.url).hostname.replace(/^www\./, ''); }
            catch { hostEl.textContent = session.url; }

            info.append(nameEl, hostEl);

            const check = document.createElement('span');
            check.className = 'us-item-check';
            check.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

            item.append(icon, info, check);
            item.onclick = () => {
                if (selected.has(ref)) selected.delete(ref);
                else selected.add(ref);
                item.classList.toggle('is-selected', selected.has(ref));
                syncFooter();
            };

            listEl.appendChild(item);
        });
    }

    renderList();
    syncFooter();

    toggleAllBtn.onclick = () => {
        if (selected.size === sessions.length) selected.clear();
        else sessions.forEach(s => selected.add(String(s.id)));
        renderList();
        syncFooter();
    };

    confirmBtn.onclick = () => {
        const targets = sessions
            .filter(s => selected.has(String(s.id)))
            .map(sessionTarget);
        if (targets.length === 0) return;

        captureFlow.run({
            modal,
            packageId,
            mode: 'update',
            targets,
            onItemOk: (target) => refreshSessionCard(target.id),
        });
    };

    cancelBtn.onclick = () => utils.closeModals();

    utils.showModal('addSession', packageId);
}

// "Atualizar" no menu ⋯ de UMA sessão: sem etapa de seleção — abre direto no progresso.
async function handleUpdateSession(e) {
    e.stopPropagation();

    // Fecha o menu de opções
    document.querySelectorAll('.session-options:not(.hidden)').forEach(o => o.classList.add('hidden'));

    if (!await extensionState.ensure()) return;

    const packageEl = this.closest('#package-details');
    const packageId = packageEl?.dataset.packageId;
    const packageData = packagesList.userCollection.find(pkg => pkg.id == packageId);
    if (!packageData) return;

    const sessionEl = this.closest('.session-card') || this.closest('.list-item.session');
    const sessionId = sessionEl?.dataset.sessionId;
    const sessionData = (packageData.sessions || []).find(s => s.id == sessionId);
    if (!sessionData) return;

    const modal = setupUpdateModal(packageData);
    modal.querySelector('.as-head-subtitle').textContent = 'Recapturando uma sessão';
    // Sem etapa de seleção: já entra no progresso (evita piscar o corpo de seleção).
    modal.dataset.phase = 'progress';

    utils.showModal('addSession', packageId);

    captureFlow.run({
        modal,
        packageId,
        mode: 'update',
        targets: [sessionTarget(sessionData)],
        onItemOk: (target) => refreshSessionCard(target.id),
    });
}

// Catálogo de serviços comuns em times internos. `url` = superfície onde o dono já está
// naturalmente logado; a captura acontece nessa URL. O usuário também pode colar qualquer URL.
// Categorias usadas nos chips de filtro do modal "Adicionar sessão".
const ADD_SESSION_CATEGORIES = [
    { id: 'all', label: 'Todos' },
    { id: 'ia', label: 'IA' },
    { id: 'stream', label: 'Streaming' },
    { id: 'work', label: 'Trabalho' },
    { id: 'social', label: 'Social' },
];

// Cada serviço tem uma categoria (`cat`) para o filtro. Os ícones são reais —
// carregados via AuthPackFavicon a partir da URL — não são mockups.
const ADD_SESSION_CATALOG = [
    // IA
    { name: 'ChatGPT', url: 'https://chatgpt.com', cat: 'ia' },
    { name: 'Claude', url: 'https://claude.ai', cat: 'ia' },
    { name: 'Gemini', url: 'https://gemini.google.com', cat: 'ia' },
    { name: 'Perplexity', url: 'https://www.perplexity.ai', cat: 'ia' },
    { name: 'Midjourney', url: 'https://www.midjourney.com', cat: 'ia' },
    // Streaming
    { name: 'Netflix', url: 'https://www.netflix.com', cat: 'stream' },
    { name: 'Spotify', url: 'https://open.spotify.com', cat: 'stream' },
    { name: 'Disney+', url: 'https://www.disneyplus.com', cat: 'stream' },
    { name: 'YouTube', url: 'https://www.youtube.com', cat: 'stream' },
    { name: 'Prime Video', url: 'https://www.primevideo.com', cat: 'stream' },
    // Trabalho
    { name: 'Slack', url: 'https://app.slack.com/client', cat: 'work' },
    { name: 'GitHub', url: 'https://github.com', cat: 'work' },
    { name: 'Notion', url: 'https://www.notion.so', cat: 'work' },
    { name: 'Canva', url: 'https://www.canva.com', cat: 'work' },
    { name: 'Figma', url: 'https://www.figma.com/files', cat: 'work' },
    { name: 'Google', url: 'https://drive.google.com', cat: 'work' },
    { name: 'Trello', url: 'https://trello.com', cat: 'work' },
    { name: 'Linear', url: 'https://linear.app', cat: 'work' },
    { name: 'Jira', url: 'https://www.atlassian.com', cat: 'work' },
    { name: 'Asana', url: 'https://app.asana.com', cat: 'work' },
    { name: 'Miro', url: 'https://miro.com/app/dashboard', cat: 'work' },
    { name: 'ClickUp', url: 'https://app.clickup.com', cat: 'work' },
    { name: 'Adobe CC', url: 'https://account.adobe.com', cat: 'work' },
    // Social
    { name: 'LinkedIn', url: 'https://www.linkedin.com', cat: 'social' },
    { name: 'X', url: 'https://x.com', cat: 'social' },
    { name: 'Instagram', url: 'https://www.instagram.com', cat: 'social' },
    { name: 'Facebook', url: 'https://www.facebook.com', cat: 'social' },
];

// Normaliza uma entrada de URL/busca em { name, url } ou null se inválida.
function normalizeServiceInput(raw) {
    const value = (raw || '').trim();
    if (!value) return null;
    let urlStr = value;
    if (!/^https?:\/\//i.test(urlStr)) urlStr = 'https://' + urlStr;
    try {
        const u = new URL(urlStr);
        if (!u.hostname.includes('.')) return null;
        const host = u.hostname.replace(/^www\./, '');
        const name = host.split('.')[0];
        return { name: name.charAt(0).toUpperCase() + name.slice(1), url: u.href };
    } catch {
        return null;
    }
}

async function handleAddSession(e) {
    e.stopPropagation();

    // Exige a extensão instalada e sincronizada (ela é quem abre/captura/fecha as abas).
    if (!await extensionState.ensure()) return;

    const packageId = this.dataset.packageId;
    const packageData = packagesList.userCollection.find(pkg => pkg.id == packageId);
    // Grid exato onde mora o card clicado — evita pegar o .preset-collection errado
    // (existem dois: a lista de pacotes e o detalhe).
    const originGrid = this.closest('.sessions-grid');
    if (!packageData) return;

    const modal = document.getElementById('addSessionModal');
    const pkgNameEl = modal.querySelector('.as-pkg-name');
    const searchEl = modal.querySelector('.as-search');
    const searchDropdown = modal.querySelector('.as-search-dropdown');
    const dropdownList = modal.querySelector('.as-dropdown-list');
    const selectedSection = modal.querySelector('.as-selected-section');
    const viewPopular = modal.querySelector('.as-view-popular');
    const popularGrid = modal.querySelector('.as-popular-grid');
    const viewAllBtn = modal.querySelector('.as-view-all-btn');
    const viewAllSections = modal.querySelector('.as-view-all-sections');
    const confirmBtn = modal.querySelector('.as-confirm');
    const cancelBtn = modal.querySelector('.as-cancel');
    const closeBtn = modal.querySelector('.as-close');
    const statusEl = modal.querySelector('.as-status');
    const countEl = modal.querySelector('.as-count');
    const fillEl = modal.querySelector('.as-bar-fill');
    const listEl = modal.querySelector('.as-list');
    const footerStatusIcon = modal.querySelector('.as-footer-status-icon');
    const footerStatusText = modal.querySelector('.as-footer-status-text');
    const footerStatusWrapper = modal.querySelector('.as-footer-status-wrapper');

    // Estado local do modal
    const selected = new Map();               // key(url) -> { name, url }
    const catalog = ADD_SESSION_CATALOG.map(s => ({ ...s }));
    const keyOf = (url) => { try { return new URL(url).href; } catch { return url; } };

    // Reset visual (o modal é compartilhado com o fluxo de atualizar)
    modal.dataset.mode = 'create';
    modal.dataset.phase = 'select';
    confirmBtn.textContent = 'Adicionar';
    if (modal.querySelector('.as-head-subtitle')) {
        modal.querySelector('.as-head-subtitle').textContent = 'Adicione serviços para compartilhar';
    }
    if (pkgNameEl) pkgNameEl.textContent = packageData.name || '';
    
    const pkgIconEl = modal.querySelector('.as-pkg-icon');
    if (pkgIconEl) {
        pkgIconEl.innerHTML = '';
        if (packageData.icon) {
            pkgIconEl.textContent = packageData.icon; // Pode ser emoji
        } else {
            pkgIconEl.innerHTML = `<span class="as-pkg-icon--fb">${(packageData.name || '?').charAt(0).toUpperCase()}</span>`;
        }
    }

    searchEl.value = '';
    searchDropdown.classList.add('hidden');
    dropdownList.innerHTML = '';
    selectedSection.innerHTML = '';
    selectedSection.classList.add('hidden');
    viewPopular.classList.remove('hidden');
    viewAllSections.classList.add('hidden');
    listEl.innerHTML = '';
    fillEl.style.width = '0%';
    countEl.textContent = '0/0';
    statusEl.textContent = 'Capturando sessões…';
    modal.removeAttribute('data-result');
    confirmBtn.disabled = true;
    closeBtn.disabled = true;

    function syncFooter() {
        const n = selected.size;
        confirmBtn.disabled = n === 0;
        
        if (modal.dataset.phase !== 'progress') {
            if (n === 0) {
                footerStatusWrapper.classList.remove('is-active');
                footerStatusIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader"><line x1="12" x2="12" y1="2" y2="6"/><line x1="12" x2="12" y1="18" y2="22"/><line x1="4.93" x2="7.76" y1="4.93" y2="7.76"/><line x1="16.24" x2="19.07" y1="16.24" y2="19.07"/><line x1="2" x2="6" y1="12" y2="12"/><line x1="18" x2="22" y1="12" y2="12"/><line x1="4.93" x2="7.76" y1="19.07" y2="16.24"/><line x1="16.24" x2="19.07" y1="7.76" y2="4.93"/></svg>`;
                footerStatusText.textContent = 'Nenhum serviço adicionado';
            } else {
                footerStatusWrapper.classList.add('is-active');
                footerStatusIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
                footerStatusText.textContent = `${n} ${n === 1 ? 'serviço adicionado' : 'serviços adicionados'}`;
            }
        }
    }

    function toggleService(service) {
        const key = keyOf(service.url);
        if (!selected.has(key)) {
            selected.set(key, { name: service.name, url: service.url });
        }
        renderSelectedSection();
        syncFooter();
        const cards = modal.querySelectorAll(`.as-service[data-key="${key}"], .as-popular-card[data-key="${key}"]`);
        cards.forEach(c => c.classList.add('is-selected'));
        if (!searchDropdown.classList.contains('hidden')) {
            renderSearchDropdown();
        }
    }

    function removeService(key) {
        selected.delete(key);
        renderSelectedSection();
        syncFooter();
        const cards = modal.querySelectorAll(`.as-service[data-key="${key}"], .as-popular-card[data-key="${key}"]`);
        cards.forEach(c => c.classList.remove('is-selected'));
        if (!searchDropdown.classList.contains('hidden')) {
            renderSearchDropdown();
        }
    }

    function renderSelectedSection() {
        if (selected.size === 0) {
            selectedSection.classList.add('hidden');
            selectedSection.innerHTML = '';
            return;
        }
        selectedSection.classList.remove('hidden');
        selectedSection.innerHTML = '<div class="as-selected-grid"></div>';
        const grid = selectedSection.querySelector('.as-selected-grid');
        
        selected.forEach((service, key) => {
            const chip = document.createElement('div');
            chip.className = 'as-selected-chip';
            
            const icon = document.createElement('img');
            icon.className = 'as-selected-chip-icon';
            icon.alt = '';
            AuthPackFavicon.apply(icon, {
                url: service.url,
                onFinalError: () => {
                    const fb = document.createElement('span');
                    fb.className = 'as-selected-chip-icon as-selected-chip-icon--fb';
                    fb.textContent = (service.name || '?').trim().charAt(0).toUpperCase();
                    icon.replaceWith(fb);
                }
            });

            const nameEl = document.createElement('span');
            nameEl.className = 'as-selected-chip-name';
            nameEl.textContent = service.name;

            const removeBtn = document.createElement('span');
            removeBtn.className = 'as-selected-chip-remove';
            removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
            removeBtn.onclick = () => removeService(key);

            chip.append(icon, nameEl, removeBtn);
            grid.appendChild(chip);
        });
    }

    const popularNames = ['ChatGPT', 'Notion', 'Slack', 'Canva'];
    function renderPopularGrid() {
        popularGrid.innerHTML = '';
        popularNames.forEach(name => {
            const service = catalog.find(s => s.name === name);
            if (!service) return;
            const key = keyOf(service.url);
            
            const card = document.createElement('div');
            card.className = 'as-popular-card' + (selected.has(key) ? ' is-selected' : '');
            card.dataset.key = key;

            const icon = document.createElement('img');
            icon.className = 'as-service-icon';
            AuthPackFavicon.apply(icon, { url: service.url });

            const label = document.createElement('span');
            label.className = 'as-service-name';
            label.textContent = service.name;

            card.append(icon, label);
            card.onclick = () => {
                if (selected.has(key)) removeService(key);
                else toggleService(service);
            };
            popularGrid.appendChild(card);
        });
    }

    function renderAllSections() {
        viewAllSections.innerHTML = '';
        ADD_SESSION_CATEGORIES.forEach(cat => {
            if (cat.id === 'all') return;
            const catServices = catalog.filter(s => s.cat === cat.id);
            if (catServices.length === 0) return;

            const label = document.createElement('p');
            label.className = 'as-section-label';
            label.textContent = cat.label;
            
            const grid = document.createElement('div');
            grid.className = 'as-services custom-scrollbar';
            
            catServices.forEach(service => {
                const key = keyOf(service.url);
                const chip = document.createElement('button');
                chip.className = 'as-service' + (selected.has(key) ? ' is-selected' : '');
                chip.dataset.key = key;
                
                const icon = document.createElement('img');
                icon.className = 'as-service-icon';
                AuthPackFavicon.apply(icon, { url: service.url });
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'as-service-name';
                nameSpan.textContent = service.name;

                const check = document.createElement('span');
                check.className = 'as-service-check';
                check.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>';

                chip.append(icon, nameSpan, check);
                chip.onclick = () => {
                    if (selected.has(key)) removeService(key);
                    else toggleService(service);
                };
                grid.appendChild(chip);
            });

            viewAllSections.append(label, grid);
        });
    }

    viewAllBtn.onclick = () => {
        viewPopular.classList.add('hidden');
        viewAllSections.classList.remove('hidden');
        renderAllSections();
    };

    function renderSearchDropdown() {
        const q = searchEl.value.trim().toLowerCase();
        if (!q) {
            searchDropdown.classList.add('hidden');
            return;
        }

        dropdownList.innerHTML = '';
        const svc = normalizeServiceInput(searchEl.value);
        let items = [];

        if (svc && !catalog.find(c => keyOf(c.url) === keyOf(svc.url))) {
            items.push(svc);
        } else {
            items = catalog.filter(s => s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q));
        }

        if (items.length === 0) {
            dropdownList.innerHTML = '<li style="padding:12px;text-align:center;color:var(--ap-text-secondary);font-size:13px;">Nenhum serviço encontrado.</li>';
        } else {
            items.forEach(service => {
                const key = keyOf(service.url);
                const isSelected = selected.has(key);
                
                const li = document.createElement('li');
                li.className = 'as-dropdown-item' + (isSelected ? ' is-selected' : '');

                const icon = document.createElement('img');
                icon.className = 'as-dropdown-icon';
                AuthPackFavicon.apply(icon, {
                    url: service.url,
                    onFinalError: () => {
                        const fb = document.createElement('span');
                        fb.className = 'as-dropdown-icon as-dropdown-icon--fb';
                        fb.textContent = (service.name || '?').trim().charAt(0).toUpperCase();
                        icon.replaceWith(fb);
                    }
                });

                const nameEl = document.createElement('span');
                nameEl.className = 'as-dropdown-name';
                nameEl.textContent = service.name;

                const btn = document.createElement('button');
                btn.className = 'as-dropdown-btn';
                btn.type = 'button';
                btn.textContent = isSelected ? 'Adicionado' : 'Adicionar';
                
                li.append(icon, nameEl, btn);
                li.onclick = (e) => {
                    e.preventDefault();
                    if (!isSelected) {
                        toggleService(service);
                        searchEl.value = '';
                        searchDropdown.classList.add('hidden');
                        searchEl.focus();
                    }
                };
                dropdownList.appendChild(li);
            });
        }
        searchDropdown.classList.remove('hidden');
    }

    searchEl.oninput = renderSearchDropdown;
    document.addEventListener('click', (e) => {
        if (!searchDropdown.contains(e.target) && e.target !== searchEl) {
            searchDropdown.classList.add('hidden');
        }
    });
    searchEl.onfocus = () => {
        if (searchEl.value.trim()) renderSearchDropdown();
    };

    renderPopularGrid();
    syncFooter();

    // Insere o card de uma sessão recém-criada logo após o card "Adicionar sessão".
    function renderNewSessionCard(session) {
        const grid = originGrid || document.querySelector('.preset-collection .sessions-panel .sessions-grid');
        if (!grid) return;
        const card = createSessionElement(session, true, packageData);
        card.classList.add('fadeInFromTop');
        const addCard = grid.querySelector('.add-session-card');
        if (addCard && addCard.nextSibling) grid.insertBefore(card, addCard.nextSibling);
        else grid.appendChild(card);
        card.addEventListener('animationend', () => card.classList.remove('fadeInFromTop'), { once: true });
    }

    // A partir daqui é o motor compartilhado com "Atualizar" (captureFlow.js): mesma
    // lista, mesmas mini bars, mesmo retry. Só o modo muda.
    function startCapture() {
        const targets = Array.from(selected.values()).map(s => ({
            ref: keyOf(s.url),
            name: s.name,
            url: s.url,
        }));
        if (targets.length === 0) return;

        captureFlow.run({
            modal,
            packageId,
            mode: 'create',
            targets,
            onItemOk: (target, session) => {
                if (!session) return;
                packageData.sessions.push(session);
                renderNewSessionCard(session);
            },
        });
    }

    confirmBtn.onclick = startCapture;
    cancelBtn.onclick = () => utils.closeModals();

    utils.showModal('addSession', packageId);
    modal.addEventListener('transitionend', function focusOnce() {
        modal.removeEventListener('transitionend', focusOnce);
        searchEl.focus();
    });
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
    openSharePackageModal(packageEl.dataset.packageId);
}

// Abre o modal de compartilhamento para um pacote da coleção (por id). Usado
// tanto pelo botão de opções da sidebar quanto pelo botão "Compartilhar" da top bar.
function openSharePackageModal(packageId) {
    if (!packageId) return;

    const sharePackageModal = document.querySelector("#sharePackageModal");
    const nameEl = sharePackageModal.querySelector(".share-pkg-name");
    const peopleCountEl = sharePackageModal.querySelector(".share-people-count");
    const generalLinkUrl = sharePackageModal.querySelector("#generalLinkUrl");

    const packageData = packagesList.userCollection.find(pkg => pkg.id == packageId);
    const isOpen = packageData.open !== 0;

    nameEl.textContent = packageData.name || '';
    nameEl.title = packageData.name || '';

    // Contagem de pessoas com acesso (membros do pacote).
    const peopleCount = Array.isArray(packageData.users) ? packageData.users.length : 0;
    peopleCountEl.textContent = peopleCount === 0
        ? 'Nenhuma pessoa com acesso'
        : `${peopleCount} ${peopleCount === 1 ? 'pessoa com acesso' : 'pessoas com acesso'}`;

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
        if (typeof annotatePlansModal === 'function') annotatePlansModal();
        utils.showModal("plusSubscribe");
    });
});

// Plan CTA (redirect to checkout page). Um botão por plano assinável
// (data-plan="plus" | "business"). Enterprise é um link de contato (sem data-plan).
const planChooseBtns = document.querySelectorAll('.plan-choose-btn[data-plan]');
planChooseBtns.forEach(planBtn => {
    planBtn.addEventListener('click', async () => {
        if (planBtn.disabled) return;

        const plan = planBtn.dataset.plan;
        planBtn.disabled = true;
        const originalText = planBtn.textContent;
        planBtn.textContent = 'Redirecionando...';

        try {
            const res = await fetchManager.createCheckoutOrder({ origin: 'platform', plan });

            if (!res.ok) {
                const errMsg = res.result?.error === 'ALREADY_SUBSCRIBED_TO_THIS_PLAN'
                    ? 'Você já está neste plano.'
                    : res.result?.error || 'Erro ao iniciar checkout.';
                alert(errMsg);
                planBtn.disabled = false;
                planBtn.textContent = originalText;
                return;
            }

            const orderId = res.result?.id;
            if (!orderId) {
                alert('Erro ao criar pedido. Tente novamente.');
                planBtn.disabled = false;
                planBtn.textContent = originalText;
                return;
            }

            window.location.href = `/pages/checkout/?orderId=${orderId}`;
        } catch (err) {
            console.error('Plan checkout redirect error:', err);
            alert('Erro inesperado. Tente novamente.');
            planBtn.disabled = false;
            planBtn.textContent = originalText;
        }
    });
});

const cancelBtns = document.querySelectorAll(".cancel-btn");
cancelBtns.forEach(item => item.addEventListener("click", event => {
    utils.closeModals();
}));

// Abre o modal Plus automaticamente quando vindo do upsell (ex.: extensão -> ?upgrade=plus)
(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgrade") === "plus") {
        if (typeof annotatePlansModal === 'function') annotatePlansModal();
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
        // Pacotes são ilimitados — sem gate de plano.
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

// Modelos prontos do onboarding: abrem o modal de criação já com o nome preenchido.
document.querySelectorAll('.ob-tpl-preset').forEach(tplBtn => {
    tplBtn.addEventListener('click', () => {
        // Pacotes são ilimitados — sem gate de plano.
        utils.showModal("createPackage");
        createPackageInput.value = (tplBtn.dataset.tplName || "").slice(0, 20);

        createPackageModal.addEventListener('transitionend', () => {
            createPackageInput.focus();
            const len = createPackageInput.value.length;
            createPackageInput.setSelectionRange(len, len);
        }, { once: true });
    });
});

// "Ver como funciona" abre o guia desde o começo (Seção 1 · Criar pacote).
document.querySelector('.ob-how-btn')?.addEventListener('click', () => {
    if (window.AuthPackOnboarding) AuthPackOnboarding.open({ startSection: 'create' });
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

    // É o primeiro pacote do usuário? (verificado antes de inserir no array local)
    const isFirstPackage = packagesList.userCollection.length === 0;

    // Se não tiver packages, seta estado de content
    if (isFirstPackage) {
        setElementState(document.querySelector("#packages-list"), "collection");
    }

    // Adiciona novo package no array local de packages
    const packageData = fetchCreatePackage.result.data;
    packagesList.userCollection.push(packageData);

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Pacote criado.");

    // Adiciona novo package na tela
    const createdPackageEl = createPackageElement(packageData, false);
    createdPackageEl.classList.add("fadeInFromRight");

    const packagesGrid = document.querySelector("#packages-list .preset-collection .access-grid");
    packagesGrid.appendChild(createdPackageEl);

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

    // Primeiro pacote criado → abre o guia direto na Seção 2 (adicionar sessões),
    // pulando a de criar pacote, já que ele acabou de criar. Uma única vez.
    // Pequeno atraso para a animação do card e o scroll assentarem antes do overlay.
    if (isFirstPackage && window.AuthPackOnboarding && !AuthPackOnboarding.isSeen()) {
        setTimeout(() => AuthPackOnboarding.open({ startSection: 'sessions' }), 650);
    }
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
    const removedPkg = packagesList.userCollection[packageIdx];
    packagesList.userCollection.splice(packageIdx, 1);

    // Contador de pessoas: desconta os membros externos do pacote deletado
    // (criador não conta; pacote suspenso já não contava).
    if (removedPkg && !removedPkg.suspended && currentUserInfo) {
        const removedPeople = (removedPkg.users || []).filter(u => !u.isCreator).length;
        if (removedPeople > 0) {
            currentUserInfo.peopleUsed = Math.max(0, Number(currentUserInfo.peopleUsed || 0) - removedPeople);
            updatePeopleCounter();
        }
    }

    // fecha modal
    utils.closeModals();

    // Notifica ação
    notify("success", "Pacote deletado.");

    // Remove package da tela
    const packageToDelete = document.querySelector(`#packages-list .preset-collection .access-grid .access-item[data-package-id="${packageId}"]`);
    const wasSelected = packageToDelete.classList.contains("selected");
    packageToDelete.classList.add("fadeOut");

    packageToDelete.addEventListener("animationend", () => {
        packageToDelete.remove();

        // Sem mais pacotes: mostra o empty state da coleção.
        if (packagesList.userCollection.length === 0) {
            setElementState(document.querySelector("#packages-list"), "empty-collection");
            return;
        }

        // Sempre mantém um pacote selecionado: se o removido estava selecionado,
        // seleciona o vizinho — o anterior da lista (ou o novo primeiro, se era o topo).
        if (wasSelected) {
            const neighborIdx = packageIdx > 0 ? packageIdx - 1 : 0;
            const neighborPkg = packagesList.userCollection[neighborIdx];
            if (neighborPkg) selectPackage(neighborPkg.id, true);
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
    const wasSelected = packageToDelete.classList.contains("selected");
    packageToDelete.classList.add("fadeOut");

    packageToDelete.addEventListener("animationend", () => {
        packageToDelete.remove();

        // Sem mais acessos: mostra o empty state de acessos.
        if (packagesList.userAccess.length === 0) {
            setElementState(document.querySelector("#packages-list"), "empty-access");
            return;
        }

        // Sempre mantém um pacote selecionado: se o removido estava selecionado,
        // seleciona o vizinho — o anterior da lista (ou o novo primeiro, se era o topo).
        if (wasSelected) {
            const neighborIdx = packageIdx > 0 ? packageIdx - 1 : 0;
            const neighborPkg = packagesList.userAccess[neighborIdx];
            if (neighborPkg) selectPackage(neighborPkg.id, false);
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
    packagesGrid.appendChild(packageEl);

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
                // Um único ícone: a sessão mais antiga do pacote (sem pilha).
                fillPackageStackIcon(iconStack, affectedPkg.sessions);
            }
        }

        // Re-renderiza completamente o painel de detalhes do pacote afetado
        // (atualiza lista de sessões, stats, etc.)
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