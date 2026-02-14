let packagesList = {
    userCollection: [],
    userAccess: []
}

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

// Gera o elemento DOM de um pacote
function createPackageElement(pkg, isAccess = false) {
    const container = createElement('div', 'access-item');
    container.dataset.packageId = pkg.id;

    // Icon stack
    const iconStack = createElement('div', 'icon-stack');
    const sessions = pkg.sessions || [];
    sessions.slice(0, 3).forEach(session => {
        const stackIcon = createElement('div', 'stack-icon');
        const img = document.createElement('img');
        img.alt = session.name;
        img.src = session.icon;
        stackIcon.appendChild(img);
        iconStack.appendChild(stackIcon);
    });

    // Title
    const title = createElement('div', 'access-title');
    title.textContent = pkg.name;

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

        packageOptions.appendChild(shareBtn);
        packageOptions.appendChild(editBtn);
        packageOptions.appendChild(deleteBtn);
    }

    container.appendChild(iconStack);
    container.appendChild(title);
    container.appendChild(optionsBtn);
    container.appendChild(packageOptions);

    return container;
}

// Gera o elemento DOM de uma sessão (grid card para access, list item para collection)
function createSessionElement(session, isCollection = true) {
    // Access view: grid card
    if (!isCollection) {
        return createSessionCardElement(session);
    }

    // Collection view: list item (mantém o layout original)
    const container = createElement('div', 'list-item session');
    container.dataset.sessionId = session.id;

    // Item info
    const itemInfo = createElement('div', 'item-info');

    const itemIcon = createElement('div', 'item-icon');
    const img = document.createElement('img');
    img.alt = session.name;
    img.src = session.icon;
    itemIcon.appendChild(img);

    const itemName = createElement('div', 'item-name');
    itemName.textContent = session.name;

    itemInfo.appendChild(itemIcon);
    itemInfo.appendChild(itemName);

    // Item actions
    const itemActions = createElement('div', 'item-actions');

    const managementActions = createElement('div', 'management-actions');

    // Connect button
    const connectBtn = createElement('div', 'connect-session-btn actionBtn');
    connectBtn.title = 'Conectar';
    connectBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16"
            height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"
            class="lucide lucide-play-icon lucide-play">
            <path
                d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
        </svg>
    `;

    // Edit button
    const editBtn = createElement('div', 'edit-session-btn actionBtn');
    editBtn.title = 'Editar';
    editBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
        </svg>
    `;

    // Delete button
    const deleteBtn = createElement('div', 'delete-session-btn actionBtn');
    deleteBtn.title = 'Excluir';
    deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
    `;

    managementActions.appendChild(connectBtn);
    managementActions.appendChild(editBtn);
    managementActions.appendChild(deleteBtn);

    itemActions.appendChild(managementActions);

    // See details Button
    const seeDetailsBtn = createElement('button', 'btn btn-small details-btn', 'Ver detalhes');
    itemActions.appendChild(seeDetailsBtn);

    container.appendChild(itemInfo);
    container.appendChild(itemActions);

    return container;
}

// Gera o elemento DOM de uma sessão como card de grid (para access view)
function createSessionCardElement(session) {
    const card = createElement('div', 'session-card');
    card.dataset.sessionId = session.id;

    // Aplica glow se tiver paleta
    if (session.palette && session.palette.dominantColor) {
        const [r, g, b] = session.palette.dominantColor.rgb;
        card.style.setProperty('--glow-color', `${r}, ${g}, ${b}`);
    }

    // Content wrapper (z-index acima do ::before glow)
    const content = createElement('div', 'session-card-content');

    // Header: ícone + nome + domínio
    const header = createElement('div', 'session-card-header');

    const icon = document.createElement('img');
    icon.className = 'session-card-icon';
    icon.alt = session.name;
    icon.src = session.icon;

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

    // Footer: online badge + botão conectar
    const footer = createElement('div', 'session-card-footer');

    const onlineBadge = createElement('div', 'session-online-badge');
    const onlineDot = createElement('span', 'online-dot');
    const onlineNum = createElement('span', 'online-count-num');
    onlineNum.textContent = session.onlineCount || '0';
    const onlineLabel = createElement('span', 'online-label', 'online');
    onlineBadge.appendChild(onlineDot);
    onlineBadge.appendChild(onlineNum);
    onlineBadge.appendChild(onlineLabel);

    const connectBtn = createElement('button', 'connect-session-btn', 'Conectar');

    footer.appendChild(onlineBadge);
    footer.appendChild(connectBtn);

    // Monta estrutura
    content.appendChild(header);
    content.appendChild(footer);
    card.appendChild(content);

    return card;
}

// Gera o elemento DOM de um usuário conectado
function createUserElement(user) {
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

    // REMOVE BUTTON
    const actions = createElement('div', 'item-actions');
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

    // See details Button
    const seeDetailsBtn = createElement('button', 'btn btn-small details-btn', 'Ver detalhes');
    actions.appendChild(seeDetailsBtn);

    // APPEND EVERYTHING
    container.appendChild(info);
    container.appendChild(actions);

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
        img.src = item.session.icon;
        img.alt = '';

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

    // Atualiza título
    const title = activePreset.querySelector('.header-top h2') || activePreset.querySelector('.package-info-title h2');
    if (title) title.textContent = pkg.name;

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

    if (pkg.sessions.length === 0) {
        setElementState(sessionsPanelContainer, "empty");
    } else {
        setElementState(sessionsPanelContainer, "content");
    }

    // Seleciona container correto: grid para access, lista para collection
    const sessionsContainer = isCollection
        ? activePreset.querySelector('.sessions-panel .scrollable-list')
        : activePreset.querySelector('.sessions-panel .sessions-grid');

    if (sessionsContainer && pkg.sessions) {
        sessionsContainer.innerHTML = '';
        pkg.sessions.forEach(session => {
            const sessionElement = createSessionElement(session, isCollection);
            sessionsContainer.appendChild(sessionElement);
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

        pkg.users.forEach(user => {
            const userElement = createUserElement(user);
            usersList.appendChild(userElement);
        })
    }

    // Renderiza estatísticas (apenas para collection)
    if (isCollection) {
        const packageStatsContainer = activePreset.querySelector(".package-stats-container");
        setElementState(packageStatsContainer, "loading");

        const packageUsageChart = activePreset.querySelector(".usage-chart-container .chart-wrapper");
        setElementState(packageUsageChart, "loading");

        // Obtém o período selecionado
        const periodSelected = activePreset.querySelector(".usage-chart-container .chart-period-select option:checked").value;
        const period = periodSelected === "today" ? 0 : (periodSelected === "7days" ? 7 : 30);
        loadPackageStats(pkg, period);
    }

    // Renderiza paleta de cores
    for (session of pkg.sessions) {
        if (!session.palette) {
            const paletteExtracted = await getPaletteFromUrl(session.icon);

            if (paletteExtracted) {
                const dominantColor = paletteExtracted.DarkVibrant || paletteExtracted.Vibrant || paletteExtracted.Muted;

                session.palette = {
                    dominantColor,
                    details: paletteExtracted
                };
            }
        }

        // Aplica glow nos session-cards do access view (paleta pode ter sido extraída após render)
        if (!isCollection && session.palette && session.palette.dominantColor) {
            const sessionCard = activePreset.querySelector(`.session-card[data-session-id="${session.id}"]`);
            if (sessionCard) {
                const [r, g, b] = session.palette.dominantColor.rgb;
                sessionCard.style.setProperty('--glow-color', `${r}, ${g}, ${b}`);
            }
        }
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

        const { totalOnline, sessionsOnline, joinedAt, renewsAt } = fetchOverview.result.data;

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

        // Atualiza "Renova em"
        const renewsAtEl = activePreset.querySelector('.package-info-header .renews-at-value');
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

        // Atualiza badges em cada session card
        if (sessionsOnline) {
            const sessionCards = activePreset.querySelectorAll('.session-card');
            sessionCards.forEach(card => {
                const sessionId = card.dataset.sessionId;
                const count = sessionsOnline[sessionId] || 0;
                const badge = card.querySelector('.online-count-num');
                if (badge) badge.textContent = count;
            });
        }
    } catch (err) {
        console.error('Error loading access overview:', err);
    }
}

async function loadPackageStats(pkg, period) {
    const contentPreset = document.querySelector('#package-details .preset-collection');

    const newUsersStat = contentPreset.querySelector(".new-users-stat");
    const sessionsStat = contentPreset.querySelector(".sessions-stat");
    const usersStat = contentPreset.querySelector(".users-stat");

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
                totalUsers: pkg.users.length,
                totalUsersOnline: 0,
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
        }
    }

    const contentCard = document.querySelector('#package-details');
    const currentPackageId = contentCard.getAttribute('data-package-id');

    // Verifica se o statsGrid pertence ao pacote atualmente selecionado
    if (pkg.id !== currentPackageId) {
        return; // Sai da função se não for o pacote correto
    }

    // Stats container

    // New users stats
    const newUsersTitle = newUsersStat.querySelector(".access-title");
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

    newUsersTitle.textContent = `${newUsersCount} (+${percentageIncrease}%)`;

    // Sessions stats
    const sessionsTitle = sessionsStat.querySelector(".access-title");
    sessionsTitle.textContent = pkg.stats ? (String(pkg.stats.totalSessions)) : "0";

    // Users stats
    const usersTitle = usersStat.querySelector(".access-title");
    usersTitle.textContent = pkg.stats ? (String(pkg.stats.totalUsers)) : "0";

    const packageStatsContainer = contentPreset.querySelector(".package-stats-container");
    setElementState(packageStatsContainer, "content");

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

    // Sessions panel
    const sessionsEl = document.querySelectorAll("#package-details .preset-collection .sessions-panel .session");
    sessionsEl.forEach(session => {
        const sessionsHistoryUsageFiltered = filterByLastDays(pkg.stats.sessionsHistoryUsage, period);
        const sessionId = session.getAttribute("data-session-id");

        let sessionTime = 0;

        Object.values(sessionsHistoryUsageFiltered).forEach(daySessions => {
            if (daySessions[sessionId]) {
                sessionTime += daySessions[sessionId];
            }
        });

        const sessionTimeFormatted = formatDuration(sessionTime);

        // Se já existe itemDetails, atualiza
        if (session.querySelector(".item-details")) {
            session.querySelector(".item-details").querySelector(".total-usage").textContent = sessionTimeFormatted === "0s" ? "" : sessionTimeFormatted;
            return;
        }

        const itemDetails = createElement('div', 'item-details');
        const totalUsage = createElement('div', 'total-usage');
        totalUsage.textContent = sessionTimeFormatted === "0s" ? "" : sessionTimeFormatted;
        itemDetails.appendChild(totalUsage);

        session.appendChild(itemDetails);
    });

    // Users panel
    const usersEl = document.querySelectorAll("#package-details .preset-collection .users-panel .user");
    usersEl.forEach(user => {
        const userId = user.getAttribute("data-user-id");
        const userLastUsage = pkg.users.find(u => u.id === userId).lastUsage;

        if (!userLastUsage) return;

        const userLastUsageFormatted = timeAgo(userLastUsage);

        // Se já existe itemDetails, atualiza
        if (user.querySelector(".item-details")) {
            user.querySelector(".item-details").querySelector(".last-seen-at").textContent = userLastUsageFormatted;
            return;
        }

        const itemDetails = createElement('div', 'item-details');
        const lastSeenAt = createElement('div', 'last-seen-at');

        lastSeenAt.textContent = userLastUsageFormatted;
        itemDetails.appendChild(lastSeenAt);

        user.appendChild(itemDetails);

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
    const profileCard = userScreen.querySelector(".profile-card");
    const profileCardIcon = profileCard.querySelector(".profile-avatar img");
    const profileTitle = profileCard.querySelector(".profile-title");
    const profileSubtitle = profileCard.querySelector(".profile-subtitle");

    headerTitle.textContent = pkg.name;
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

    const userLastUsageFormatted = timeAgo(user.lastUsage);

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
    const serviceCard = sessionScreen.querySelector(".service-card");
    const sessionLogo = serviceCard.querySelector(".service-card-icon");
    const sessionName = serviceCard.querySelector(".service-name");
    const sessionDomain = serviceCard.querySelector(".service-domain");

    if (session.palette && session.palette.dominantColor) {
        const [r, g, b] = session.palette.dominantColor.rgb;
        serviceCard.style.setProperty("--glow-color", `${r}, ${g}, ${b}`);
    } else {
        serviceCard.style.removeProperty("--glow-color");
    }

    headerTitle.textContent = pkg.name;

    sessionLogo.src = session.icon;
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
    const sessionHotUsers = getSessionHotUsers(session.id, accessHistoryFiltered);
    const sessionDailyUsage = getDailySessionUsage(session.id, accessHistoryFiltered);

    session.stats = {
        historyUsage: sessionHistoryUsage,
        totalUsage: sessionTotalUsage,
        distinctUsers: sessionDistinctUsers,
        dailyUsage: sessionDailyUsage
    };

    console.log(sessionHistoryUsage)

    const sessionScreen = document.querySelector(
        "#package-details .preset-collection .screen-section.secondary .preset-session-overview"
    );

    // Estatísticas
    const sessionTimeUsage = sessionScreen.querySelector(".session-usage-stat span");
    const sessionUsers = sessionScreen.querySelector(".users-stat span");

    sessionTimeUsage.textContent = formatHours(session.stats.totalUsage.hours);
    sessionUsers.textContent = session.stats.distinctUsers;

    // Usuários ativos  
    const hotUsersListContainer = sessionScreen.querySelector(".service-users-list");
    hotUsersListContainer.innerHTML = "";

    sessionHotUsers.forEach(userId => {
        const user = pkg.users.find(u => u.id === userId);
        const userAvatar = createElement("img", "service-user-avatar");
        userAvatar.src = user.picture;
        hotUsersListContainer.appendChild(userAvatar);
    });

    const plusUser = createElement("div", "service-add-user");
    plusUser.textContent = sessionHotUsers.length === 0 ? "..." : "+";
    hotUsersListContainer.appendChild(plusUser);

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
    const now = new Date();
    const past = new Date(date);

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

// Função para buscar a imagem via proxy e obter a paleta
async function getPaletteFromUrl(imageUrl) {
    try {
        // 1. Busca a imagem via proxy
        const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;
        const response = await fetch(proxiedUrl, { mode: 'cors' });

        if (!response.ok) {
            throw new Error(`Proxy fetch falhou: ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // 2. Cria elemento img temporário para o Vibrant analisar
        const tempImg = document.createElement('img');
        tempImg.crossOrigin = '';
        tempImg.src = blobUrl;

        // 3. Aguarda a imagem carregar
        await new Promise((resolve, reject) => {
            tempImg.onload = resolve;
            tempImg.onerror = reject;
        });

        // 4. Usa o Vibrant para extrair a paleta
        let palette = null;
        if (window.Vibrant) {
            if (Vibrant.from) {
                palette = await Vibrant.from(tempImg).getPalette();
            } else {
                const v = new Vibrant(tempImg);
                palette = v.swatches ? v.swatches() : null;
            }
        }

        // 5. Limpa o blob URL
        URL.revokeObjectURL(blobUrl);

        return palette;

    } catch (err) {
        console.warn('Erro ao obter paleta:', err);
        return null;
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

function getSessionHotUsers(sessionId, accessHistory) {
    // Objeto para acumular o tempo total de uso por usuário
    const userUsageMap = {};

    // Iterar por todas as datas no histórico
    for (const date in accessHistory) {
        const accesses = accessHistory[date];

        // Filtrar acessos da sessão específica e acumular tempo de uso
        accesses.forEach(access => {
            if (access.sessionId === sessionId) {
                const { userId, usageTimeSeconds } = access;

                if (!userUsageMap[userId]) {
                    userUsageMap[userId] = 0;
                }

                userUsageMap[userId] += usageTimeSeconds;
            }
        });
    }

    // Converter o mapa em array de objetos [userId, totalUsageTime]
    const userUsageArray = Object.entries(userUsageMap).map(([userId, totalUsage]) => ({
        userId,
        totalUsageTime: totalUsage
    }));

    // Ordenar por tempo total de uso (decrescente)
    userUsageArray.sort((a, b) => b.totalUsageTime - a.totalUsageTime);

    // Retornar no máximo os 3 primeiros usuários
    return userUsageArray.slice(0, 3).map(user => user.userId);
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
    const { name, picture } = userInfo;

    const profileName = document.querySelector('header.main-header .header-actions .profile-name');
    const profilePicture = document.querySelector('header.main-header .header-actions .profile-picture img');

    profileName.textContent = name;
    profilePicture.src = picture;
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

    // Define estado inicial do packages list
    if (packagesList.userCollection.length === 0) {
        setElementState(document.querySelector("#packages-list"), 'empty-collection');
    } else {
        setElementState(document.querySelector("#packages-list"), 'collection');
    }

    // Adiciona event listeners para seleção de pacotes
    document.addEventListener('click', (e) => {
        const packageItem = e.target.closest('.access-item');
        if (packageItem && packageItem.dataset.packageId) {
            const isCollection = packageItem.closest('.preset-collection') !== null;

            selectPackage(packageItem.dataset.packageId, isCollection);
        }
    });

    // Mudar package tab
    const collectionTabs = document.querySelectorAll('.collection-tab');
    const accessTabs = document.querySelectorAll('.access-tab');

    collectionTabs.forEach(tab => {
        tab.addEventListener('click', function () {
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
            // Se não houver pacotes de acesso, troca para empty state
            if (packagesList.userAccess.length === 0) {
                setElementState(document.querySelector("#packages-list"), 'empty-access');
            } else {
                setElementState(document.querySelector("#packages-list"), 'access');
            }

            reloadPackagesSelect(true);
        });
    });

    // Seleciona o primeiro pacote da coleção por padrão
    if (packagesList.userCollection.length > 0) {
        selectPackage(packagesList.userCollection[0].id);
    }
}

// Executa ao carregar o DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}