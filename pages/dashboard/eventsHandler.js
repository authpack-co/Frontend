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

        // Para o refresh do card "usando agora".
        stopUsingNowTimers();
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

    buildInviteUrl(key) {
        if (!key) return '';
        return `${window.location.origin}/pages/package-invite/?key=${encodeURIComponent(key)}`;
    },

    // "Hoje, 14:22" · "Ontem, 11:14" · "12 ago, 15:40" — vazio sem data válida.
    formatDayStamp(dateValue) {
        const date = new Date(dateValue);
        if (!dateValue || Number.isNaN(date.getTime())) return '';

        const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const days = this.daysApart(date);
        if (days === 0) return `Hoje, ${time}`;
        if (days === 1) return `Ontem, ${time}`;
        return `${this.formatDayLabel(date)}, ${time}`;
    },

    // Diferença em dias de calendário entre a data e hoje (0 = hoje, 1 = ontem).
    daysApart(date) {
        const startOf = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        return Math.round((startOf(new Date()) - startOf(date)) / 86400000);
    },

    // "24 jul" no mesmo ano; "24 jul 2025" quando o ano é outro.
    formatDayLabel(date) {
        const sameYear = date.getFullYear() === new Date().getFullYear();
        // pt-BR devolve "25 de jul." / "25 de jul. de 2025" — enxugamos para "25 jul".
        return date.toLocaleDateString('pt-BR', sameYear
            ? { day: 'numeric', month: 'short' }
            : { day: 'numeric', month: 'short', year: 'numeric' })
            .replace(/\./g, '')
            .replace(/ de /g, ' ');
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
    // A linha inteira da lista do dono abre os detalhes da sessão.
    { selector: '.preset-collection .session-row', event: 'click', handler: showSessionScreen },
    { selector: '.preset-collection .session-row', event: 'keydown', handler: handleSessionRowKeydown },
    { selector: '.preset-collection .session-card-members', event: 'click', handler: handleUsingNowClick },
    { selector: '.preset-collection .session-card-members', event: 'keydown', handler: handleUsingNowKeydown },
    { selector: '.preset-session-overview .service-users-section', event: 'click', handler: handleUsingNowClick },
    { selector: '.preset-session-overview .service-users-section', event: 'keydown', handler: handleUsingNowKeydown }
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
    if (!sessionOptions) return;

    sessionOptions.classList.toggle('hidden');
    if (!sessionOptions.classList.contains('hidden')) placeSessionRowOptions(card, sessionOptions);
}

// A lista do dono rola dentro da moldura, e área rolável corta o que passa dela
// — o menu ⋯ da última linha morreria pela metade. Por isso, na lista, o menu é
// posicionado em coordenadas de viewport (position: fixed pelo CSS): aqui só
// calculamos onde ele cabe, abrindo para cima quando não há espaço abaixo.
function placeSessionRowOptions(row, menu) {
    if (!row.classList.contains('session-row')) return;   // acessos: card, menu absoluto

    const rowBox = row.getBoundingClientRect();
    const menuH = menu.offsetHeight;

    // Mesmo desenho do card: o menu nasce um pouco abaixo do topo da linha.
    let top = rowBox.top + 42;
    if (top + menuH > window.innerHeight - 8) top = Math.max(8, rowBox.bottom - 42 - menuH);

    menu.style.top = top + 'px';
    menu.style.left = (rowBox.right - 16 - menu.offsetWidth) + 'px';
}

// Rolar (a página ou a própria lista) desalinha um menu em coordenadas fixas:
// fecha em vez de recalcular. Captura para pegar também a rolagem da lista.
window.addEventListener('scroll', () => {
    document.querySelectorAll('.session-row .session-options:not(.hidden)')
        .forEach(menu => menu.classList.add('hidden'));
}, true);

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
    const titleEl = modal.querySelector('#asModalTitle');

    if (pkgNameEl) pkgNameEl.textContent = packageData.name || '';
    if (titleEl) titleEl.textContent = 'Atualizar sessões';

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
    const titleEl = modal.querySelector('#asModalTitle');
    if (titleEl) titleEl.textContent = 'Atualizar sessão';
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

    // O botão mora na top bar, então o pacote é o que está aberto no detalhe.
    const packageId = this.dataset.packageId
        || document.querySelector('#package-details')?.dataset.packageId;
    const packageData = packagesList.userCollection.find(pkg => pkg.id == packageId);
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

    const titleEl = modal.querySelector('#asModalTitle');
    if (titleEl) titleEl.textContent = 'Adicionar sessão';
    if (pkgNameEl) pkgNameEl.textContent = packageData.name || '';

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

    // Insere a sessão recém-criada no topo da lista do pacote aberto. A primeira
    // sessão do pacote tira o painel do estado vazio.
    function renderNewSessionCard(session) {
        const panelContainer = document.querySelector('#package-details .preset-collection .sessions-panel-container');
        if (panelContainer) setElementState(panelContainer, 'content');

        const list = document.querySelector('#package-details .preset-collection .sessions-panel .sessions-list');
        if (!list) return;
        const row = createSessionElement(session, true, packageData);
        row.classList.add('fadeInFromTop');
        list.insertBefore(row, list.firstChild);
        row.addEventListener('animationend', () => row.classList.remove('fadeInFromTop'), { once: true });
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

// Abre o modal de compartilhamento de um pacote da coleção (por id). Usado
// tanto pelo botão de opções da sidebar quanto pelo botão "Compartilhar" da
// top bar. O modal tem uma ação só — copiar o link —, então não há estado a
// carregar nem requisição a fazer aqui.
function openSharePackageModal(packageId) {
    if (!packageId) return;

    const packageData = packagesList.userCollection.find(pkg => pkg.id == packageId);
    if (!packageData) return;

    setShareInviteValues(packageData.key);
    utils.showModal("sharePackage", packageId);
}

// Link e código são a mesma chave em dois formatos.
function setShareInviteValues(key) {
    const linkEl = document.querySelector("#sharePackageModal #shareLinkUrl");
    const codeEl = document.querySelector("#sharePackageModal #shareCodeBtn");
    const url = utils.buildInviteUrl(key);

    linkEl.textContent = url || '—';
    linkEl.title = url || '';
    codeEl.textContent = key || '—';
    codeEl.title = key || '';
}

// ============================================================================
// PESSOAS DO PACOTE (membros + solicitações)
// ============================================================================

// Uma carga só alimenta as duas abas: elas mudam juntas (aprovar tira da
// segunda e põe na primeira), então manter duas fontes separadas só criaria
// chance das listas discordarem entre si.
const pkgPeopleState = {
    packageId: null,
    tab: 'members',
    members: [],
    requests: [],
    peopleLimit: null,
    loading: false,
    failed: false,
};

async function openPackagePeopleModal(packageId, tab) {
    if (!packageId) return;

    pkgPeopleState.packageId = packageId;
    pkgPeopleState.tab = tab || 'members';
    pkgPeopleState.members = [];
    pkgPeopleState.requests = [];
    pkgPeopleState.loading = true;
    pkgPeopleState.failed = false;

    setPkgPeopleTab(pkgPeopleState.tab);
    renderPackagePeople();
    utils.showModal('packagePeople', packageId);

    await loadPackagePeople(packageId);
}

async function loadPackagePeople(packageId) {
    pkgPeopleState.loading = true;
    pkgPeopleState.failed = false;
    renderPackagePeople();

    const res = await fetchManager.getPackagePeople(packageId);

    // O modal pode ter fechado (ou trocado de pacote) durante a requisição.
    if (pkgPeopleState.packageId !== packageId) return;

    pkgPeopleState.loading = false;

    if (!res.ok || !res.result || !res.result.data) {
        pkgPeopleState.failed = true;
        renderPackagePeople();
        return;
    }

    const data = res.result.data;
    pkgPeopleState.members = data.members || [];
    pkgPeopleState.requests = data.requests || [];
    pkgPeopleState.peopleLimit = data.peopleLimit;

    // O contador do pacote e a bolinha da sidebar são derivados desta mesma
    // resposta — é a leitura mais fresca que existe, mais nova que a do boot.
    syncPackagePendingCount(packageId, pkgPeopleState.requests.filter(r => r.status === 'pending').length);

    renderPackagePeople();
}

function setPkgPeopleTab(tab) {
    const card = document.querySelector('#packagePeopleModal .pkg-people-modal');
    if (!card) return;

    pkgPeopleState.tab = tab;
    card.dataset.tab = tab;
    card.querySelectorAll('.pkg-people-tab').forEach(button => {
        const isActive = button.dataset.tab === tab;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', String(isActive));
    });
}

function renderPackagePeople() {
    const body = document.querySelector('#packagePeopleModal #pkgPeopleBody');
    if (!body) return;

    const membersCount = document.querySelector('#packagePeopleModal #pkgMembersCount');
    const requestsCount = document.querySelector('#packagePeopleModal #pkgRequestsCount');
    const pending = pkgPeopleState.requests.filter(r => r.status === 'pending');

    membersCount.textContent = pkgPeopleState.members.length || '';
    requestsCount.textContent = pending.length;
    requestsCount.classList.toggle('hidden', pending.length === 0);

    if (pkgPeopleState.loading) {
        body.innerHTML = '<div class="pkg-people-loading">' +
            '<span class="pkg-people-skeleton"></span>'.repeat(3) + '</div>';
        return;
    }

    if (pkgPeopleState.failed) {
        body.innerHTML = '';
        const box = createElement('div', 'pkg-people-empty');
        box.appendChild(createElement('span', 'pkg-people-empty-title', 'Não foi possível carregar'));
        const retry = createElement('button', 'pkg-people-retry', 'Tentar de novo');
        retry.type = 'button';
        retry.addEventListener('click', () => loadPackagePeople(pkgPeopleState.packageId));
        box.appendChild(retry);
        body.appendChild(box);
        return;
    }

    body.innerHTML = '';

    if (pkgPeopleState.tab === 'requests') {
        renderRequestsTab(body, pending);
    } else {
        renderMembersTab(body);
    }
}

function renderMembersTab(body) {
    const list = createElement('div', 'pkg-people-list');
    pkgPeopleState.members.forEach(member => list.appendChild(buildMemberRow(member)));
    body.appendChild(list);

    // Só o dono na lista: a lista existe, mas ainda não é um pacote compartilhado.
    // A dica vai embaixo dela, não no lugar dela.
    if (pkgPeopleState.members.every(m => m.isCreator)) {
        body.appendChild(createElement('p', 'pkg-people-hint',
            'Ninguém entrou ainda. Compartilhe o link do pacote para receber solicitações.'));
    }
}

function renderRequestsTab(body, pending) {
    if (!pending.length) {
        body.appendChild(buildPkgPeopleEmpty(
            'Nenhuma solicitação',
            'Quando alguém abrir o link do pacote e pedir acesso, o pedido chega aqui.'
        ));
        return;
    }

    const list = createElement('div', 'pkg-people-list');
    pending.forEach(request => list.appendChild(buildRequestRow(request)));
    body.appendChild(list);
}

function buildPkgPeopleEmpty(title, text) {
    const box = createElement('div', 'pkg-people-empty');
    box.appendChild(createElement('span', 'pkg-people-empty-title', title));
    box.appendChild(createElement('span', 'pkg-people-empty-text', text));
    return box;
}

// Avatar de uma pessoa: foto quando existe, iniciais com cor derivada do nome
// quando não.
function buildPersonAvatar(person) {
    const [c1, c2] = accessPalette(person.name);
    const avatar = createElement('span', 'pkg-person-avatar', shareInitials(person.name));
    avatar.style.background = `linear-gradient(150deg, ${c1}, ${c2})`;

    if (person.picture) {
        const img = document.createElement('img');
        img.src = person.picture;
        img.alt = person.name || '';
        img.onerror = function () { this.remove(); };
        avatar.appendChild(img);
    }

    return avatar;
}

function shareInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Cabeçalho comum de membro e solicitação: avatar, nome, e-mail e a data que
// importa para aquela linha (quando entrou / quando pediu).
function buildPersonHead(person, metaText, tagText) {
    const head = createElement('div', 'pkg-person-head');
    head.appendChild(buildPersonAvatar(person));

    const info = createElement('div', 'pkg-person-info');
    const nameRow = createElement('div', 'pkg-person-name-row');
    nameRow.appendChild(createElement('span', 'pkg-person-name', person.name || '—'));
    if (tagText) nameRow.appendChild(createElement('span', 'pkg-person-tag', tagText));
    info.appendChild(nameRow);
    info.appendChild(createElement('span', 'pkg-person-email', person.email || ''));
    info.appendChild(createElement('span', 'pkg-person-meta', metaText));
    head.appendChild(info);

    return head;
}

function buildMemberRow(member) {
    const row = createElement('div', 'pkg-person' + (member.suspended ? ' suspended' : ''));
    const entered = utils.formatDayStamp(member.connectedAt);

    const tag = member.isCreator
        ? 'dono'
        // Sobre-limite do plano: está na lista, mas sem acesso até liberar espaço.
        : (member.suspended ? 'sem acesso' : '');

    row.appendChild(buildPersonHead(
        member,
        member.isCreator
            ? 'Criou o pacote'
            : (entered ? `Entrou ${entered.charAt(0).toLowerCase()}${entered.slice(1)}` : 'Entrou recentemente'),
        tag
    ));

    // O dono é quem está olhando: não há o que remover nem atividade a auditar.
    if (member.isCreator) return row;

    const actions = createElement('div', 'pkg-person-actions');

    const activityBtn = createElement('button', 'pkg-person-btn', 'Ver atividade');
    activityBtn.type = 'button';
    activityBtn.addEventListener('click', () => {
        // A tela de detalhes vive atrás do modal, então o modal sai da frente.
        const packageId = pkgPeopleState.packageId;
        utils.closeModals();
        openUserScreen(member.id, packageId);
    });
    actions.appendChild(activityBtn);

    const removeBtn = createElement('button', 'pkg-person-btn pkg-person-btn--danger', 'Remover');
    removeBtn.type = 'button';
    removeBtn.addEventListener('click', () => removeMember(member, removeBtn));
    actions.appendChild(removeBtn);

    row.appendChild(actions);

    return row;
}

function buildRequestRow(request) {
    const row = createElement('div', 'pkg-person pkg-person--request');
    const asked = utils.formatDayStamp(request.createdAt);

    row.appendChild(buildPersonHead(
        request.user,
        asked ? `Pediu ${asked.charAt(0).toLowerCase()}${asked.slice(1)}` : 'Pediu recentemente'
    ));

    const actions = createElement('div', 'pkg-person-actions');

    const rejectBtn = createElement('button', 'pkg-person-btn', 'Recusar');
    rejectBtn.type = 'button';

    const approveBtn = createElement('button', 'pkg-person-btn pkg-person-btn--primary', 'Aprovar');
    approveBtn.type = 'button';

    approveBtn.addEventListener('click', () => decideRequest(request, 'approve', [approveBtn, rejectBtn]));
    rejectBtn.addEventListener('click', () => decideRequest(request, 'reject', [approveBtn, rejectBtn]));

    actions.appendChild(rejectBtn);
    actions.appendChild(approveBtn);
    row.appendChild(actions);

    return row;
}

// Aprovar ou recusar. Os dois botões travam juntos: a linha inteira está sendo
// decidida, não só o botão clicado.
async function decideRequest(request, action, buttons) {
    const packageId = pkgPeopleState.packageId;
    buttons.forEach(b => { b.disabled = true; });

    const res = action === 'approve'
        ? await fetchManager.approvePackageRequest(packageId, request.id)
        : await fetchManager.rejectPackageRequest(packageId, request.id);

    if (!res.ok) {
        buttons.forEach(b => { b.disabled = false; });
        notify('error', res.result && res.result.errorMessage
            ? res.result.errorMessage
            : 'Não foi possível responder à solicitação.');
        return;
    }

    notify('success', action === 'approve' ? 'Acesso liberado.' : 'Solicitação recusada.');

    // Aprovar muda as duas listas e o pacote (novo membro), então vale recarregar
    // tudo em vez de remendar o estado local.
    await refreshPackageAfterMembershipChange(packageId);
}

// Remove alguém do pacote. Sem modal de confirmação: a ação é reversível — a
// pessoa pode pedir de novo pelo mesmo link.
async function removeMember(member, button) {
    const packageId = pkgPeopleState.packageId;
    button.disabled = true;

    const res = await fetchManager.removeUserFromPackage({ packageId, userId: member.id });

    if (!res.ok) {
        button.disabled = false;
        notify('error', res.result && res.result.errorMessage
            ? res.result.errorMessage
            : 'Não foi possível remover a pessoa.');
        return;
    }

    notify('success', `${member.name || 'Pessoa'} saiu do pacote.`);
    await refreshPackageAfterMembershipChange(packageId);
}

// Entrar ou sair do pacote muda a lista de membros, o contador da top bar e o
// limite de pessoas da conta — os três vêm do mesmo recarregamento.
async function refreshPackageAfterMembershipChange(packageId) {
    const res = await fetchManager.getCollectionPackages();
    if (res.ok && res.result && res.result.data) {
        // Guarda quem estava aberto: renderPackages limpa o container e leva a
        // marca de selecionado junto. Repor a classe basta — chamar selectPackage
        // inteiro remontaria a tela por baixo do modal.
        const selectedId = document
            .querySelector('.preset-collection .access-item.selected')?.dataset.packageId;

        packagesList.userCollection = res.result.data;
        renderPackages(packagesList.userCollection, '.preset-collection .access-grid', false);

        if (selectedId) {
            document
                .querySelector(`.preset-collection .access-item[data-package-id="${selectedId}"]`)
                ?.classList.add('selected');
        }

        const pkg = packagesList.userCollection.find(item => item.id == packageId);
        if (pkg) {
            updatePackagePeopleCounter(pkg);
            // "Pessoas com acesso", ao lado do gráfico: mesma lista, outro lugar
            // da tela. Sem isso o novo membro só apareceria ao trocar de pacote.
            if (selectedId === String(packageId)) renderPackageUsersPanel(pkg);
        }
    }

    // Aprovar ou remover mexe no total de pessoas da conta, que é o limite do
    // plano exibido no rodapé da sidebar.
    const info = await fetchManager.getUserInfo();
    if (info.ok && info.result && info.result.data) {
        renderUserInfo(info.result.data);
        updatePeopleCounter();
    }

    if (pkgPeopleState.packageId === packageId) await loadPackagePeople(packageId);
}

// Mantém a contagem de pendentes do pacote em dia no estado local, para a
// bolinha da sidebar e o contador da top bar não ficarem para trás do modal.
function syncPackagePendingCount(packageId, pending) {
    const pkg = packagesList.userCollection.find(item => item.id == packageId);
    if (!pkg) return;

    pkg.pendingRequests = pending;
    updatePackagePendingBadge(packageId, pending);
    updatePackagePeopleCounter(pkg);
}

// Copia um valor e dá feedback no próprio botão. Botões com ícone trocam só o
// texto do <span>, para o SVG não ser apagado junto; quem quiser uma confirmação
// própria ("Link copiado") declara em data-copied-label.
function copyShareValue(value, button, errorMessage) {
    if (!value || value === '—') return;

    const label = button.querySelector('span') || button;

    navigator.clipboard.writeText(value).then(() => {
        const original = label.textContent;
        label.textContent = button.dataset.copiedLabel || 'Copiado';
        button.classList.add('copied');
        setTimeout(() => {
            label.textContent = original;
            button.classList.remove('copied');
        }, 1200);
    }).catch(() => notify('error', errorMessage));
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
    const userId = this.closest(".user").dataset.userId;
    const packageId = document.querySelector("#package-details").dataset.packageId;

    openUserScreen(userId, packageId);
}

// Abre a tela de detalhes de uma pessoa dentro do pacote: perfil, uso total,
// última vez e o histórico de sessões. Depende de pkg.stats, que é carregado
// junto com o pacote selecionado.
function openUserScreen(userId, packageId) {
    const package = packagesList.userCollection.find(p => p.id === packageId);
    const user = package && package.users.find(u => u.id === userId);
    if (!user) return;

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

// A linha da lista é um botão: Enter/Espaço abrem os detalhes, como o clique.
function handleSessionRowKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target !== this) return;
    event.preventDefault();
    showSessionScreen.call(this, event);
}

// Card "usando agora" ==========
// Abre a lista de quem está na sessão neste momento. Enquanto está aberto, o
// overview é rebuscado a cada 30s — sem isso o card mostraria a foto do momento
// em que a página carregou (o dashboard não tem polling).

let usingNowRefreshTimer = null;

function handleUsingNowClick(event) {
    event.stopPropagation();

    const packageEl = this.closest('#package-details');
    const packageId = packageEl?.dataset.packageId;
    const packageData = packagesList.userCollection.find(pkg => pkg.id === packageId);
    if (!packageData || !packageData.stats) return;

    // O gatilho existe no rodapé do card do grid e no cabeçalho da tela da sessão.
    const sessionId = this.closest('.session-card')?.dataset.sessionId
        || this.closest('.preset-session-overview')?.dataset.sessionId;
    const sessionData = (packageData.sessions || []).find(s => s.id === sessionId);
    if (!sessionData) return;

    // Sem ninguém online o bloco não é botão — nada a abrir.
    if (!((packageData.stats.sessionsOnline || {})[sessionId] || 0)) return;

    openUsingNowModal(sessionData, packageData);
}

function handleUsingNowKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleUsingNowClick.call(this, event);
}

function openUsingNowModal(session, pkg) {
    // Abre já preenchido com o que está em cache e só depois busca o dado fresco
    // — abrir num spinner seria pior do que abrir com 30s de atraso.
    renderUsingNowModal(session, pkg);
    utils.showModal('usingNow', session.id);

    stopUsingNowTimers();
    usingNowRefreshTimer = setInterval(() => refreshUsingNowModal(session, pkg), USING_NOW_REFRESH_MS);

    refreshUsingNowModal(session, pkg);
}

async function refreshUsingNowModal(session, pkg) {
    const modal = document.getElementById('usingNowModal');
    if (!modal.classList.contains('show')) return stopUsingNowTimers();

    // Falhou: mantém na tela o que já estava, em vez de esvaziar o card.
    const updated = await fetchPackageStats(pkg);
    if (!updated || !modal.classList.contains('show')) return;

    renderUsingNowModal(session, pkg);

    // Os cards atrás do modal não podem continuar mostrando a contagem antiga.
    refreshSessionCardsOnline(pkg);
}

function stopUsingNowTimers() {
    clearInterval(usingNowRefreshTimer);
    usingNowRefreshTimer = null;
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

// ── Troca de plano: simular → confirmar → executar ──────────────────────────
// Nenhuma cobrança acontece sem o cliente ver antes o valor exato. O clique no
// plano só SIMULA; quem dispara a cobrança é o botão do modal de confirmação.

const PLAN_LABELS = { free: 'Free', plus: 'Plus', business: 'Business', enterprise: 'Enterprise' };
const PLAN_PEOPLE = {
    free: 'até 10 pessoas',
    plus: 'até 25 pessoas',
    business: 'até 75 pessoas',
    enterprise: 'pessoas ilimitadas',
};

function planMoney(cents, currency) {
    return ((cents || 0) / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: (currency || 'BRL').toUpperCase(),
    });
}

function planDate(value) {
    if (!value) return '';
    // effectiveAt vem em unix seconds no upgrade e como data ISO no downgrade.
    const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Executa de fato a troca (ou o redirect para o Checkout de assinatura nova).
async function startPlanChange(plan, { button = null } = {}) {
    const res = await fetchManager.createSubscriptionCheckout(plan);

    if (!res.ok) {
        notify('error', res.result?.error === 'ALREADY_SUBSCRIBED_TO_THIS_PLAN'
            ? 'Você já está neste plano.'
            : res.result?.error || 'Não foi possível concluir a operação.');
        if (button) { button.disabled = false; button.textContent = 'Confirmar'; }
        return;
    }

    const { mode, url, effectiveAt } = res.result || {};

    if (mode === 'checkout') {
        if (!url) {
            notify('error', 'Erro ao iniciar checkout. Tente novamente.');
            if (button) { button.disabled = false; button.textContent = 'Confirmar'; }
            return;
        }
        window.location.href = url;
        return;
    }

    utils.closeModals();

    if (mode === 'upgraded') {
        notify('success', 'Plano atualizado! Cobramos apenas a diferença proporcional.');
    } else if (mode === 'downgrade_scheduled') {
        notify('success', `Mudança agendada para ${planDate(effectiveAt) || 'o fim do período atual'}.`);
    } else if (mode === 'schedule_canceled') {
        notify('success', 'Mudança de plano cancelada. Você segue no plano atual.');
    }

    setTimeout(() => window.location.reload(), 2500);
}

// Monta e abre o modal de confirmação com os números vindos da simulação.
function openPlanChangeConfirm(plan, preview) {
    const el = (id) => document.getElementById(id);
    const from = PLAN_LABELS[preview.currentTier] || preview.currentTier;
    const to = PLAN_LABELS[preview.newTier] || preview.newTier;

    const chargeBox = el('pc-charge');
    const breakdown = el('pc-breakdown');
    const linesEl = el('pc-lines');
    const confirmBtn = el('pc-confirm');

    // Estado limpo — o modal é reutilizado entre aberturas.
    linesEl.innerHTML = '';
    breakdown.style.display = 'none';
    chargeBox.classList.remove('pc-charge--none');
    el('pc-charge-sub').textContent = '';

    // Transição entre planos
    el('pc-from-name').textContent = `AuthPack ${from}`;
    el('pc-from-people').textContent = PLAN_PEOPLE[preview.currentTier] || '';
    el('pc-to-name').textContent = `AuthPack ${to}`;
    el('pc-to-people').textContent = PLAN_PEOPLE[preview.newTier] || '';

    if (preview.mode === 'upgrade') {
        el('pc-title').textContent = 'Confirmar upgrade';
        el('pc-to-label').textContent = 'A partir de agora';

        // Detalhamento da Stripe: crédito do tempo não usado + valor do novo plano.
        if ((preview.lines || []).length) {
            breakdown.style.display = '';
            preview.lines.forEach((l) => {
                const row = document.createElement('div');
                row.className = 'pc-line';
                row.innerHTML = '<span></span><strong></strong>';
                row.querySelector('span').textContent = l.description || '';
                const value = row.querySelector('strong');
                value.textContent = planMoney(l.amount, preview.currency);
                if (l.amount < 0) value.classList.add('is-credit');
                linesEl.appendChild(row);
            });
        }

        el('pc-charge-label').textContent = 'Cobrança única agora';
        el('pc-charge-value').textContent = planMoney(preview.amountDueNow, preview.currency);
        el('pc-charge-sub').textContent = 'Referente apenas aos dias restantes do ciclo atual.';
        el('pc-note').textContent = 'A mensalidade cheia do novo plano só passa a valer na próxima '
            + 'renovação. O novo limite de pessoas fica disponível imediatamente.';
    } else if (preview.mode === 'downgrade') {
        const when = planDate(preview.effectiveAt);
        el('pc-title').textContent = 'Confirmar mudança de plano';
        el('pc-to-label').textContent = when ? `A partir de ${when}` : 'No fim do ciclo';

        chargeBox.classList.add('pc-charge--none');
        el('pc-charge-label').textContent = 'Nenhuma cobrança agora';
        el('pc-charge-value').textContent = 'R$ 0,00';
        el('pc-charge-sub').textContent = when
            ? `Você já pagou o ${from} até ${when}.`
            : `Você já pagou o ${from} até o fim do ciclo atual.`;
        el('pc-note').textContent = `Até lá nada muda: você mantém todos os limites do ${from}. `
            + `Depois dessa data passa a valer o limite do ${to} — acessos compartilhados acima do novo `
            + 'limite ficam pausados até você liberar espaço.';
    } else if (preview.mode === 'cancel_schedule') {
        el('pc-title').textContent = 'Cancelar mudança agendada';
        el('pc-to-label').textContent = 'Continua';
        el('pc-to-name').textContent = `AuthPack ${from}`;
        el('pc-to-people').textContent = PLAN_PEOPLE[preview.currentTier] || '';

        chargeBox.classList.add('pc-charge--none');
        el('pc-charge-label').textContent = 'Nenhuma cobrança agora';
        el('pc-charge-value').textContent = 'R$ 0,00';
        el('pc-note').textContent = `A mudança agendada será desfeita e você segue no ${from} `
            + 'normalmente, com renovação automática.';
    }

    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirmar';
    confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processando...';
        await startPlanChange(plan, { button: confirmBtn });
    };

    utils.showModal('planChange');
}

// Plan CTA — abre a simulação. Um botão por plano assinável
// (data-plan="plus" | "business"). Enterprise é um link de contato (sem data-plan).
const planChooseBtns = document.querySelectorAll('.plan-choose-btn[data-plan]');
planChooseBtns.forEach(planBtn => {
    planBtn.addEventListener('click', async () => {
        if (planBtn.disabled) return;

        const plan = planBtn.dataset.plan;
        planBtn.disabled = true;
        const originalText = planBtn.textContent;
        planBtn.textContent = 'Redirecionando...';

        const restore = () => {
            planBtn.disabled = false;
            planBtn.textContent = originalText;
        };

        try {
            // Etapa 1 — simula. Nada é cobrado aqui.
            const res = await fetchManager.previewPlanChange(plan);
            restore();

            if (!res.ok) {
                notify('error', res.result?.error || 'Não foi possível simular a troca de plano.');
                return;
            }

            const preview = res.result || {};

            // Assinatura nova: o próprio Checkout da Stripe é a tela de
            // confirmação, com valor e cartão. Não duplicamos isso aqui.
            if (preview.mode === 'checkout') {
                await startPlanChange(plan);
                return;
            }

            if (preview.mode === 'same') {
                notify('error', 'Você já está neste plano.');
                return;
            }

            openPlanChangeConfirm(plan, preview);
        } catch (err) {
            console.error('Plan preview error:', err);
            notify('error', 'Erro inesperado. Tente novamente.');
            restore();
        }
    });
});

const cancelBtns = document.querySelectorAll(".cancel-btn");
cancelBtns.forEach(item => item.addEventListener("click", event => {
    utils.closeModals();
}));

// Retorno do Checkout hospedado da Stripe (?assinatura=sucesso|cancelado).
// O pagamento é confirmado pelo webhook invoice.paid, que pode chegar alguns
// segundos depois do redirect — por isso a mensagem fala em "liberando" e a
// página recarrega uma vez para pegar o plano já atualizado.
(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("assinatura");
    if (!outcome) return;

    params.delete("assinatura");
    const query = params.toString();
    const cleanUrl = window.location.pathname + (query ? `?${query}` : "") + window.location.hash;
    window.history.replaceState({}, "", cleanUrl);

    if (outcome === "sucesso") {
        notify("success", "Pagamento recebido! Liberando seu plano...");
        setTimeout(() => window.location.reload(), 4000);
    } else if (outcome === "cancelado") {
        notify("error", "Checkout cancelado. Nenhuma cobrança foi feita.");
    }
})();

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
    // pulando a de criar pacote, já que ele acabou de criar. Só para quem ainda
    // não dispensou nem concluiu o guia.
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


// Pedir acesso pelo código do pacote
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
    if (buttonContent.classList.contains("loading-state")) return;

    setElementState(buttonContent, "loading");

    const res = await fetchManager.usePackageKey({ key });

    setElementState(buttonContent, "content");

    if (!res.ok) {
        notify("error", res.result && res.result.errorMessage
            ? res.result.errorMessage
            : "Não foi possível solicitar o acesso.");
        return;
    }

    const data = res.result.data || {};
    const pkgName = data.package && data.package.name ? data.package.name : 'pacote';
    const ownerName = data.owner && data.owner.name ? data.owner.name : 'o dono';

    // O pacote não entra em "Meus acessos" agora — só quando o dono aprovar. Por
    // isso a mensagem fala de espera, e não de pacote ativado.
    notify("success", data.alreadyPending
        ? `Seu pedido para "${pkgName}" continua com ${ownerName}.`
        : `Pedido enviado. ${ownerName} precisa aprovar para você usar "${pkgName}".`);

    activationInput.value = "";
    utils.clearInputError(activationSection);
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

// ── Compartilhar pacote: copiar o link, copiar o código, trocar o link ──────
const sharePackageModal = document.querySelector('#sharePackageModal');
const shareCopyBtn = sharePackageModal.querySelector('#shareCopyBtn');
const shareCodeBtn = sharePackageModal.querySelector('#shareCodeBtn');
const shareRotateBtn = sharePackageModal.querySelector('#shareRotateBtn');

shareCopyBtn.addEventListener('click', () => {
    copyShareValue(sharePackageModal.querySelector('#shareLinkUrl').textContent, shareCopyBtn,
        'Não foi possível copiar o link.');
});

shareCodeBtn.addEventListener('click', () => {
    copyShareValue(shareCodeBtn.textContent, shareCodeBtn, 'Não foi possível copiar o código.');
});

// Troca a chave do pacote: link e código anteriores param de valer de uma vez.
// Quem já entrou não é afetado — a chave só serve para pedir acesso.
let shareRotateSpins = 0;
shareRotateBtn.addEventListener('click', async () => {
    const packageId = sharePackageModal.dataset.itemId;

    // A volta completa da seta é o retorno visual da troca.
    shareRotateSpins += 1;
    shareRotateBtn.querySelector('svg').style.transform = `rotate(${shareRotateSpins * 360}deg)`;

    shareRotateBtn.disabled = true;
    const res = await fetchManager.renewPackageKey({ id: packageId });
    shareRotateBtn.disabled = false;

    if (!res.ok) {
        notify('error', 'Não foi possível trocar o link.');
        return;
    }

    const newKey = res.result.data.key;
    const packageIdx = packagesList.userCollection.findIndex(pkg => pkg.id == packageId);
    if (packageIdx !== -1) packagesList.userCollection[packageIdx].key = newKey;

    setShareInviteValues(newKey);
    shareCopyBtn.classList.remove('copied');
    notify('success', 'Link novo gerado. O anterior parou de funcionar.');
});

// ── Pessoas do pacote: navegação entre "Membros" e "Solicitações" ───────────
const packagePeopleModal = document.querySelector('#packagePeopleModal');

packagePeopleModal.querySelector('.pkg-people-tabs').addEventListener('click', event => {
    const button = event.target.closest('.pkg-people-tab');
    if (!button || button.dataset.tab === pkgPeopleState.tab) return;

    setPkgPeopleTab(button.dataset.tab);
    renderPackagePeople();
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