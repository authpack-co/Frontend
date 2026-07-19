let packagesList = {
    userCollection: [],
    userAccess: []
}

let currentUserInfo = null;

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

// Função auxiliar para criar elemento com segurança
function createElement(tag, className = '', textContent = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
}

// ============================================================================
// FUNÇÕES GERADORAS DE ELEMENTOS
// ============================================================================

// Paletas determinísticas de fallback (espelham paletteFor de outras páginas)
// Cor neutra (accent do tema) usada só quando a sessão não traz darkPalette.
const SESSION_NEUTRAL_RGB = [96, 165, 250];

function clamp255(v) { return Math.max(0, Math.min(255, Math.round(Number(v) || 0))); }

// Extrai o trio RGB do campo session.darkPalette. Formato da API: varchar
// como "[12,116,44]" (r,g,b de 0–255). Também aceita, defensivamente, um array
// [12,116,44] ou um hex "#0c742c". Retorna [r,g,b] ou null.
function parseDarkPalette(dp) {
    if (Array.isArray(dp)) {
        const n = dp.map(Number).filter(Number.isFinite);
        if (n.length >= 3) return [clamp255(n[0]), clamp255(n[1]), clamp255(n[2])];
        return null;
    }
    if (typeof dp === 'string') {
        const s = dp.trim();
        if (!s) return null;
        if (s[0] === '#') {
            let h = s.slice(1);
            if (h.length === 3) h = h.split('').map(x => x + x).join('');
            const num = parseInt(h, 16);
            if (h.length === 6 && !Number.isNaN(num)) return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
            return null;
        }
        // "[12,116,44]" ou "12,116,44"
        const nums = (s.match(/\d+/g) || []).map(Number);
        if (nums.length >= 3) return [clamp255(nums[0]), clamp255(nums[1]), clamp255(nums[2])];
    }
    return null;
}

// rgba() a partir de um trio [r,g,b].
function rgbaFrom(rgb, alpha) { return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`; }

// Deriva um tom mais escuro da mesma cor (fim do gradiente da barra), já que a
// API entrega uma única cor por sessão.
function darkenRgb(rgb, factor) { return rgb.map(v => clamp255(v * factor)); }

// Cor do serviço a partir de session.darkPalette (dado real da sessão, como
// url/name). Retorna { rgb, c1, c2 } — c1 = cor da sessão, c2 = tom mais escuro
// para o fim do gradiente da barra. Sem darkPalette, usa o accent neutro.
function paletteFromSession(session) {
    const rgb = parseDarkPalette(session && session.darkPalette) || SESSION_NEUTRAL_RGB;
    const rgb2 = darkenRgb(rgb, 0.55);
    return {
        rgb,
        c1: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
        c2: `rgb(${rgb2[0]},${rgb2[1]},${rgb2[2]})`,
        glow: (a) => rgbaFrom(rgb, a)
    };
}

// Converte um rótulo de tempo ("1h 20m", "45m", "0s") em minutos (número).
// Usado só para dimensionar a barra de "uso no período" de forma relativa.
function usageLabelToMinutes(label) {
    if (typeof label !== 'string') return 0;
    let total = 0;
    const h = label.match(/(\d+)\s*h/); if (h) total += Number(h[1]) * 60;
    const m = label.match(/(\d+)\s*m/); if (m) total += Number(m[1]);
    const s = label.match(/(\d+)\s*s/); if (s) total += Number(s[1]) / 60;
    return total;
}

// A sessão mais antiga (a primeira adicionada) do pacote. A ordem do array não é
// garantida (JSON_ARRAYAGG no backend), então escolhemos pelo createdAt. É ela quem
// representa o pacote — sempre um único ícone, nunca uma pilha.
function getOldestSession(sessions) {
    return (sessions || []).reduce((oldest, s) => {
        if (!oldest) return s;
        return new Date(s.createdAt) < new Date(oldest.createdAt) ? s : oldest;
    }, null);
}

// Preenche um icon-stack com o ícone único da sessão mais antiga do pacote.
function fillPackageStackIcon(iconStackEl, sessions) {
    iconStackEl.innerHTML = '';
    const oldest = getOldestSession(sessions);
    if (!oldest) return;
    const stackIcon = createElement('div', 'stack-icon');
    const img = document.createElement('img');
    img.alt = oldest.name;
    AuthPackFavicon.apply(img, { icon: oldest.icon, url: oldest.url });
    stackIcon.appendChild(img);
    iconStackEl.appendChild(stackIcon);
}

// Gera o elemento DOM de um pacote
function createPackageElement(pkg, isAccess = false) {
    const container = createElement('div', 'access-item sidebar-pkg-item');
    container.dataset.packageId = pkg.id;
    container.dataset.isActive = pkg.isActive !== false ? 'true' : 'false';

    // Linha principal: nome à esquerda + pilha de logos (perdendo opacidade)
    const main = createElement('div', 'sidebar-pkg-main');

    const title = createElement('div', 'access-title');
    title.textContent = pkg.name;

    const iconStack = createElement('div', 'icon-stack sidebar-pkg-logos');
    // Apenas a sessão mais antiga representa o pacote — um único ícone.
    fillPackageStackIcon(iconStack, pkg.sessions);

    main.appendChild(title);
    main.appendChild(iconStack);

    // Options button
    const optionsBtn = createElement('button', 'options-btn', '...');

    // Package options
    const packageOptions = createElement('div', 'package-options hidden');

    if (isAccess) {
        const abortBtn = createElement('button', 'abort-package-access-btn');
        abortBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
            </svg>
        `;
        abortBtn.appendChild(createElement('span', '', 'Encerrar'));
        packageOptions.appendChild(abortBtn);
    } else {
        // Share button
        const shareBtn = createElement('button', 'share-package-btn');
        shareBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v13"></path>
                <path d="m16 6-4-4-4 4"></path>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            </svg>
        `;
        shareBtn.appendChild(createElement('span', '', 'Compartilhar'));

        // Edit button
        const editBtn = createElement('button', 'edit-package-btn');
        editBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
            </svg>
        `;
        editBtn.appendChild(createElement('span', '', 'Editar'));

        // Delete button
        const deleteBtn = createElement('button', 'delete-package-btn');
        deleteBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
        `;
        deleteBtn.appendChild(createElement('span', '', 'Excluir'));

        // Update (refresh) button
        const updateBtn = createElement('button', 'update-package-btn');
        updateBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M8 16H3v5"></path>
            </svg>
        `;
        updateBtn.appendChild(createElement('span', '', 'Atualizar'));

        packageOptions.appendChild(updateBtn);
        packageOptions.appendChild(shareBtn);
        packageOptions.appendChild(editBtn);
        packageOptions.appendChild(deleteBtn);
    }

    container.appendChild(main);
    container.appendChild(optionsBtn);
    container.appendChild(packageOptions);

    // Inactive badge (⚠️) quando isActive === false
    if (pkg.isActive === false) {
        const inactiveBadge = createElement('div', 'inactive-badge');
        inactiveBadge.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
                <path d="M12 9v4"/>
                <path d="M12 17h.01"/>
            </svg>
        `;
        container.appendChild(inactiveBadge);
    }

    return container;
}

// Gera o elemento DOM de uma sessão (grid card para ambas as views)
function createSessionElement(session, isCollection = true, pkg = null) {
    // Access view: grid card
    if (!isCollection) {
        return createSessionCardElement(session, pkg);
    }

    // Collection view: grid card com ações de gerenciamento
    return createCollectionSessionCardElement(session, pkg);
}

// Monta a base visual comum dos cards de sessão (glow, header, status, barra de
// uso e rodapé com avatares/online). `pkg` fornece isActive + membros. Retorna
// { card, content, footer } para cada view acrescentar suas ações específicas.
function buildSessionCardBase(session, pkg, isCollection) {
    const card = createElement('div', 'session-card');
    card.dataset.sessionId = session.id;

    // Cor do serviço (glow + barra) a partir do darkPalette real da sessão.
    const pal = paletteFromSession(session);
    const c1 = pal.c1, c2 = pal.c2;
    card.style.setProperty('--card-accent', c1);
    card.style.setProperty('--card-accent-2', c2);

    // Glow radial no canto superior esquerdo (rgba inline — não depende de color-mix).
    const glow = createElement('div', 'session-card-glow');
    glow.style.background = `radial-gradient(120% 90% at 0% 0%, ${pal.glow(0.22)}, transparent 62%)`;
    card.appendChild(glow);

    const content = createElement('div', 'session-card-content');

    // Header: ícone + nome + domínio
    const header = createElement('div', 'session-card-header');

    const icon = document.createElement('img');
    icon.className = 'session-card-icon';
    icon.alt = session.name;
    AuthPackFavicon.apply(icon, { icon: session.icon, url: session.url });

    const headerText = createElement('div', 'session-card-header-text');
    const name = createElement('h3', 'session-card-name');
    name.textContent = session.name;
    const domain = createElement('p', 'session-card-domain');
    try {
        domain.textContent = new URL(session.url).hostname.replace(/^www\./, '');
    } catch {
        domain.textContent = session.url || '';
    }
    headerText.appendChild(name);
    headerText.appendChild(domain);
    header.appendChild(icon);
    header.appendChild(headerText);

    // Linha de status: pacote ativo/pausado.
    const isInactive = pkg && pkg.isActive === false;
    const status = createElement('div', 'session-card-status' + (isInactive ? ' is-inactive' : ''));
    const statusDot = createElement('span', 'session-card-status-dot');
    const statusText = createElement('span', 'session-card-status-text', isInactive ? 'Pausada' : 'Ativa');
    status.appendChild(statusDot);
    status.appendChild(statusText);

    // Barra de "uso no período" (largura definida em loadPackageStats).
    const usage = createElement('div', 'session-card-usage');
    const usageHead = createElement('div', 'session-card-usage-head');
    const usageLabel = createElement('span', 'session-card-usage-label', 'Uso no período');
    const usageValue = createElement('span', 'usage-time-text');
    usageValue.textContent = session.usageTime || '0m';
    usageHead.appendChild(usageLabel);
    usageHead.appendChild(usageValue);
    const usageBar = createElement('div', 'session-card-usage-bar');
    const usageFill = createElement('div', 'session-card-usage-fill');
    // Cor da barra = gradiente do serviço (inline, robusto).
    usageFill.style.background = `linear-gradient(90deg, ${c1}, ${c2})`;
    // Largura inicial = fração do tempo desta sessão sobre o total usado no
    // pacote no período (o quanto ela representa do todo). Se só ela foi usada,
    // 100%; dividido com outras, cada uma fica com sua parte. Para a collection,
    // loadPackageStats recalcula depois com os dados reais.
    const allMinutes = (pkg && Array.isArray(pkg.sessions) ? pkg.sessions : [session])
        .map(s => usageLabelToMinutes(s.usageTime));
    const totalMinutes = allMinutes.reduce((sum, m) => sum + m, 0);
    const myMinutes = usageLabelToMinutes(session.usageTime);
    usageFill.style.width = (myMinutes > 0 && totalMinutes > 0
        ? Math.max(4, Math.round(myMinutes / totalMinutes * 100))
        : 0) + '%';
    usageBar.appendChild(usageFill);
    usage.appendChild(usageHead);
    usage.appendChild(usageBar);

    // Rodapé: quem está usando a sessão agora (online) + contagem online.
    const footer = createElement('div', 'session-card-footer');

    // "Usando agora": avatares dos usuários online, preenchidos depois por
    // loadPackageStats (collection) / loadAccessOverview (access). Início neutro:
    // ninguém usando.
    const members = createElement('div', 'session-card-members is-empty');
    const stack = createElement('div', 'session-card-avatars');
    const membersLabel = createElement('span', 'session-card-members-label', 'ninguém usando agora');
    members.appendChild(stack);
    members.appendChild(membersLabel);

    const onlineBadge = createElement('div', 'session-online-badge');
    const onlineDot = createElement('span', 'online-dot');
    const onlineNum = createElement('span', 'online-count-num');
    onlineNum.textContent = session.onlineCount || '0';
    const onlineLabel = createElement('span', 'online-label', 'online');
    onlineBadge.appendChild(onlineDot);
    onlineBadge.appendChild(onlineNum);
    onlineBadge.appendChild(onlineLabel);

    footer.appendChild(members);
    footer.appendChild(onlineBadge);

    content.appendChild(header);
    content.appendChild(status);
    content.appendChild(usage);
    content.appendChild(footer);
    card.appendChild(content);

    return { card, content, footer };
}

// Atualiza o rodapé "usando agora" de um card: avatares dos usuários online e
// rótulo ("usando agora" / "ninguém usando agora"). `onlineUsers` traz os dados
// de avatar quando disponíveis (collection); no access view passamos só o
// `count` (sem avatares). A contagem numérica fica no badge de online ao lado.
function updateSessionUsingNow(card, onlineUsers = [], count = null) {
    const members = card.querySelector('.session-card-members');
    if (!members) return;

    const total = count != null ? count : onlineUsers.length;

    const stack = members.querySelector('.session-card-avatars');
    if (stack) {
        stack.innerHTML = '';
        onlineUsers.slice(0, 4).forEach(u => {
            const av = document.createElement('img');
            av.className = 'session-card-avatar';
            av.alt = u.name || '';
            if (u.picture) av.src = u.picture;
            av.onerror = function () { this.style.visibility = 'hidden'; };
            stack.appendChild(av);
        });
    }

    const label = members.querySelector('.session-card-members-label');
    if (label) label.textContent = total > 0 ? 'usando agora' : 'ninguém usando agora';

    members.classList.toggle('is-empty', total <= 0);
}

// Gera o elemento DOM de uma sessão como card de grid (para collection view)
// Inclui: botão ⋯ (session-options), avatares, barra de uso, botão "Ver detalhes"
function createCollectionSessionCardElement(session, pkg) {
    const { card, footer } = buildSessionCardBase(session, pkg, true);

    // Botão de 3 pontinhos (canto superior direito)
    const optionsBtn = createElement('button', 'session-options-btn', '⋯');
    card.appendChild(optionsBtn);

    // Session Options Dropdown
    const sessionOptions = createElement('div', 'session-options hidden');

    const connectOptBtn = createElement('button', 'connect-session-btn');
    connectOptBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
        </svg>
        <span>Conectar</span>
    `;

    const editOptBtn = createElement('button', 'edit-session-btn');
    editOptBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
        </svg>
        <span>Editar</span>
    `;

    const deleteOptBtn = createElement('button', 'delete-session-btn');
    deleteOptBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
        <span>Excluir</span>
    `;

    sessionOptions.appendChild(connectOptBtn);
    sessionOptions.appendChild(editOptBtn);
    sessionOptions.appendChild(deleteOptBtn);
    card.appendChild(sessionOptions);

    // Ação principal: ver detalhes da sessão.
    const detailsBtn = createElement('button', 'details-btn', 'Ver detalhes');
    footer.appendChild(detailsBtn);

    return card;
}

// Card "Adicionar sessão": mesma silhueta de um session-card, mas como tile de ação.
// Abre o #addSessionModal (captura em segundo plano → cria a sessão no pacote). Presente
// só na collection view (dono), sempre como primeiro card do grid — inclusive quando o
// pacote ainda não tem nenhuma sessão, para que a seção nunca fique vazia.
function createAddSessionCardElement(pkg) {
    const card = createElement('div', 'session-card add-session-card add-session-btn');
    card.dataset.packageId = pkg.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const content = createElement('div', 'session-card-content add-session-content');

    const plus = createElement('div', 'add-session-plus');
    plus.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"></path>
            <path d="M12 5v14"></path>
        </svg>
    `;

    const title = createElement('h3', 'add-session-title', 'Adicionar sessão');
    const subtitle = createElement('p', 'add-session-subtitle', 'Capture um serviço para compartilhar com o time');

    content.appendChild(plus);
    content.appendChild(title);
    content.appendChild(subtitle);
    card.appendChild(content);

    return card;
}

// Gera o elemento DOM de uma sessão como card de grid (para access view)
function createSessionCardElement(session, pkg) {
    const { card, footer } = buildSessionCardBase(session, pkg, false);

    const connectBtn = createElement('button', 'connect-session-btn', 'Conectar');
    footer.appendChild(connectBtn);

    return card;
}

// Gera o elemento DOM de um usuário conectado
function createUserElement(user, suspended = false) {
    const container = document.createElement('div');
    container.className = 'list-item user';
    container.dataset.userId = user.id;

    // INFO WRAPPER
    const info = document.createElement('div');
    info.className = 'item-info';

    // PROFILE PICTURE
    const pictureWrapper = document.createElement('div');
    pictureWrapper.className = 'profile-picture';

    const img = document.createElement('img');
    img.src = user.picture || '';
    pictureWrapper.appendChild(img);

    // USER NAME
    const nameEl = document.createElement('div');
    nameEl.className = 'item-name';
    nameEl.textContent = user.name;

    info.appendChild(pictureWrapper);
    info.appendChild(nameEl);

    // Criador do pacote: tag "Criador" ao lado do nome.
    if (user.isCreator) {
        const creatorTag = createElement('span', 'creator-tag', 'Criador');
        info.appendChild(creatorTag);
    }

    // Suspenso (acima do limite do plano): esmaece a linha e sinaliza "sem acesso".
    if (suspended) {
        container.classList.add('suspended');
        info.appendChild(createElement('span', 'suspended-tag', 'sem acesso'));
    }

    // ACTIONS wrapper (remove btn + details btn)
    const actions = createElement('div', 'item-actions');

    // REMOVE BUTTON (inside management-actions) — o criador não pode ser removido do pacote.
    if (!user.isCreator) {
        const managementActions = createElement('div', 'management-actions');
        const removeBtn = createElement('div', 'remove-user-access-btn actionBtn');
        removeBtn.title = 'Remover';
        removeBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round"
                                class="lucide lucide-user-minus-icon lucide-user-minus">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="22" x2="16" y1="11" y2="11" />
                            </svg>
        `;
        managementActions.appendChild(removeBtn);
        actions.appendChild(managementActions);
    }

    // See details Button
    const seeDetailsBtn = createElement('button', 'btn btn-small details-btn', 'Ver detalhes');
    actions.appendChild(seeDetailsBtn);

    // STATUS LABEL (.item-details) — always present, updated by loadPackageStats
    const itemDetails = createElement('div', 'item-details');
    const lastSeenAt = createElement('span', 'last-seen-at', '');
    itemDetails.appendChild(lastSeenAt);

    // APPEND EVERYTHING
    container.appendChild(info);
    container.appendChild(actions);
    container.appendChild(itemDetails);

    return container;
}

function createUserAccessHistoryTable(data) {
    // Seleciona o tbody da tabela
    const tableBody = document.querySelector('.userAccessHistory .table-body');
    // Limpa o conteúdo atual do tbody
    tableBody.innerHTML = '';

    // Itera sobre os dados e cria as linhas
    data.forEach(item => {
        // Cria a linha
        const row = document.createElement('div');
        row.className = 'table-row';

        // Cria a coluna de data
        const dateCol = document.createElement('div');
        dateCol.className = 'table-col';
        dateCol.textContent = item.dateLabel;

        // Cria a coluna de serviço (sessão)
        const serviceCol = document.createElement('div');
        serviceCol.className = 'table-col';

        const serviceBadge = document.createElement('div');
        serviceBadge.className = 'service-badge';

        const serviceIcon = document.createElement('div');
        serviceIcon.className = 'service-icon';

        const img = document.createElement('img');
        img.alt = '';
        AuthPackFavicon.apply(img, { icon: item.session.icon, url: item.session.url });

        const serviceName = document.createElement('span');
        serviceName.textContent = item.session.name;

        serviceIcon.appendChild(img);
        serviceBadge.appendChild(serviceIcon);
        serviceBadge.appendChild(serviceName);
        serviceCol.appendChild(serviceBadge);

        // Cria a coluna de tempo
        const timeCol = document.createElement('div');
        timeCol.className = 'table-col';
        timeCol.textContent = item.usageTime;

        // Adiciona as colunas à linha
        row.appendChild(dateCol);
        row.appendChild(serviceCol);
        row.appendChild(timeCol);

        // Adiciona a linha ao tbody
        tableBody.appendChild(row);
    });
}

function createSessionAccessHistoryTable(data) {
    // Seleciona o tbody da tabela
    const tableBody = document.querySelector('.sessionAccessHistory .table-body');

    // Limpa o conteúdo atual do tbody
    tableBody.innerHTML = '';

    // Itera sobre os dados e cria as linhas
    data.forEach(item => {
        // Cria a linha
        const row = document.createElement('div');
        row.className = 'table-row';

        // Cria a coluna de data
        const dateCol = document.createElement('div');
        dateCol.className = 'table-col';
        dateCol.textContent = item.dateLabel;

        // Cria a coluna de usuário
        const userCol = document.createElement('div');
        userCol.className = 'table-col';

        const serviceBadge = document.createElement('div');
        serviceBadge.className = 'service-badge';

        const serviceIcon = document.createElement('div');
        serviceIcon.className = 'service-icon';

        const img = document.createElement('img');
        img.src = item.user.picture;
        img.alt = '';

        const userName = document.createElement('span');
        userName.textContent = item.user.name;

        serviceIcon.appendChild(img);
        serviceBadge.appendChild(serviceIcon);
        serviceBadge.appendChild(userName);
        userCol.appendChild(serviceBadge);

        // Cria a coluna de tempo
        const timeCol = document.createElement('div');
        timeCol.className = 'table-col';
        timeCol.textContent = item.usageTime;

        // Adiciona as colunas à linha
        row.appendChild(dateCol);
        row.appendChild(userCol);
        row.appendChild(timeCol);

        // Adiciona a linha ao tbody
        tableBody.appendChild(row);
    });
}

// ============================================================================
// FUNÇÕES DE RENDERIZAÇÃO
// ============================================================================

// Verifica se o pacote pertence à coleção do usuário
function isUserCollection(packageId) {
    return packagesList.userCollection.some(pkg => pkg.id === packageId);
}

// Renderiza os pacotes em um container
function renderPackages(packages, containerSelector, isAccess = false) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    // Preserva os botões de scroll se existirem
    const scrollBtns = Array.from(container.querySelectorAll('.scroll-btn'));

    // Limpa o container
    container.innerHTML = '';

    // Adiciona primeiro botão de scroll se existir
    if (scrollBtns[0]) {
        container.appendChild(scrollBtns[0]);
    }

    // Adiciona os pacotes
    packages.forEach(pkg => {
        const packageElement = createPackageElement(pkg, isAccess);
        container.appendChild(packageElement);
    });

    // Adiciona segundo botão de scroll se existir
    if (scrollBtns[1]) {
        container.appendChild(scrollBtns[1]);
    }
}

// Renderiza os detalhes de um pacote
async function renderPackageDetails(pkg, isCollection = true) {
    const contentCard = document.querySelector('#package-details');
    contentCard.dataset.packageId = pkg.id;

    // Altera o estado do content-card
    setElementState(contentCard, isCollection ? 'collection' : 'access');

    // Seleciona o preset correto
    const presetSelector = isCollection ? '.preset-collection' : '.preset-access';
    const activePreset = contentCard.querySelector(presetSelector);
    if (!activePreset) return;

    // Gerencia estado inativo do pacote
    const isInactive = pkg.isActive === false;

    // Remove badges/alertas anteriores
    activePreset.querySelector('.inactive-alert-note')?.remove();

    if (isInactive) {
        activePreset.classList.add('package-inactive');

        // Access view: banner de alerta full-width
        if (!isCollection) {
            const alertNote = createElement('div', 'inactive-alert-note');
            alertNote.innerHTML = `
                <div class="inactive-alert-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
                        <path d="M12 9v4"/>
                        <path d="M12 17h.01"/>
                    </svg>
                </div>
                <span>Seu acesso a este pacote está pausado temporariamente.</span>
            `;
            activePreset.insertBefore(alertNote, activePreset.firstChild);
        }
    } else {
        activePreset.classList.remove('package-inactive');
    }

    // Atualiza título (collection usa o .header-top; access é montado abaixo)
    const title = activePreset.querySelector('.header-top h2');
    if (title) title.textContent = pkg.name;

    // Contagem de sessões ao lado do título (collection)
    const sessionsCountEl = activePreset.querySelector('.pkg-sessions-count');
    if (sessionsCountEl) {
        const n = (pkg.sessions || []).length;
        sessionsCountEl.textContent = `${n} ${n === 1 ? 'sessão' : 'sessões'}`;
    }

    // Reinicia a busca de sessões ao trocar de pacote
    resetSessionSearch();

    // Contador de pessoas do pacote (top bar da coleção, ao lado de "Compartilhar")
    if (isCollection) updatePackagePeopleCounter(pkg);

    // Header da aba "Meus acessos": referencia a vitrine de origem (com
    // identidade, contatos e descrição) ou, no acesso direto/compartilhado,
    // uma estética neutra focada em quem compartilhou.
    if (!isCollection) {
        renderAccessHeader(pkg, activePreset);
    }

    // Atualiza data de criação
    const date = new Date(pkg.createdAt);
    const dateFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

    if (isCollection) {
        const createdAt = activePreset.querySelector('.header-top .created-at-label');
        const dateLabel = `Criado em ${date.toLocaleDateString('pt-BR', dateFormatOptions)}`;
        if (createdAt) createdAt.textContent = dateLabel;
    }


    // Renderiza sessões
    const sessionsPanelContainer = activePreset.querySelector(".sessions-panel-container");

    // Na collection (dono) o card "Adicionar sessão" mora sempre no grid, então a seção nunca
    // fica vazia — mostramos o content-state mesmo sem sessões. Na access view mantém o vazio.
    if (isCollection || pkg.sessions.length > 0) {
        setElementState(sessionsPanelContainer, "content");
    } else {
        setElementState(sessionsPanelContainer, "empty");
    }

    // Seleciona container correto: grid para ambas as views
    const sessionsContainer = activePreset.querySelector('.sessions-panel .sessions-grid');

    if (sessionsContainer && pkg.sessions) {
        sessionsContainer.innerHTML = '';
        // Dono: card de adicionar como primeiro item, sempre presente.
        if (isCollection) {
            sessionsContainer.appendChild(createAddSessionCardElement(pkg));
        }
        pkg.sessions.forEach(session => {
            const sessionElement = createSessionElement(session, isCollection, pkg);
            sessionsContainer.appendChild(sessionElement);
        });
        // Recolhe a grade para uma linha; mostra o botão "Ver todas" se transbordar.
        setupSessionsExpansion(sessionsContainer);
    }

    // Se inativo na access view: desabilita botões de conectar
    if (isInactive && !isCollection) {
        const connectBtns = activePreset.querySelectorAll('.connect-session-btn');
        connectBtns.forEach(btn => {
            btn.disabled = true;
        });
    }

    // Busca overview do pacote (para access view: joinedAt, renewsAt, online counts)
    if (!isCollection) {
        loadAccessOverview(pkg, activePreset);
    }

    // Renderiza usuários

    if (isCollection && pkg.users) {
        const usersPanelContainer = activePreset.querySelector(".users-panel-container");
        const usersList = usersPanelContainer.querySelector(".scrollable-list");

        if (pkg.users.length === 0) {
            setElementState(usersPanelContainer, "empty");
        } else {
            setElementState(usersPanelContainer, "content");
        }

        usersList.innerHTML = "";

        // Criador sempre no topo (a ordem do JSON_ARRAYAGG não é garantida).
        const orderedUsers = [...pkg.users].sort((a, b) => (b.isCreator ? 1 : 0) - (a.isCreator ? 1 : 0));
        const suspendedKeys = getSuspendedMembershipKeys();
        orderedUsers.forEach(user => {
            const suspended = suspendedKeys.has(pkg.id + ':' + user.id);
            const userElement = createUserElement(user, suspended);
            usersList.appendChild(userElement);
        })
    }

    // Renderiza estatísticas (apenas para collection)
    if (isCollection) {
        // Os cards de métricas foram removidos do layout; o container pode não existir.
        const packageStatsContainer = activePreset.querySelector(".package-stats-container");
        if (packageStatsContainer) setElementState(packageStatsContainer, "loading");

        const packageUsageChart = activePreset.querySelector(".usage-chart-container .chart-wrapper");
        setElementState(packageUsageChart, "loading");

        // Obtém o período selecionado
        const periodSelected = activePreset.querySelector(".usage-chart-container .chart-period-select option:checked").value;
        const period = periodSelected === "today" ? 0 : (periodSelected === "7days" ? 7 : 30);
        loadPackageStats(pkg, period);
    }

}

// ============================================================================
// HEADER DA ABA "MEUS ACESSOS"
// ============================================================================

// Ícones (inline) usados no header de acessos.
const ACCESS_ICONS = {
    package: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/></svg>`,
    verified: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4 5v6c0 5.5 3.8 9.7 8 11 4.2-1.3 8-5.5 8-11V5l-8-3z" opacity=".16"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    arrowUpRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>`,
    calendar: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`,
    refresh: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
    link: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    whatsapp: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.52 0-3.01-.41-4.3-1.18l-.31-.18-3.12.82.83-3.04-.2-.32a8.21 8.21 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.24 3.69 8.24 8.23s-3.71 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01s-.43.06-.66.31c-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.28z"/></svg>`,
    telegram: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#229ED9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
    instagram: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E1306C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
    site: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
};

// Paletas determinísticas para avatares com inicial (sem imagem).
const ACCESS_AVATAR_PALETTES = [
    ['#60a5fa', '#2563eb'], ['#34d399', '#059669'], ['#f59e0b', '#b45309'],
    ['#a78bfa', '#7c3aed'], ['#f472b6', '#be185d'], ['#22d3ee', '#0e7490'],
];

// Escapa texto para inserção segura via innerHTML (conteúdo e atributos).
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function accessPalette(name) {
    const key = (name || '?').trim();
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i)) % ACCESS_AVATAR_PALETTES.length;
    return ACCESS_AVATAR_PALETTES[hash];
}

// Avatar com fallback de inicial em gradiente. Se a imagem falhar, o onerror
// remove o <img> e a inicial (renderizada atrás) reaparece.
function accessAvatar(name, url, className) {
    const [c1, c2] = accessPalette(name);
    const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
    const img = url
        ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(name || '')}" onerror="this.remove()">`
        : '';
    return `<span class="${className} ph-avatar" style="background:linear-gradient(150deg, ${c1}, ${c2})"><span class="ph-avatar-initial">${escapeHtml(initial)}</span>${img}</span>`;
}

function accessContactPill(href, icon, label) {
    return `<a class="ph-pill" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow">${icon}${label}</a>`;
}

// Linha de canais de suporte da vitrine. Retorna '' quando não há contatos.
function renderAccessContacts(contacts) {
    if (!contacts) return '';
    const items = [];
    if (contacts.whatsapp) items.push(accessContactPill(`https://wa.me/${encodeURIComponent(contacts.whatsapp)}`, ACCESS_ICONS.whatsapp, 'WhatsApp'));
    if (contacts.telegram) items.push(accessContactPill(`https://t.me/${encodeURIComponent(contacts.telegram)}`, ACCESS_ICONS.telegram, 'Telegram'));
    if (contacts.instagram) items.push(accessContactPill(`https://instagram.com/${encodeURIComponent(contacts.instagram)}`, ACCESS_ICONS.instagram, 'Instagram'));
    if (contacts.website) items.push(accessContactPill(contacts.website, ACCESS_ICONS.site, 'Site'));
    if (!items.length) return '';
    return `<div class="ph-contacts"><span class="ph-contacts-label">Suporte:</span>${items.join('')}</div>`;
}

// Monta o header de um pacote na aba "Meus acessos". Os valores assíncronos
// (online / entrou em / renova em) são preenchidos depois por loadAccessOverview.
function renderAccessHeader(pkg, activePreset) {
    const header = activePreset.querySelector('.package-info-header');
    if (!header) return;

    const fromVitrine = pkg.accessOrigin === 'product' && pkg.vitrine;
    header.className = 'package-info-header ' + (fromVitrine ? 'is-vitrine' : 'is-direct');

    const name = escapeHtml(pkg.name || '');
    const desc = pkg.description
        ? `<p class="ph-desc">${escapeHtml(pkg.description)}</p>`
        : '';
    const onlineTag = `<span class="ph-online"><span class="ph-online-dot"></span><span class="online-count-value">0 online</span></span>`;
    const joinedItem = `<span class="ph-meta-item">${ACCESS_ICONS.calendar} Entrou em <strong class="joined-at-value">—</strong></span>`;

    if (fromVitrine) {
        const v = pkg.vitrine;
        const verified = v.verified
            ? `<span class="ph-verified">${ACCESS_ICONS.verified} Verificada</span>`
            : '';
        const link = v.is_published
            ? `<a class="ph-vitrine-link" href="/pages/vitrine/?loja=${encodeURIComponent(v.id)}">Ver vitrine ${ACCESS_ICONS.arrowUpRight}</a>`
            : '';
        const renewsItem = `<span class="ph-meta-item">${ACCESS_ICONS.refresh} <span class="renews-at-label">Renova em</span> <strong class="renews-at-value">—</strong></span>`;

        header.innerHTML = `
            <div class="ph-vitrine-band">
                <div class="ph-vitrine-id">
                    ${accessAvatar(v.display_name, v.avatar_url, 'ph-vitrine-avatar')}
                    <div class="ph-vitrine-meta">
                        <span class="ph-eyebrow">Adquirido na vitrine</span>
                        <div class="ph-vitrine-name-row">
                            <span class="ph-vitrine-name">${escapeHtml(v.display_name || '')}</span>
                            ${verified}
                        </div>
                    </div>
                </div>
                ${link}
            </div>
            ${renderAccessContacts(v.contacts)}
            <div class="ph-hero">
                <div class="ph-hero-top">
                    <div class="ph-hero-title">
                        <span class="ph-pkg-icon">${ACCESS_ICONS.package}</span>
                        <h2>${name}</h2>
                    </div>
                    ${onlineTag}
                </div>
                ${desc}
                <div class="ph-meta">
                    ${joinedItem}
                    ${renewsItem}
                </div>
            </div>
        `;
    } else {
        const owner = pkg.owner || {};
        const sharedBy = `
            <span class="ph-meta-item ph-shared-by">Compartilhado por
                <span class="ph-shared-who">${accessAvatar(owner.name, owner.picture, 'ph-shared-avatar')}<strong>${escapeHtml(owner.name || '—')}</strong></span>
            </span>`;

        header.innerHTML = `
            <div class="ph-direct-band">
                ${ACCESS_ICONS.link}
                <span>Acesso compartilhado diretamente com você — fora de uma vitrine.</span>
            </div>
            <div class="ph-hero">
                <div class="ph-hero-top">
                    <div class="ph-hero-title">
                        <span class="ph-pkg-icon ph-pkg-icon--muted">${ACCESS_ICONS.package}</span>
                        <h2>${name}</h2>
                    </div>
                    ${onlineTag}
                </div>
                ${desc}
                <div class="ph-meta">
                    ${sharedBy}
                    ${joinedItem}
                </div>
            </div>
        `;
    }
}

// Seleciona um pacote
function selectPackage(packageId, isCollection = true) {
    // Remove seleção anterior
    document.querySelectorAll('.access-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Adiciona seleção ao novo pacote
    const packageElement = document.querySelector(`${isCollection ? '.preset-collection' : '.preset-access'} [data-package-id="${packageId}"]`);
    if (packageElement) {
        packageElement.classList.add('selected');
    }

    // Move a tela para a screen primary
    const screensContainer = document.querySelector('#package-details .preset-collection .screens-container');
    if (screensContainer.classList.contains("show-next-screen")) {
        screensContainer.classList.remove("show-next-screen");
        const primaryScreenSection = screensContainer.querySelector('.screen-section.primary');

        setElementState(primaryScreenSection, "content");

        screensContainer.addEventListener("transitionend", () => {
            const secondaryScreenSection = screensContainer.querySelector('.screen-section.secondary');
            setElementState(secondaryScreenSection, "none");
        }, { once: true });
    }

    // Encontra o pacote nos dados
    const pkg = (isCollection ? packagesList.userCollection : packagesList.userAccess)
        .find(p => p.id === packageId);

    if (pkg) {
        renderPackageDetails(pkg, isCollection);
    }
}

// Função para alterar estado
function setElementState(element, newState) {
    // Remove todas as classes que terminam com "-state"
    element.classList.forEach(cls => {
        if (cls.endsWith("-state")) element.classList.remove(cls);
    });

    // Adiciona o novo estado
    element.classList.add(`${newState}-state`);

    // Coleção vazia: o onboarding já cobre CTA + modelos, então o
    // #package-details ("Nada por aqui / Selecione um pacote") não deve
    // aparecer — só o onboarding. Sincroniza sempre que a lista muda de estado.
    if (element.id === "packages-list") syncPackageDetailsVisibility();
}

// Esconde o #package-details quando a coleção está vazia (estado de onboarding).
function syncPackageDetailsVisibility() {
    const packagesEl = document.querySelector("#packages-list");
    const detailsEl = document.querySelector("#package-details");
    const onboardingEl = document.querySelector("#main-onboarding");
    if (!packagesEl || !detailsEl) return;
    const isEmptyCollection = packagesEl.classList.contains("empty-collection-state");
    detailsEl.style.display = isEmptyCollection ? "none" : "";
    // O onboarding (hero de primeiro pacote) só aparece quando a coleção está vazia.
    if (onboardingEl) onboardingEl.style.display = isEmptyCollection ? "" : "none";
}

// Função para recarregar select de pacotes (se necessário)
function reloadPackagesSelect(isAccess = false) {
    if (isAccess) {
        // Se não houver pacotes de acesso, seta estado vazio
        if (packagesList.userAccess.length === 0) {
            setElementState(document.querySelector("#packages-list"), 'empty-access');
            setElementState(document.querySelector("#package-details"), 'empty');
        } else {
            selectPackage(packagesList.userAccess[0].id, false);
        }
    } else {
        // Se não houver pacotes na coleção, seta estado vazio
        if (packagesList.userCollection.length === 0) {
            setElementState(document.querySelector("#packages-list"), 'empty-collection');
            setElementState(document.querySelector("#package-details"), 'empty');
        } else {
            selectPackage(packagesList.userCollection[0].id);
        }
    }
}

async function loadAccessOverview(pkg, activePreset) {
    try {
        const fetchOverview = await fetchManager.getPackageAccessOverview({ id: pkg.id });

        if (!fetchOverview.ok) return;

        const { totalOnline, sessionsOnline, joinedAt, renewsAt, billingType } = fetchOverview.result.data;

        // Verifica se ainda é o pacote selecionado
        const contentCard = document.querySelector('#package-details');
        if (contentCard.dataset.packageId !== pkg.id) return;

        const dateFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

        // Atualiza "Entrou em"
        const joinedAtEl = activePreset.querySelector('.package-info-header .joined-at-value');
        if (joinedAtEl && joinedAt) {
            const joinDate = new Date(joinedAt);
            joinedAtEl.textContent = joinDate.toLocaleDateString('pt-BR', dateFormatOptions);
        } else if (joinedAtEl) {
            joinedAtEl.textContent = '—';
        }

        // Atualiza "Renova em" / "Expira em" (só existe no header de vitrine)
        const renewsAtEl = activePreset.querySelector('.package-info-header .renews-at-value');
        const renewsLabelEl = activePreset.querySelector('.package-info-header .renews-at-label');

        if (renewsLabelEl) {
            renewsLabelEl.textContent = billingType === 'one_time' ? 'Expira em' : 'Renova em';
        }

        if (renewsAtEl && renewsAt) {
            const renewDate = new Date(renewsAt);
            renewsAtEl.textContent = renewDate.toLocaleDateString('pt-BR', dateFormatOptions);
        } else if (renewsAtEl) {
            renewsAtEl.textContent = '—';
        }

        // Atualiza contagem online no header
        const onlineCountEl = activePreset.querySelector('.package-info-header .online-count-value');
        if (onlineCountEl) {
            onlineCountEl.textContent = `${totalOnline} online`;
        }

        // Atualiza badges + rodapé "usando agora" em cada session card. O access
        // view só recebe a contagem online (sem dados de avatar), então o rótulo
        // é atualizado pelo count.
        if (sessionsOnline) {
            const sessionCards = activePreset.querySelectorAll('.session-card');
            sessionCards.forEach(card => {
                const sessionId = card.dataset.sessionId;
                const count = sessionsOnline[sessionId] || 0;
                const badge = card.querySelector('.online-count-num');
                if (badge) badge.textContent = count;
                updateSessionUsingNow(card, [], count);
            });
        }
    } catch (err) {
        console.error('Error loading access overview:', err);
    }
}

async function loadPackageStats(pkg, period) {
    const contentPreset = document.querySelector('#package-details .preset-collection');

    // Escopo restrito ao container de métricas (já removido do layout). As
    // classes .users-stat/.sessions-stat também existem nas telas de overview,
    // por isso a busca é feita dentro de .package-stats para não colidir.
    const usesStat = contentPreset.querySelector(".package-stats .uses-stat");
    const sessionsStat = contentPreset.querySelector(".package-stats .sessions-stat");
    const usersStat = contentPreset.querySelector(".package-stats .users-stat");

    if (!pkg.stats) {
        // Busca estatísticas e salva em cache
        const fetchPackageOverviewStats = await fetchManager.getPackageOverviewStats({ id: pkg.id });

        if (fetchPackageOverviewStats.ok) {
            const { usersLastUsage, newUsersByDate, rawPackageAccessHistory } = fetchPackageOverviewStats.result.data;

            const accessHistory = processRawAccessHistory(rawPackageAccessHistory);
            const sessionsHistoryUsage = getSessionsUsageTime(accessHistory);
            const packageHistoryUsage = getPackageHistoryUsage(accessHistory);
            const dailyPackageUsage = getDailyPackageUsage(accessHistory);

            pkg.stats = {
                totalSessions: pkg.sessions.length,
                totalConnections: rawPackageAccessHistory.length,
                totalUsers: pkg.users.length,
                totalUsersOnline: 0,
                sessionsOnline: {},
                sessionsOnlineUsers: {},
                sessionsHistoryUsage,
                packageHistoryUsage,
                dailyPackageUsage,
                newUsersByDate,
                accessHistory
            };

            for (const userId in usersLastUsage) {
                // Procura em pkg.users o usuario que tem o id especifico, e adiciona a data de ultima utilização
                const user = pkg.users.find(u => u.id === userId);
                if (user) {
                    const timestamp = usersLastUsage[userId];
                    const dateObj = new Date(timestamp.replace(' ', 'T'));

                    user.lastUsage = formatLocalDateTime(dateObj);

                    const now = new Date();
                    const diffInSeconds = Math.floor((now - dateObj) / 1000);

                    if (diffInSeconds < 60) {
                        pkg.stats.totalUsersOnline++;
                    }
                }
            }

            // Calcula sessionsOnline a partir do accessHistory
            // Percorre todos os registros buscando acessos nos últimos 60 segundos
            // Usa Set para deduplicar por userId (mesmo usuário reconectando não conta 2x)
            const now = new Date();
            const sessionsOnlineUsers = {}; // sessionId -> Set<userId>
            Object.values(accessHistory).forEach(dayAccesses => {
                dayAccesses.forEach(access => {
                    const accessDate = new Date(access.localDateTime);
                    const endTime = new Date(accessDate.getTime() + (access.usageTimeSeconds || 0) * 1000);
                    const diffInSec = Math.floor((now - endTime) / 1000);

                    if (diffInSec < 60 && diffInSec >= 0) {
                        if (!sessionsOnlineUsers[access.sessionId]) {
                            sessionsOnlineUsers[access.sessionId] = new Set();
                        }
                        sessionsOnlineUsers[access.sessionId].add(access.userId);
                    }
                });
            });
            // Converte Sets para contagem + lista de usuários únicos por sessão
            // (a lista alimenta os avatares de "usando agora" no rodapé do card).
            for (const sessionId in sessionsOnlineUsers) {
                pkg.stats.sessionsOnline[sessionId] = sessionsOnlineUsers[sessionId].size;
                pkg.stats.sessionsOnlineUsers[sessionId] = Array.from(sessionsOnlineUsers[sessionId]);
            }
        }
    }

    const contentCard = document.querySelector('#package-details');
    const currentPackageId = contentCard.getAttribute('data-package-id');

    // Verifica se o statsGrid pertence ao pacote atualmente selecionado
    if (pkg.id !== currentPackageId) {
        return; // Sai da função se não for o pacote correto
    }

    // Crescimento de novos usuários no período — usado no sublabel do card de Usuários
    const newUsersFiltered = filterByLastDays(pkg.stats.newUsersByDate, period);
    const newUsersCount = Object.values(newUsersFiltered).reduce((acc, curr) => acc + curr, 0);

    const totalUsers = pkg.stats ? pkg.stats.totalUsers : 0;
    const previousUsersCount = totalUsers - newUsersCount;
    let percentageIncrease = "∞";

    if (previousUsersCount > 0) {
        percentageIncrease = ((newUsersCount / previousUsersCount) * 100).toFixed(0);
    } else if (newUsersCount === 0) {
        percentageIncrease = "0";
    }

    // Os cards de métricas (Usos/Usuários/Sessões/Online) foram removidos do
    // layout. Atualiza apenas se ainda existirem (compatibilidade defensiva).

    // Uses stats (total de conexões no histórico do pacote)
    if (usesStat) {
        const usesValue = usesStat.querySelector(".stat-metric-value");
        const usesSub = usesStat.querySelector(".stat-metric-sublabel");
        usesValue.textContent = String(pkg.stats ? pkg.stats.totalConnections : 0);
        usesSub.textContent = "";
    }

    // Sessions stats
    if (sessionsStat) {
        const sessionsValue = sessionsStat.querySelector(".stat-metric-value");
        const sessionsSub = sessionsStat.querySelector(".stat-metric-sublabel");
        const totalSessions = pkg.stats ? pkg.stats.totalSessions : 0;
        sessionsValue.textContent = String(totalSessions);
        sessionsSub.textContent = "";
    }

    // Users stats (+ crescimento no sublabel, em verde)
    if (usersStat) {
        const usersValue = usersStat.querySelector(".stat-metric-value");
        const usersSub = usersStat.querySelector(".stat-metric-sublabel");
        usersValue.textContent = String(totalUsers);
        const growthHtml = `<span class="stat-metric-growth">+${percentageIncrease}%</span>`;
        usersSub.innerHTML = growthHtml;
    }

    // Online users stat
    const onlineStat = contentPreset.querySelector(".package-stats .online-users-stat");
    if (onlineStat) {
        const onlineValue = onlineStat.querySelector(".stat-metric-value");
        const onlineSub = onlineStat.querySelector(".stat-metric-sublabel");
        onlineValue.textContent = pkg.stats ? String(pkg.stats.totalUsersOnline) : "0";
        onlineSub.textContent = "";
    }

    // Atualiza contagem online no header
    const onlineCountEl = contentPreset.querySelector('.package-info-header .online-count-value');
    if (onlineCountEl) {
        onlineCountEl.textContent = `${pkg.stats.totalUsersOnline} online`;
    }

    const packageStatsContainer = contentPreset.querySelector(".package-stats-container");
    if (packageStatsContainer) setElementState(packageStatsContainer, "content");

    // Package Usage Chart
    const packageUsageChart = contentCard.querySelector(".preset-collection .usage-chart-container .chart-wrapper");
    setElementState(packageUsageChart, "content");

    if (period === 0) {
        // Visualização diária (por hora)
        if (Object.entries(pkg.stats.dailyPackageUsage).length === 0) {
            loadUsageChart("package", {
                "00:00": {
                    "hours": -1,
                    "users": 0
                }
            }, true);
        } else {
            loadUsageChart("package", pkg.stats.dailyPackageUsage, true);
        }
    } else {
        // Visualização por período (dias)
        if (Object.entries(pkg.stats.packageHistoryUsage).length === 0) {
            loadUsageChart("package", {
                [new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })]: {
                    "hours": -1,
                    "users": 0,
                    "peak": {
                        "hour": "00:00",
                        "count": 0
                    }
                }
            });
        } else {
            const packageHistoryUsageFiltered = filterByLastDays(pkg.stats.packageHistoryUsage, period);
            loadUsageChart("package", packageHistoryUsageFiltered);
        }
    }

    // Sessions panel: atualiza usage time, barra de uso relativa e online badges
    const sessionCards = document.querySelectorAll("#package-details .preset-collection .sessions-panel .session-card");
    const sessionsHistoryUsageFiltered = filterByLastDays(pkg.stats.sessionsHistoryUsage, period);

    // Primeiro passo: calcula o tempo de cada sessão para dimensionar a barra
    // como fração do tempo total usado no pacote (o quanto cada sessão
    // representa do todo no período).
    const sessionTimes = [];
    sessionCards.forEach(card => {
        const sessionId = card.getAttribute("data-session-id");
        let sessionTime = 0;
        Object.values(sessionsHistoryUsageFiltered).forEach(daySessions => {
            if (daySessions[sessionId]) sessionTime += daySessions[sessionId];
        });
        sessionTimes.push(sessionTime);
    });
    const totalSessionTime = sessionTimes.reduce((sum, t) => sum + t, 0);

    sessionCards.forEach((card, i) => {
        const sessionId = card.getAttribute("data-session-id");
        const sessionTime = sessionTimes[i];
        const sessionTimeFormatted = formatDuration(sessionTime);

        // Atualiza o texto de usage time
        const usageTimeText = card.querySelector('.usage-time-text');
        if (usageTimeText) {
            usageTimeText.textContent = sessionTimeFormatted === "0s" ? "0m" : sessionTimeFormatted;
        }

        // Barra de uso: largura = fração desta sessão sobre o total do pacote.
        const usageFill = card.querySelector('.session-card-usage-fill');
        if (usageFill) {
            const pct = totalSessionTime > 0 && sessionTime > 0
                ? Math.max(4, Math.round((sessionTime / totalSessionTime) * 100))
                : 0;
            usageFill.style.width = pct + '%';
        }

        // Atualiza badge de online count
        const onlineCount = pkg.stats.sessionsOnline[sessionId] || 0;
        const onlineCountNum = card.querySelector('.online-count-num');
        if (onlineCountNum) {
            onlineCountNum.textContent = onlineCount;
        }

        // Rodapé "usando agora": avatares dos usuários online desta sessão.
        const onlineUserIds = (pkg.stats.sessionsOnlineUsers &&
            pkg.stats.sessionsOnlineUsers[sessionId]) || [];
        const onlineUsers = onlineUserIds
            .map(uid => pkg.users.find(u => u.id === uid))
            .filter(Boolean);
        updateSessionUsingNow(card, onlineUsers, onlineCount);
    });

    // Users panel — atualiza label de status (.item-details) para todos os usuários
    const usersEl = document.querySelectorAll("#package-details .preset-collection .users-panel .user");
    usersEl.forEach(user => {
        const userId = user.getAttribute("data-user-id");
        const pkgUser = pkg.users.find(u => u.id === userId);
        const userLastUsage = pkgUser?.lastUsage;

        const lastSeenEl = user.querySelector(".item-details .last-seen-at");
        if (!lastSeenEl) return;

        if (!userLastUsage) {
            lastSeenEl.textContent = "Nunca usou";
            return;
        }

        const userLastUsageFormatted = timeAgo(userLastUsage);
        lastSeenEl.textContent = userLastUsageFormatted;

        if (userLastUsageFormatted === "agora mesmo") {
            user.classList.add("online");
        }
    });
};

function renderUserDetails(user, pkg, period) {
    const userScreen = document.querySelector(
        "#package-details .preset-collection .screen-section.secondary .preset-user-overview"
    );

    const headerTitle = userScreen.querySelector(".header-title");
    const headerSubtitle = userScreen.querySelector(".header-subtitle");
    const profileCard = userScreen.querySelector(".profile-card");
    const profileCardIcon = profileCard.querySelector(".profile-avatar img");
    const profileTitle = profileCard.querySelector(".profile-title");
    const profileSubtitle = profileCard.querySelector(".profile-subtitle");

    // Breadcrumb: Pacote › Usuário
    headerTitle.textContent = pkg.name;
    if (headerSubtitle) headerSubtitle.textContent = user.name;
    profileCardIcon.src = user.picture;
    profileTitle.textContent = user.name;
    profileSubtitle.textContent = user.email;

    loadUserStats(user, pkg, period);
}

async function loadUserStats(user, pkg, period) {
    const accessHistoryFiltered = filterByLastDays(pkg.stats.accessHistory, period);
    const userAccessHistory = getUserAccessHistory(user.id, accessHistoryFiltered);
    const userHistoryUsage = getUserHistoryUsage(user.id, accessHistoryFiltered);
    const userTotalUsage = getUserTotalUsageTime(user.id, accessHistoryFiltered);
    const userDailyUsage = getUserDailyUsage(user.id, accessHistoryFiltered);

    user.stats = {
        historyUsage: userHistoryUsage,
        totalUsage: userTotalUsage,
        dailyUsage: userDailyUsage
    };

    console.log(userHistoryUsage);

    const userScreen = document.querySelector(
        "#package-details .preset-collection .screen-section.secondary .preset-user-overview"
    );

    // Estatísticas
    const totalUsageEl = userScreen.querySelector(".user-total-usage .stat-value");
    const lastUsageEl = userScreen.querySelector(".user-last-usage .stat-value");

    const userLastUsageFormatted = user.lastUsage ? timeAgo(user.lastUsage) : "—";

    lastUsageEl.textContent = userLastUsageFormatted;
    totalUsageEl.textContent = formatHours(user.stats.totalUsage.hours);

    // Gráfico de uso
    if (period === 0) {
        if (Object.entries(user.stats.dailyUsage).length === 0) {
            loadUsageChart("user", {
                "00:00": {
                    hours: -1,
                    users: 0
                }
            }, true);
        } else {
            loadUsageChart("user", user.stats.dailyUsage, true);
        }
    } else {
        if (Object.entries(user.stats.historyUsage).length === 0) {
            loadUsageChart("user", {
                [new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })]: {
                    hours: -1,
                    users: 0,
                    peak: {
                        hour: "00:00",
                        count: 0
                    }
                }
            });
        } else {
            const userHistoryUsageFiltered = filterByLastDays(user.stats.historyUsage, period);
            loadUsageChart("user", userHistoryUsageFiltered);
        }
    }

    // Tabela de acesso
    const tableBodyPresetsContainer = userScreen.querySelector(".table-body-presets-container");
    const userAccessHistoryByRecent = processUserAccessHistory(userAccessHistory, pkg);

    if (userAccessHistoryByRecent.length === 0) {
        setElementState(tableBodyPresetsContainer, "empty");
    } else {
        setElementState(tableBodyPresetsContainer, "content");
        createUserAccessHistoryTable(userAccessHistoryByRecent);
    }
}

function renderSessionDetails(session, pkg, period) {
    const sessionScreen = document.querySelector(
        "#package-details .preset-collection .screen-section.secondary .preset-session-overview"
    );

    const headerTitle = sessionScreen.querySelector(".header-title");
    const headerSubtitle = sessionScreen.querySelector(".header-subtitle");
    const serviceCard = sessionScreen.querySelector(".service-card");
    const sessionLogo = serviceCard.querySelector(".service-card-icon");
    const sessionName = serviceCard.querySelector(".service-name");
    const sessionDomain = serviceCard.querySelector(".service-domain");

    // Breadcrumb: Pacote › Sessão
    headerTitle.textContent = pkg.name;
    if (headerSubtitle) headerSubtitle.textContent = session.name;

    AuthPackFavicon.apply(sessionLogo, { icon: session.icon, url: session.url });
    sessionName.textContent = session.name;
    sessionDomain.textContent = new URL(session.url).hostname.replace(/^www\./, "");

    loadSessionStats(session, pkg, period);
}

async function loadSessionStats(session, pkg, period) {
    const accessHistoryFiltered = filterByLastDays(pkg.stats.accessHistory, period);
    const sessionAccessHistory = getSessionAccessHistory(session.id, accessHistoryFiltered);
    const sessionHistoryUsage = getSessionHistoryUsage(session.id, accessHistoryFiltered);
    const sessionTotalUsage = getSessionTotalUsageTime(session.id, accessHistoryFiltered);
    const sessionDistinctUsers = getSessionDistinctUsers(session.id, accessHistoryFiltered);
    const sessionDailyUsage = getDailySessionUsage(session.id, accessHistoryFiltered);

    session.stats = {
        historyUsage: sessionHistoryUsage,
        totalUsage: sessionTotalUsage,
        distinctUsers: sessionDistinctUsers,
        dailyUsage: sessionDailyUsage
    };

    const sessionScreen = document.querySelector(
        "#package-details .preset-collection .screen-section.secondary .preset-session-overview"
    );

    // Estatísticas
    const sessionTimeUsage = sessionScreen.querySelector(".session-usage-stat span");
    const sessionUsers = sessionScreen.querySelector(".users-stat span");

    sessionTimeUsage.textContent = formatHours(session.stats.totalUsage.hours);
    sessionUsers.textContent = session.stats.distinctUsers;

    // "Usando agora": usuários online nesta sessão (mesma lógica dos session
    // cards — heartbeat < 60s, calculado em loadPackageStats).
    const onlineUserIds = (pkg.stats.sessionsOnlineUsers &&
        pkg.stats.sessionsOnlineUsers[session.id]) || [];

    const usersLabel = sessionScreen.querySelector(".service-users-label");
    if (usersLabel) {
        usersLabel.textContent = onlineUserIds.length > 0 ? "Usando agora" : "Ninguém usando agora";
    }

    const usingNowListContainer = sessionScreen.querySelector(".service-users-list");
    usingNowListContainer.innerHTML = "";
    usingNowListContainer.classList.toggle("is-empty", onlineUserIds.length === 0);

    const MAX_AVATARS = 5;
    onlineUserIds.slice(0, MAX_AVATARS).forEach(userId => {
        const user = pkg.users.find(u => u.id === userId);
        if (!user) return;
        const userAvatar = createElement("img", "service-user-avatar");
        if (user.picture) userAvatar.src = user.picture;
        userAvatar.alt = user.name || "";
        userAvatar.onerror = function () { this.style.visibility = "hidden"; };
        usingNowListContainer.appendChild(userAvatar);
    });

    const extraUsers = onlineUserIds.length - MAX_AVATARS;
    if (extraUsers > 0) {
        usingNowListContainer.appendChild(createElement("div", "service-add-user", `+${extraUsers}`));
    }

    // Gráfico de uso
    if (period === 0) {
        if (Object.entries(session.stats.dailyUsage).length === 0) {
            loadUsageChart("session", {
                "00:00": {
                    hours: -1,
                    users: 0
                }
            }, true);
        } else {
            loadUsageChart("session", session.stats.dailyUsage, true);
        }
    } else {
        if (Object.entries(session.stats.historyUsage).length === 0) {
            loadUsageChart("session", {
                [new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })]: {
                    hours: -1,
                    users: 0,
                    peak: {
                        hour: "00:00",
                        count: 0
                    }
                }
            });
        } else {
            const sessionHistoryUsageFiltered = filterByLastDays(session.stats.historyUsage, period);
            loadUsageChart("session", sessionHistoryUsageFiltered);
        }
    }

    // Tabela de acesso

    const tableBodyPresetsContainer = document.querySelector(
        "#package-details .preset-collection .screen-section.secondary .preset-session-overview .table-body-presets-container"
    );

    const accessHistoryByRecent = processSessionAccessHistory(sessionAccessHistory, pkg);

    if (accessHistoryByRecent.length === 0) {
        setElementState(tableBodyPresetsContainer, "empty");
    } else {
        setElementState(tableBodyPresetsContainer, "content");
        createSessionAccessHistoryTable(accessHistoryByRecent);
    }
}

function timeAgo(date) {
    if (!date) return "—";
    const now = new Date();
    const past = new Date(date);
    if (isNaN(past.getTime())) return "—";

    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) {
        return "agora mesmo";
    }

    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) {
        return `há ${minutes} minuto${minutes > 1 ? "s" : ""}`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `há ${hours} hora${hours > 1 ? "s" : ""}`;
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
        return `há ${days} dia${days > 1 ? "s" : ""}`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
        return `há ${months} mês${months > 1 ? "es" : ""}`;
    }

    const years = Math.floor(months / 12);
    return `há ${years} ano${years > 1 ? "s" : ""}`;
}

function formatDuration(seconds) {
    seconds = Math.max(0, Math.floor(seconds));

    const units = [
        { label: "d", value: 86400 },
        { label: "h", value: 3600 },
        { label: "m", value: 60 },
        { label: "s", value: 1 }
    ];

    const parts = [];

    for (const unit of units) {
        if (seconds >= unit.value) {
            const amount = Math.floor(seconds / unit.value);
            seconds %= unit.value;
            parts.push(`${amount}${unit.label}`);
        }
        if (parts.length === 2) break;
    }

    return parts.length ? parts.join(" ") : "0s";
}

function filterByLastDays(dataByDate, days) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() - days);

    return Object.entries(dataByDate)
        .filter(([key]) => {
            const [day, month] = key.split('/');

            let date = new Date(today.getFullYear(), month - 1, day);
            date.setHours(0, 0, 0, 0);

            if (date > today) {
                date = new Date(today.getFullYear() - 1, month - 1, day);
            }

            // A data deve ser >= cutoff E <= today
            return date >= cutoff && date <= today;
        })
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
}

function formatDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatLocalDateTime(d) {
    // Formato: YYYY-MM-DDTHH:mm:ss (sem Z, representa horário local)
    const pad = v => String(v).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Função para formatar horas
function formatHours(hours) {
    if (hours === -1) {
        return '0h';
    } else if (hours >= 1) {
        return `${hours.toFixed(1)}h`;
    } else if (hours > 0) {
        const minutes = Math.round(hours * 60);
        if (minutes >= 1) {
            return `~${minutes}min`;
        } else {
            const seconds = Math.round(hours * 3600);
            return `~${seconds}s`;
        }
    } else {
        return '~30s';
    }
}



function processRawAccessHistory(rawAccessHistory) {
    const pad = v => String(v).padStart(2, '0');

    function formatDateKey(d) {
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    }

    const result = {};

    for (const rec of rawAccessHistory) {
        // parse do timestamp UTC -> Date (JS converte pra local automaticamente)
        const start = new Date(rec.connected_at);
        let remaining = Math.max(0, rec.usage_time_seconds || 0);

        // se não há tempo de uso, basta atribuir o evento ao dia local do connected_at
        if (remaining === 0) {
            const key = formatDateKey(start);
            result[key] = result[key] || [];
            result[key].push({
                accessId: rec.access_id,
                sessionId: rec.session_id,
                userId: rec.user_id,
                localDateTime: formatLocalDateTime(start),
                usageTimeSeconds: 0
            });
            continue;
        }

        // loop para dividir across-midnight se necessário
        let cursor = new Date(start); // momento atual em local
        while (remaining > 0) {
            // fim do dia local do cursor: 23:59:59.999
            const endOfDay = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 23, 59, 59, 999);
            const secondsUntilMidnight = Math.ceil((endOfDay.getTime() - cursor.getTime()) / 1000);

            const take = Math.min(remaining, secondsUntilMidnight);
            const key = formatDateKey(cursor);

            result[key] = result[key] || [];
            result[key].push({
                accessId: rec.access_id,
                sessionId: rec.session_id,
                userId: rec.user_id,
                localDateTime: formatLocalDateTime(cursor),
                usageTimeSeconds: take
            });

            remaining -= take;
            // avança o cursor para o início do próximo dia (00:00:00)
            cursor = new Date(endOfDay.getTime() + 1);
        }
    }

    return result;
}

function getSessionAccessHistory(sessionId, accessHistory) {
    const filteredHistory = {};

    // Itera sobre cada data no accessHistory
    Object.entries(accessHistory).forEach(([date, accesses]) => {
        // Filtra apenas os acessos da sessão específica
        const sessionAccesses = accesses.filter(access => access.sessionId === sessionId);

        // Se houver acessos dessa sessão nesta data, adiciona ao resultado
        if (sessionAccesses.length > 0) {
            filteredHistory[date] = sessionAccesses;
        }
    });

    return filteredHistory;
}

function getSessionsUsageTime(packageAccessHistory) {
    const sessionsHistoryUsage = {};

    Object.entries(packageAccessHistory).forEach(([date, accesses]) => {
        accesses.forEach(access => {
            const { sessionId, usageTimeSeconds, localDateTime: accessDate } = access;

            if (usageTimeSeconds === 0) {
                // Se não há tempo de uso, apenas registra no dia original
                if (!sessionsHistoryUsage[date]) {
                    sessionsHistoryUsage[date] = {};
                }
                if (!sessionsHistoryUsage[date][sessionId]) {
                    sessionsHistoryUsage[date][sessionId] = 0;
                }
                return;
            }

            // Calcular distribuição de tempo entre dias
            const startTime = new Date(accessDate);
            const endTime = new Date(startTime.getTime() + usageTimeSeconds * 1000);

            const startDay = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
            const endDay = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());

            // Se termina no mesmo dia
            if (startDay.getTime() === endDay.getTime()) {
                const dateKey = formatDate(startTime);
                if (!sessionsHistoryUsage[dateKey]) {
                    sessionsHistoryUsage[dateKey] = {};
                }
                if (!sessionsHistoryUsage[dateKey][sessionId]) {
                    sessionsHistoryUsage[dateKey][sessionId] = 0;
                }
                sessionsHistoryUsage[dateKey][sessionId] += usageTimeSeconds;
            } else {
                // Sessão atravessa dias - distribuir proporcionalmente
                let currentTime = new Date(startTime);
                let remainingTime = usageTimeSeconds;

                while (remainingTime > 0 && currentTime < endTime) {
                    const currentDayEnd = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), 23, 59, 59, 999);
                    const timeUntilMidnight = Math.min(
                        (currentDayEnd.getTime() - currentTime.getTime()) / 1000,
                        remainingTime
                    );

                    const dateKey = formatDate(currentTime);
                    if (!sessionsHistoryUsage[dateKey]) {
                        sessionsHistoryUsage[dateKey] = {};
                    }
                    if (!sessionsHistoryUsage[dateKey][sessionId]) {
                        sessionsHistoryUsage[dateKey][sessionId] = 0;
                    }
                    sessionsHistoryUsage[dateKey][sessionId] += Math.ceil(timeUntilMidnight);

                    remainingTime -= timeUntilMidnight;
                    currentTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() + 1, 0, 0, 0);
                }
            }
        });
    });

    return sessionsHistoryUsage;
}

function getPackageHistoryUsage(packageAccessHistory) {

    function iterateTouchedHours(start, end, callback) {
        const current = new Date(start);
        current.setMinutes(0, 0, 0);

        while (current < end) {
            const nextHour = new Date(current.getTime() + 3600000);
            callback(new Date(current));
            current.setTime(nextHour.getTime());
        }
    }

    const dailyData = {};

    Object.values(packageAccessHistory).flat().forEach(access => {
        const { userId, localDateTime, usageTimeSeconds } = access;

        const start = new Date(localDateTime);
        const end = usageTimeSeconds > 0
            ? new Date(start.getTime() + usageTimeSeconds * 1000)
            : new Date(start.getTime() + 1000);

        iterateTouchedHours(start, end, (hourTime) => {
            const dateKey = formatDate(hourTime);
            const hourKey = `${hourTime.getHours().toString().padStart(2, '0')}:00`;

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    totalSeconds: 0,
                    users: new Set(),
                    usersByHour: {}
                };
            }

            if (!dailyData[dateKey].usersByHour[hourKey]) {
                dailyData[dateKey].usersByHour[hourKey] = new Set();
            }

            dailyData[dateKey].users.add(userId);
            dailyData[dateKey].usersByHour[hourKey].add(userId);
        });

        if (usageTimeSeconds > 0) {
            const dateKey = formatDate(start);
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    totalSeconds: 0,
                    users: new Set(),
                    usersByHour: {}
                };
            }
            dailyData[dateKey].totalSeconds += usageTimeSeconds;
        }
    });

    const result = {};

    Object.entries(dailyData).forEach(([date, data]) => {
        let peakHour = '00:00';
        let peakCount = 0;

        Object.entries(data.usersByHour).forEach(([hour, users]) => {
            if (users.size > peakCount) {
                peakCount = users.size;
                peakHour = hour;
            }
        });

        result[date] = {
            hours: parseFloat((data.totalSeconds / 3600).toFixed(4)),
            users: data.users.size,
            peak: {
                hour: peakHour,
                count: peakCount
            }
        };
    });

    return result;
}

function getDailyPackageUsage(packageAccessHistory, currentDate = new Date()) {
    const todayKey = formatDate(currentDate);
    const hourlyData = {};

    // Processar apenas acessos da data específica
    const todayAccesses = packageAccessHistory[todayKey];

    if (!todayAccesses) {
        return {}; // Retorna vazio se não houver dados para essa data
    }

    todayAccesses.forEach(access => {
        const { userId, usageTimeSeconds, localDateTime: accessDate } = access;

        const startTime = new Date(accessDate);
        const endTime = new Date(startTime.getTime() + usageTimeSeconds * 1000);

        // Verificar se a sessão termina no mesmo dia
        const startDay = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
        const endDay = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());

        if (startDay.getTime() === endDay.getTime()) {
            // Sessão completa no mesmo dia
            const hour = startTime.getHours();
            const hourKey = `${hour.toString().padStart(2, '0')}:00`;

            if (!hourlyData[hourKey]) {
                hourlyData[hourKey] = {
                    totalSeconds: 0,
                    users: new Set()
                };
            }

            hourlyData[hourKey].totalSeconds += usageTimeSeconds;
            hourlyData[hourKey].users.add(userId);
        } else {
            // Sessão atravessa dias - contabilizar apenas a parte do dia atual
            const currentDayEnd = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), 23, 59, 59, 999);
            const timeUntilMidnight = (currentDayEnd.getTime() - startTime.getTime()) / 1000;

            const hour = startTime.getHours();
            const hourKey = `${hour.toString().padStart(2, '0')}:00`;

            if (!hourlyData[hourKey]) {
                hourlyData[hourKey] = {
                    totalSeconds: 0,
                    users: new Set()
                };
            }

            hourlyData[hourKey].totalSeconds += timeUntilMidnight;
            hourlyData[hourKey].users.add(userId);
        }
    });

    // Formatar resultado
    const result = {};
    Object.entries(hourlyData).forEach(([hour, data]) => {
        result[hour] = {
            hours: parseFloat((data.totalSeconds / 3600).toFixed(4)),
            users: data.users.size
        };
    });

    return result;
}

function getSessionHistoryUsage(sessionId, packageAccessHistory) {
    function formatDate(d) {
        const dt = new Date(d);
        const day = String(dt.getDate()).padStart(2, '0');
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const year = dt.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function iterateTouchedHours(start, end, callback) {
        const current = new Date(start);
        current.setMinutes(0, 0, 0);
        while (current < end) {
            const nextHour = new Date(current.getTime() + 3600000);
            callback(new Date(current));
            current.setTime(nextHour.getTime());
        }
    }

    const dailyData = {};

    Object.values(packageAccessHistory).flat().forEach(access => {
        if (access.sessionId !== sessionId) return;

        const { userId, localDateTime, usageTimeSeconds = 0 } = access;

        const start = new Date(localDateTime);
        const end = usageTimeSeconds > 0
            ? new Date(start.getTime() + usageTimeSeconds * 1000)
            : new Date(start.getTime() + 1000);

        iterateTouchedHours(start, end, (hourTime) => {
            const dateKey = formatDate(hourTime);
            const hourKey = `${hourTime.getHours().toString().padStart(2, '0')}:00`;

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    totalSeconds: 0,
                    users: new Set(),
                    usersByHour: {},
                    accesses: 0
                };
            }

            if (!dailyData[dateKey].usersByHour[hourKey]) {
                dailyData[dateKey].usersByHour[hourKey] = new Set();
            }

            dailyData[dateKey].users.add(userId);
            dailyData[dateKey].usersByHour[hourKey].add(userId);
        });

        const dateKeyForTotal = formatDate(start);
        if (!dailyData[dateKeyForTotal]) {
            dailyData[dateKeyForTotal] = {
                totalSeconds: 0,
                users: new Set(),
                usersByHour: {},
                accesses: 0
            };
        }
        dailyData[dateKeyForTotal].accesses += 1;
        if (usageTimeSeconds > 0) dailyData[dateKeyForTotal].totalSeconds += usageTimeSeconds;
    });

    const result = {};

    Object.entries(dailyData).forEach(([date, data]) => {
        let peakHour = '00:00';
        let peakCount = 0;
        Object.entries(data.usersByHour).forEach(([hour, users]) => {
            if (users.size > peakCount) {
                peakCount = users.size;
                peakHour = hour;
            }
        });

        result[date] = {
            hours: parseFloat((data.totalSeconds / 3600).toFixed(4)),
            accesses: data.accesses,
            users: data.users.size,
            peak: {
                hour: peakHour,
                count: peakCount
            }
        };
    });

    return result;
}

function getSessionTotalUsageTime(sessionId, packageAccessHistory) {
    let totalSeconds = 0;
    let noAccessFound = true;

    Object.values(packageAccessHistory).flat().forEach(access => {
        if (access.sessionId !== sessionId) return;

        noAccessFound = false;

        if (access.usageTimeSeconds > 0) {
            totalSeconds += access.usageTimeSeconds;
        }
    });

    if (noAccessFound) {
        return {
            seconds: 0,
            hours: -1
        };
    }

    return {
        seconds: totalSeconds,
        hours: parseFloat((totalSeconds / 3600).toFixed(4))
    };
}

function getSessionDistinctUsers(sessionId, packageAccessHistory) {
    const users = new Set();

    Object.values(packageAccessHistory).flat().forEach(access => {
        if (access.sessionId !== sessionId) return;
        users.add(access.userId);
    });

    return users.size;
}

function getDailySessionUsage(sessionId, packageAccessHistory, currentDate = new Date()) {
    const todayKey = formatDate(currentDate);
    const hourlyData = {};

    const todayAccesses = packageAccessHistory[todayKey];
    if (!todayAccesses) return {};

    todayAccesses.forEach(access => {
        if (access.sessionId !== sessionId) return;

        const { userId, usageTimeSeconds = 0, localDateTime } = access;

        const start = new Date(localDateTime);

        // ✓ Se usageTimeSeconds for 0, apenas registrar o usuário na hora, sem somar tempo
        if (usageTimeSeconds === 0) {
            const hourKey = `${start.getHours().toString().padStart(2, '0')}:00`;

            if (!hourlyData[hourKey]) {
                hourlyData[hourKey] = {
                    totalSeconds: 0,
                    users: new Set()
                };
            }

            hourlyData[hourKey].users.add(userId);
            return;
        }

        const end = new Date(start.getTime() + usageTimeSeconds * 1000);

        const dayStart = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            0, 0, 0, 0
        );

        const dayEnd = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            23, 59, 59, 999
        );

        const effectiveStart = start < dayStart ? dayStart : start;
        const effectiveEnd = end > dayEnd ? dayEnd : end;

        if (effectiveStart >= effectiveEnd) return;

        let cursor = new Date(effectiveStart);
        cursor.setMinutes(0, 0, 0);

        while (cursor < effectiveEnd) {
            const nextHour = new Date(cursor.getTime() + 3600000);
            const sliceEnd = nextHour < effectiveEnd ? nextHour : effectiveEnd;

            const seconds =
                (sliceEnd.getTime() - Math.max(cursor.getTime(), effectiveStart.getTime())) / 1000;

            const hourKey = `${cursor.getHours().toString().padStart(2, '0')}:00`;

            if (!hourlyData[hourKey]) {
                hourlyData[hourKey] = {
                    totalSeconds: 0,
                    users: new Set()
                };
            }

            hourlyData[hourKey].totalSeconds += seconds;
            hourlyData[hourKey].users.add(userId);

            cursor = nextHour;
        }
    });

    const result = {};
    Object.entries(hourlyData).forEach(([hour, data]) => {
        result[hour] = {
            hours: parseFloat((data.totalSeconds / 3600).toFixed(4)),
            users: data.users.size
        };
    });

    return result;
}

function processSessionAccessHistory(accessHistory, pkg) {
    const result = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Itera sobre cada data no accessHistory
    Object.entries(accessHistory).forEach(([date, accesses]) => {
        accesses.forEach(access => {
            // Busca o usuário no pkg
            const user = pkg.users.find(u => u.id === access.userId);
            if (!user) return; // Pula se usuário não encontrado

            // Parse da data e hora do acesso
            const accessDate = new Date(access.localDateTime);
            const accessDateOnly = new Date(accessDate.getFullYear(), accessDate.getMonth(), accessDate.getDate());
            const hours = String(accessDate.getHours()).padStart(2, '0');
            const minutes = String(accessDate.getMinutes()).padStart(2, '0');
            const timeString = `${hours}:${minutes}`;

            // Determina o label da data
            let dateLabel;
            if (accessDateOnly.getTime() === today.getTime()) {
                dateLabel = `Hoje às ${timeString}`;
            } else if (accessDateOnly.getTime() === yesterday.getTime()) {
                dateLabel = `Ontem às ${timeString}`;
            } else {
                const day = String(accessDate.getDate()).padStart(2, '0');
                const month = String(accessDate.getMonth() + 1).padStart(2, '0');
                const year = String(accessDate.getFullYear()).slice(-2);
                dateLabel = `${day}/${month}/${year} às ${timeString}`;
            }

            // Converte segundos para horas e formata
            const usageTimeHours = parseFloat((access.usageTimeSeconds / 3600).toFixed(4));
            const usageTime = formatHours(usageTimeHours);

            // Adiciona ao resultado COM o timestamp original
            result.push({
                dateLabel,
                user,
                usageTime,
                timestamp: accessDate.getTime() // Adiciona o timestamp para ordenação
            });
        });
    });

    // Ordena do mais recente para o mais antigo usando o timestamp armazenado
    result.sort((a, b) => b.timestamp - a.timestamp);

    // Remove o timestamp do resultado final (opcional)
    return result.map(({ timestamp, ...item }) => item);
}

function getUserTotalUsageTime(userId, packageAccessHistory) {
    let totalSeconds = 0;
    let noAccessFound = true;

    Object.values(packageAccessHistory).flat().forEach(access => {
        if (access.userId !== userId) return;
        noAccessFound = false;
        if (access.usageTimeSeconds > 0) {
            totalSeconds += access.usageTimeSeconds;
        }
    });

    if (noAccessFound) {
        return {
            seconds: 0,
            hours: -1
        };
    }

    return {
        seconds: totalSeconds,
        hours: parseFloat((totalSeconds / 3600).toFixed(4))
    };
}

function getUserAccessHistory(userId, accessHistory) {
    const filteredHistory = {};

    // Itera sobre cada data no accessHistory
    Object.entries(accessHistory).forEach(([date, accesses]) => {
        // Filtra apenas os acessos do usuário específico
        const userAccesses = accesses.filter(access => access.userId === userId);

        // Se houver acessos desse usuário nesta data, adiciona ao resultado
        if (userAccesses.length > 0) {
            filteredHistory[date] = userAccesses;
        }
    });

    return filteredHistory;
}

function getUserHistoryUsage(userId, packageAccessHistory) {
    function formatDate(d) {
        const dt = new Date(d);
        const day = String(dt.getDate()).padStart(2, '0');
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const year = dt.getFullYear();
        return `${day}/${month}/${year}`;
    }

    const dailyData = {};

    Object.values(packageAccessHistory).flat().forEach(access => {
        if (access.userId !== userId) return;

        const { localDateTime, usageTimeSeconds = 0 } = access;
        const start = new Date(localDateTime);
        const dateKey = formatDate(start);

        if (!dailyData[dateKey]) {
            dailyData[dateKey] = 0;
        }

        if (usageTimeSeconds > 0) {
            dailyData[dateKey] += usageTimeSeconds;
        }
    });

    const result = {};

    Object.entries(dailyData).forEach(([date, totalSeconds]) => {
        result[date] = {
            hours: parseFloat((totalSeconds / 3600).toFixed(4))
        };
    });

    return result;
}

function getUserDailyUsage(userId, packageAccessHistory, currentDate = new Date()) {
    const todayKey = formatDate(currentDate);
    const hourlyData = {};

    const todayAccesses = packageAccessHistory[todayKey];
    if (!todayAccesses) return {};

    todayAccesses.forEach(access => {
        if (access.userId !== userId) return;

        const { usageTimeSeconds = 0, localDateTime } = access;

        const start = new Date(localDateTime);

        // Se usageTimeSeconds for 0, apenas registrar a hora sem somar tempo
        if (usageTimeSeconds === 0) {
            const hourKey = `${start.getHours().toString().padStart(2, '0')}:00`;

            if (!hourlyData[hourKey]) {
                hourlyData[hourKey] = 0;
            }
            return;
        }

        const end = new Date(start.getTime() + usageTimeSeconds * 1000);

        const dayStart = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            0, 0, 0, 0
        );

        const dayEnd = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            23, 59, 59, 999
        );

        const effectiveStart = start < dayStart ? dayStart : start;
        const effectiveEnd = end > dayEnd ? dayEnd : end;

        if (effectiveStart >= effectiveEnd) return;

        let cursor = new Date(effectiveStart);
        cursor.setMinutes(0, 0, 0);

        while (cursor < effectiveEnd) {
            const nextHour = new Date(cursor.getTime() + 3600000);
            const sliceEnd = nextHour < effectiveEnd ? nextHour : effectiveEnd;

            const seconds =
                (sliceEnd.getTime() - Math.max(cursor.getTime(), effectiveStart.getTime())) / 1000;

            const hourKey = `${cursor.getHours().toString().padStart(2, '0')}:00`;

            if (!hourlyData[hourKey]) {
                hourlyData[hourKey] = 0;
            }

            hourlyData[hourKey] += seconds;

            cursor = nextHour;
        }
    });

    const result = {};
    Object.entries(hourlyData).forEach(([hour, totalSeconds]) => {
        result[hour] = {
            hours: parseFloat((totalSeconds / 3600).toFixed(4))
        };
    });

    return result;
}

function processUserAccessHistory(accessHistory, pkg) {
    const result = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Itera sobre cada data no accessHistory
    Object.entries(accessHistory).forEach(([date, accesses]) => {
        accesses.forEach(access => {
            // Busca a sessão no pkg
            const session = pkg.sessions.find(s => s.id === access.sessionId);
            if (!session) return; // Pula se sessão não encontrada

            // Parse da data e hora do acesso
            const accessDate = new Date(access.localDateTime);
            const accessDateOnly = new Date(accessDate.getFullYear(), accessDate.getMonth(), accessDate.getDate());
            const hours = String(accessDate.getHours()).padStart(2, '0');
            const minutes = String(accessDate.getMinutes()).padStart(2, '0');
            const timeString = `${hours}:${minutes}`;

            // Determina o label da data
            let dateLabel;
            if (accessDateOnly.getTime() === today.getTime()) {
                dateLabel = `Hoje às ${timeString}`;
            } else if (accessDateOnly.getTime() === yesterday.getTime()) {
                dateLabel = `Ontem às ${timeString}`;
            } else {
                const day = String(accessDate.getDate()).padStart(2, '0');
                const month = String(accessDate.getMonth() + 1).padStart(2, '0');
                const year = String(accessDate.getFullYear()).slice(-2);
                dateLabel = `${day}/${month}/${year} às ${timeString}`;
            }

            // Converte segundos para horas e formata
            const usageTimeHours = parseFloat((access.usageTimeSeconds / 3600).toFixed(4));
            const usageTime = formatHours(usageTimeHours);

            // Adiciona ao resultado COM o timestamp original
            result.push({
                dateLabel,
                session,
                usageTime,
                timestamp: accessDate.getTime() // Adiciona o timestamp para ordenação
            });
        });
    });

    // Ordena do mais recente para o mais antigo usando o timestamp armazenado
    result.sort((a, b) => b.timestamp - a.timestamp);

    // Remove o timestamp do resultado final (opcional)
    return result.map(({ timestamp, ...item }) => item);
}

function renderUserInfo(userInfo) {
    const { name, email, picture, plan, role } = userInfo;

    // Trigger elements (Header)
    const profileName = document.querySelector('header.main-header .header-actions .profile-name');
    const profilePicture = document.querySelector('header.main-header .header-actions .profile-picture img');
    const profilePictureWrapper = document.querySelector('header.main-header .header-actions .profile-picture');

    // Trigger elements (Sidebar)
    const sidebarProfileName = document.querySelector('#sidebar-profile .profile-name');
    const sidebarProfileEmail = document.querySelector('#sidebar-profile .sidebar-profile-email');
    const sidebarProfilePicture = document.querySelector('#sidebar-profile .profile-picture img');
    const sidebarProfilePictureWrapper = document.querySelector('#sidebar-profile .profile-picture');

    if (profileName) profileName.textContent = name;
    if (profilePicture) profilePicture.src = picture;

    if (sidebarProfileName) sidebarProfileName.textContent = name;
    if (sidebarProfileEmail) sidebarProfileEmail.textContent = email;
    if (sidebarProfilePicture) sidebarProfilePicture.src = picture;

    // Salva userInfo globalmente
    currentUserInfo = userInfo;

    // Roles com benefício ilimitado (espelha PLUS_BENEFIT_ROLES no backend).
    // Vendedor NÃO entra mais: é usuário normal e pode assinar planos.
    const PLUS_BENEFIT_ROLES = ['admin'];
    // Qualquer plano pago (plus/business/enterprise) ou papel com benefício.
    const hasPlusBenefits = PLUS_BENEFIT_ROLES.includes(role) || (plan && plan !== 'free');

    // "Minha vitrine" aparece para vendedores e para quem já manifestou intenção
    // de vender (pending_seller — ainda sem recebedor). Admin usa o painel admin.
    const navVitrine = document.getElementById('nav-vitrine');
    if (navVitrine) {
        const canSeeVitrine = role === 'seller' || role === 'pending_seller';
        navVitrine.style.display = canSeeVitrine ? '' : 'none';

        // Badge "Novo": destaca o recurso recém-desbloqueado para o aspirante a
        // vendedor, some após o primeiro clique (persistido em localStorage).
        const NOVO_SEEN_KEY = 'ap-vitrine-novo-seen';
        let novoSeen = false;
        try { novoSeen = localStorage.getItem(NOVO_SEEN_KEY) === '1'; } catch (e) {}

        const existingBadge = navVitrine.querySelector('.nav-novo-badge');
        if (role === 'pending_seller' && !novoSeen) {
            if (!existingBadge) {
                const badge = document.createElement('span');
                badge.className = 'nav-novo-badge';
                badge.textContent = 'Novo';
                navVitrine.appendChild(badge);
            }
            navVitrine.addEventListener('click', function dismissNovo(e) {
                // Só descarta em clique real do usuário — o auto-open (?vitrine=novo)
                // dispara um clique programático que NÃO deve sumir com o badge.
                if (e && !e.isTrusted) return;
                try { localStorage.setItem(NOVO_SEEN_KEY, '1'); } catch (err) {}
                navVitrine.querySelector('.nav-novo-badge')?.remove();
                navVitrine.removeEventListener('click', dismissNovo);
            });
        } else if (existingBadge) {
            existingBadge.remove();
        }

        // Vindo de /pages/parceiros (?vitrine=novo): abre a aba automaticamente. Adiado
        // para o fim da fila para rodar DEPOIS do init() terminar de montar a
        // Home — senão a renderização da Home sobrescreve a troca de aba.
        try {
            const params = new URLSearchParams(window.location.search);
            if (canSeeVitrine && params.get('vitrine') === 'novo') {
                params.delete('vitrine');
                const qs = params.toString();
                history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
                setTimeout(() => navVitrine.click(), 0);
            }
        } catch (e) {}
    }

    // Admin: atalho para o painel interno.
    const navAdmin = document.getElementById('nav-admin');
    if (navAdmin) {
        navAdmin.style.display = role === 'admin' ? '' : 'none';
        navAdmin.onclick = () => { window.location.href = '/pages/admin/'; };
    }

    // Badge do perfil: papel (Vendedor/Admin) tem prioridade sobre Plus; senão
    // Plus para assinantes; usuário comum não recebe badge.
    let badgeLabel = null;
    if (role === 'admin') badgeLabel = 'Admin';
    else if (role === 'seller') badgeLabel = 'Vendedor';
    else if (plan && plan !== 'free') badgeLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

    if (hasPlusBenefits) {
        // Esconde toda a UI de upgrade — seller/admin/plus não assinam.
        document.querySelectorAll('.plus-subscribe-btn').forEach(btn => { btn.style.display = 'none'; });
        const sidebarPlusCard = document.getElementById('sidebar-plus-card');
        if (sidebarPlusCard) sidebarPlusCard.style.display = 'none';

        if (profilePictureWrapper) profilePictureWrapper.classList.add('plus-avatar');
        if (sidebarProfilePictureWrapper) sidebarProfilePictureWrapper.classList.add('plus-avatar');
    }

    if (badgeLabel) {
        const profileTrigger = document.getElementById('profile-trigger');
        if (profileTrigger && !profileTrigger.querySelector('.plus-badge')) {
            const badge = document.createElement('span');
            badge.className = 'plus-badge';
            badge.textContent = badgeLabel;
            profileTrigger.appendChild(badge);
        }
        const sidebarProfile = document.getElementById('sidebar-profile');
        if (sidebarProfile && !sidebarProfile.querySelector('.plus-badge')) {
            const badge = document.createElement('span');
            badge.className = 'plus-badge';
            badge.textContent = badgeLabel;
            sidebarProfile.appendChild(badge);
        }
    }
}

// ============================================================================
// CONTADOR DE PESSOAS (limitador único do plano)
// ============================================================================

// Ícones (Lucide) usados no pill do contador.
const PEOPLE_COUNTER_ICON = `<svg class="people-counter__icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
const INFO_COUNTER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;

/**
 * Conjunto de memberships suspensas ("packageId:userId") — as diretas externas
 * além do limite do plano, por ordem de chegada (granted_at). Espelha o cálculo
 * do backend (rank vs. getUserPeopleLimit). Vazio quando o plano é ilimitado.
 * Compras no marketplace (accessOrigin != 'direct') não entram no ranking.
 */
function getSuspendedMembershipKeys() {
    const keys = new Set();
    const limit = currentUserInfo?.peopleLimit;
    if (limit == null) return keys; // ilimitado → ninguém suspenso

    const memberships = [];
    (packagesList.userCollection || []).forEach(pkg => {
        (pkg.users || []).forEach(u => {
            if (u.isCreator) return;
            if (u.accessOrigin && u.accessOrigin !== 'direct') return;
            memberships.push({ pkgId: pkg.id, userId: u.id, at: new Date(u.connectedAt || 0).getTime() });
        });
    });

    // Ordem de chegada; empate estável por (packageId, userId) — igual ao backend.
    memberships.sort((a, b) => {
        if (a.at !== b.at) return a.at - b.at;
        if (a.pkgId !== b.pkgId) return a.pkgId < b.pkgId ? -1 : 1;
        return a.userId < b.userId ? -1 : 1;
    });

    memberships.forEach((m, i) => {
        if (i >= limit) keys.add(m.pkgId + ':' + m.userId);
    });
    return keys;
}

/**
 * Renderiza/atualiza o contador de pessoas compartilhadas (X / limite) à esquerda
 * do botão "Novo pacote", em todos os headers de coleção. Fonte da verdade:
 * currentUserInfo.peopleUsed / .peopleLimit (peopleLimit null = ilimitado).
 */
function updatePeopleCounter() {
    const used = Math.max(0, Number(currentUserInfo?.peopleUsed || 0));
    const limit = currentUserInfo?.peopleLimit; // null/undefined = ilimitado
    const unlimited = limit == null;

    // Limite de pessoas do plano vigente vive no rodapé da sidebar.
    const slot = document.getElementById('plan-people-slot');
    if (!slot) return;

    let counter = slot.querySelector('.people-counter');
    if (!counter) {
        counter = document.createElement('span');
        counter.className = 'people-counter';
        counter.innerHTML = `${PEOPLE_COUNTER_ICON}<span class="people-counter__text"></span>` +
            `<span class="people-counter__info" tabindex="0" role="img" aria-label="Sobre o limite de pessoas">` +
            `${INFO_COUNTER_ICON}<span class="people-counter__tip">Pessoas com quem você compartilha acesso nos seus pacotes. Esse é o limite do seu plano — pacotes e sessões são ilimitados. Clique para ver a lista.</span></span>`;
        // Clicar no pill abre o modal com a lista de pessoas por pacote.
        counter.addEventListener('click', () => openPeopleModal());
        slot.appendChild(counter);
    }

    const textEl = counter.querySelector('.people-counter__text');
    if (unlimited) {
        textEl.innerHTML = `<strong>${used}</strong> pessoas`;
        counter.classList.remove('at-limit', 'over-limit');
    } else {
        textEl.innerHTML = `<strong>${used}</strong> / ${limit} pessoas`;
        counter.classList.toggle('over-limit', used > limit);
        counter.classList.toggle('at-limit', used === limit);
    }
}

// Contador de pessoas do PACOTE selecionado (top bar da coleção). Mostra quantas
// pessoas têm acesso àquele pacote específico, ao lado do botão "Compartilhar".
function updatePackagePeopleCounter(pkg) {
    const slot = document.getElementById('people-counter-slot');
    if (!slot) return;

    const count = (pkg && pkg.users ? pkg.users.length : 0);

    let counter = slot.querySelector('.pkg-people-counter');
    if (!counter) {
        counter = document.createElement('span');
        counter.className = 'pkg-people-counter';
        counter.innerHTML = `${PEOPLE_COUNTER_ICON}<span class="pkg-people-counter__text"></span>`;
        slot.appendChild(counter);
    }

    const textEl = counter.querySelector('.pkg-people-counter__text');
    textEl.innerHTML = count === 1
        ? `<strong>1</strong> pessoa`
        : `<strong>${count}</strong> pessoas`;
}

// ============================================================================
// BUSCA DE SESSÕES (top bar)
// ============================================================================

// Grid de sessões do preset atualmente visível (collection ou access).
function getActiveSessionsGrid() {
    const details = document.querySelector('#package-details');
    if (!details) return null;
    const preset = details.classList.contains('access-state')
        ? details.querySelector('.preset-access')
        : details.querySelector('.preset-collection');
    return preset ? preset.querySelector('.sessions-panel .sessions-grid') : null;
}

// Filtra os cards de sessão do pacote selecionado por nome/domínio.
// Controla a "linha recolhível" de sessões: por padrão a grade mostra só a
// primeira linha; se houver quebra (mais cards do que cabem), exibe um botão que
// expande com altura máxima + rolagem. O botão é criado uma vez por painel.
function setupSessionsExpansion(grid) {
    if (!grid) return;
    const panel = grid.closest('.sessions-panel');
    if (!panel) return;

    let toggle = panel.querySelector('.sessions-toggle');
    if (!toggle) {
        toggle = createElement('button', 'sessions-toggle');
        toggle.type = 'button';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = `
            <span class="sessions-toggle-label">Ver todas</span>
            <svg class="sessions-toggle-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6"></path>
            </svg>`;
        toggle.addEventListener('click', () => {
            const expanded = !grid.classList.contains('is-expanded');
            grid.classList.toggle('is-expanded', expanded);
            grid.classList.toggle('is-collapsed', !expanded);
            toggle.classList.toggle('is-expanded', expanded);
            toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            toggle.querySelector('.sessions-toggle-label').textContent = expanded ? 'Ver menos' : 'Ver todas';
            // Ao recolher ("Ver menos"), volta a rolagem da grade para o topo
            // com scroll suave em vez de snap instantâneo.
            if (!expanded) grid.scrollTo({ top: 0, behavior: 'smooth' });
        });
        panel.appendChild(toggle);
    }

    // Reset ao (re)renderizar o pacote.
    grid.classList.remove('is-collapsed', 'is-expanded');
    grid.style.removeProperty('--sessions-row-h');
    toggle.classList.remove('is-expanded');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.sessions-toggle-label').textContent = 'Ver todas';
    toggle.hidden = true;

    // Mede após o layout para saber se a grade quebra em mais de uma linha.
    requestAnimationFrame(() => {
        const cards = Array.from(grid.querySelectorAll('.session-card'))
            .filter(c => c.style.display !== 'none');
        if (cards.length === 0) { toggle.hidden = true; return; }

        const firstTop = cards[0].offsetTop;
        const firstRow = cards.filter(c => c.offsetTop === firstTop);
        const overflows = cards.length > firstRow.length;
        if (!overflows) { toggle.hidden = true; return; }

        const rowH = Math.max(...firstRow.map(c => c.offsetHeight));
        grid.style.setProperty('--sessions-row-h', rowH + 'px');
        grid.classList.add('is-collapsed');
        toggle.hidden = false;
    });
}

function filterSessionCards(query) {
    const q = (query || '').trim().toLowerCase();
    const grid = getActiveSessionsGrid();
    if (!grid) return;

    const cards = grid.querySelectorAll('.session-card');
    let visible = 0;
    cards.forEach(card => {
        const name = (card.querySelector('.session-card-name')?.textContent || '').toLowerCase();
        const domain = (card.querySelector('.session-card-domain')?.textContent || '').toLowerCase();
        const match = !q || name.includes(q) || domain.includes(q);
        card.style.display = match ? '' : 'none';
        if (match) visible++;
    });

    let empty = grid.querySelector('.sessions-search-empty');
    if (q && visible === 0 && cards.length) {
        if (!empty) {
            empty = createElement('div', 'sessions-search-empty');
            empty.innerHTML = '<div class="sessions-search-empty-title">Nenhuma sessão encontrada</div>' +
                '<div class="sessions-search-empty-text">Tente outro termo de busca.</div>';
            grid.appendChild(empty);
        }
        empty.style.display = '';
    } else if (empty) {
        empty.style.display = 'none';
    }

    // Durante a busca, remove o recolhimento para revelar todas as correspondências;
    // ao limpar, recalcula (recolhe de novo se transbordar).
    const panel = grid.closest('.sessions-panel');
    const toggle = panel && panel.querySelector('.sessions-toggle');
    if (q) {
        grid.classList.remove('is-collapsed', 'is-expanded');
        if (toggle) toggle.hidden = true;
    } else {
        setupSessionsExpansion(grid);
    }
}

// Limpa a busca (ao trocar de pacote/seção).
function resetSessionSearch() {
    const input = document.getElementById('session-search');
    if (input) input.value = '';
    document.querySelectorAll('#package-details .sessions-grid').forEach(grid => {
        grid.querySelectorAll('.session-card').forEach(c => { c.style.display = ''; });
        const empty = grid.querySelector('.sessions-search-empty');
        if (empty) empty.style.display = 'none';
    });
}

// Escape mínimo para nomes/emails inseridos via innerHTML no modal.
function pmEscape(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Marca o plano atual no modal de planos (card "Plano atual" desabilitado) para
// que um assinante veja onde está e possa progredir (ex.: Plus → Business).
function annotatePlansModal() {
    const plan = currentUserInfo?.plan;
    document.querySelectorAll('#plusSubscribeModal .plan-choose-btn[data-plan]').forEach(btn => {
        const tier = btn.dataset.plan;
        const card = btn.closest('.plan-card');
        if (plan && plan === tier) {
            btn.disabled = true;
            btn.textContent = 'Plano atual';
            if (card) card.classList.add('plan-card--current');
        } else {
            btn.disabled = false;
            btn.textContent = tier === 'business' ? 'Assinar Business' : 'Assinar Plus';
            if (card) card.classList.remove('plan-card--current');
        }
    });
}

// Abre o modal de planos (fecha o que estiver aberto e marca o plano atual).
function openPlansModal() {
    utils.closeModals();
    annotatePlansModal();
    utils.showModal('plusSubscribe');
}

// Abre o modal com a lista de pessoas por pacote (suspensos esmaecidos).
async function openPeopleModal() {
    utils.showModal('people');
    await renderPeopleModal();
}

async function renderPeopleModal() {
    const body = document.getElementById('peopleModalBody');
    const summary = document.getElementById('peopleModalSummary');
    if (!body) return;

    body.innerHTML = '<div class="spinner-container" style="height:160px;display:flex;align-items:center;justify-content:center;"><div class="spinner large"></div></div>';
    if (summary) { summary.innerHTML = ''; summary.className = 'people-modal-summary'; }

    const res = await fetchManager.getSharedPeople();
    if (!res.ok || !res.result || !res.result.data) {
        body.innerHTML = '<p class="people-modal-empty">Não foi possível carregar as pessoas.</p>';
        return;
    }

    const { peopleUsed, peopleLimit, packages } = res.result.data;
    const over = peopleLimit != null && peopleUsed > peopleLimit;

    if (summary) {
        const limitText = peopleLimit == null ? `${peopleUsed} pessoas` : `${peopleUsed} / ${peopleLimit} pessoas`;
        summary.className = 'people-modal-summary' + (over ? ' over' : '');
        summary.innerHTML = over
            ? `<strong>${limitText}</strong> — você excedeu o limite do plano. As ${peopleUsed - peopleLimit} pessoas mais recentes ficaram sem acesso até você renovar ou reduzir.`
            : `<strong>${limitText}</strong> com acesso aos seus pacotes.`;
    }

    // Footer: plano atual + CTA de upgrade (some para planos ilimitados).
    const footer = document.getElementById('peopleModalFooter');
    if (footer) {
        if (peopleLimit == null) {
            footer.innerHTML = `<span class="pmf-plan">Plano ilimitado</span>`;
        } else {
            const planCap = (currentUserInfo?.plan || 'free');
            const planName = planCap.charAt(0).toUpperCase() + planCap.slice(1);
            footer.innerHTML =
                `<span class="pmf-plan">Plano <strong>${planName}</strong> · até ${peopleLimit} pessoas</span>` +
                `<button class="pmf-upgrade" type="button">Fazer upgrade &rarr;</button>`;
            footer.querySelector('.pmf-upgrade')?.addEventListener('click', openPlansModal);
        }
    }

    if (!packages || !packages.length) {
        body.innerHTML = '<p class="people-modal-empty">Você ainda não compartilhou com ninguém.</p>';
        return;
    }

    body.innerHTML = packages.map(pkg => {
        const rows = pkg.people.map(p => {
            const avatar = p.picture
                ? `<img src="${pmEscape(p.picture)}" alt="">`
                : `<span class="pm-avatar-fallback">${pmEscape((p.name || '?').trim().charAt(0).toUpperCase())}</span>`;
            return `<div class="pm-person${p.suspended ? ' suspended' : ''}">
                <div class="pm-avatar">${avatar}</div>
                <div class="pm-info">
                    <span class="pm-name">${pmEscape(p.name || '—')}</span>
                    <span class="pm-email">${pmEscape(p.email || '')}</span>
                </div>
                ${p.suspended ? '<span class="pm-tag">sem acesso</span>' : ''}
            </div>`;
        }).join('');
        return `<div class="pm-package">
            <div class="pm-package-head">
                <span class="pm-package-name">${pmEscape(pkg.name)}</span>
                <span class="pm-package-count">${pkg.people.length}</span>
            </div>
            <div class="pm-people">${rows}</div>
        </div>`;
    }).join('');
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================


async function init() {
    const userInfo = await fetchManager.getUserInfo();
    const userAccessPackages = await fetchManager.getAccessPackages();
    const userCollectionPackages = await fetchManager.getCollectionPackages();

    packagesList.userAccess = userAccessPackages.result.data || [];
    packagesList.userCollection = userCollectionPackages.result.data || [];

    // Renderiza informações do usuário
    renderUserInfo(userInfo.result.data);

    // Renderiza coleção do usuário
    renderPackages(
        packagesList.userCollection,
        '.preset-collection .access-grid',
        false
    );

    // Renderiza acessos do usuário
    renderPackages(
        packagesList.userAccess,
        '.preset-access .access-grid',
        true
    );

    // Contador de pessoas (limitador único do plano)
    updatePeopleCounter();

    // Verifica se há parâmetro de novo produto (vindo do checkout)
    const urlParams = new URLSearchParams(window.location.search);
    const newProductId = urlParams.get('newProduct');

    // Define estado inicial do packages list
    if (newProductId && packagesList.userAccess.length > 0) {
        setElementState(document.querySelector("#packages-list"), 'access');

        const newPkg = packagesList.userAccess.find(p => p.id === newProductId);
        if (newPkg) {
            selectPackage(newPkg.id, false);

            const pkgElement = document.querySelector(`.preset-access [data-package-id="${newProductId}"]`);
            if (pkgElement) {
                const newBadge = createElement('div', 'new-badge');
                newBadge.textContent = 'Novo';
                pkgElement.appendChild(newBadge);
            }
        } else {
            selectPackage(packagesList.userAccess[0].id, false);
        }

        window.history.replaceState({}, '', window.location.pathname);
        setDashSection('access');
    } else if (packagesList.userCollection.length === 0) {
        setElementState(document.querySelector("#packages-list"), 'empty-collection');
        setDashSection('collection');
    } else {
        setElementState(document.querySelector("#packages-list"), 'collection');
        setDashSection('collection');
    }

    // Adiciona event listeners para seleção de pacotes (rows da sidebar)
    document.addEventListener('click', (e) => {
        const packageItem = e.target.closest('.access-item');
        if (packageItem && packageItem.dataset.packageId) {
            const isCollection = packageItem.closest('.preset-collection') !== null;

            selectPackage(packageItem.dataset.packageId, isCollection);
        }
    });

    // Alterna seção (Minha coleção / Meus acessos) na sidebar
    const collectionTabs = document.querySelectorAll('.collection-tab');
    const accessTabs = document.querySelectorAll('.access-tab');

    collectionTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            setDashSection('collection');
            // Se não houver pacotes na coleção, troca para empty state
            if (packagesList.userCollection.length === 0) {
                setElementState(document.querySelector("#packages-list"), 'empty-collection');
            } else {
                setElementState(document.querySelector("#packages-list"), 'collection');
            }

            reloadPackagesSelect();
        });
    });

    accessTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            setDashSection('access');
            // Se não houver pacotes de acesso, troca para empty state
            if (packagesList.userAccess.length === 0) {
                setElementState(document.querySelector("#packages-list"), 'empty-access');
            } else {
                setElementState(document.querySelector("#packages-list"), 'access');
            }

            reloadPackagesSelect(true);
        });
    });

    // Busca de sessões do pacote selecionado
    const searchInput = document.getElementById('session-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterSessionCards(e.target.value));
    }

    // Botão "Compartilhar" da top bar: abre o modal para o pacote selecionado.
    const topbarShareBtn = document.getElementById('topbar-share-btn');
    if (topbarShareBtn) {
        topbarShareBtn.addEventListener('click', () => {
            const selectedId = document.querySelector('#package-details')?.dataset.packageId;
            if (selectedId) openSharePackageModal(selectedId);
        });
    }

    // Seleciona o primeiro pacote da coleção por padrão (se não veio do checkout)
    if (!newProductId && packagesList.userCollection.length > 0) {
        selectPackage(packagesList.userCollection[0].id);
    }
}

// Alterna a seção ativa do dashboard (coleção/acessos): estado da top bar +
// classe ativa dos toggles da sidebar. A visibilidade dos botões da top bar
// (Novo pacote vs. Inserir chave) é controlada por [data-dash-section] no CSS.
function setDashSection(section) {
    const isAccess = section === 'access';
    document.body.dataset.dashSection = isAccess ? 'access' : 'collection';
    document.querySelectorAll('.collection-tab').forEach(t => t.classList.toggle('active', !isAccess));
    document.querySelectorAll('.access-tab').forEach(t => t.classList.toggle('active', isAccess));
}

// Executa ao carregar o DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}