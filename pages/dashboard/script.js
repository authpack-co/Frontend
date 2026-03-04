// Função universal para inicializar scroll buttons em qualquer grid
function initScrollButtons(container) {
    const grid = container.querySelector('.access-grid');
    const prevBtn = container.querySelector('.prev-btn');
    const nextBtn = container.querySelector('.next-btn');

    if (!grid || !prevBtn || !nextBtn) return;

    function updateScrollButtons() {
        const scrollLeft = grid.scrollLeft;
        const scrollWidth = grid.scrollWidth;
        const clientWidth = grid.clientWidth;

        // Verifica se há overflow
        const hasOverflow = scrollWidth > clientWidth;

        if (!hasOverflow) {
            prevBtn.classList.remove('visible');
            nextBtn.classList.remove('visible');
            grid.classList.remove('mask-left', 'mask-right', 'mask-both');
            return;
        }

        const canScrollLeft = scrollLeft > 5;
        const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5;

        // Mostra/esconde botão anterior
        if (canScrollLeft) {
            prevBtn.classList.add('visible');
        } else {
            prevBtn.classList.remove('visible');
        }

        // Mostra/esconde botão próximo
        if (canScrollRight) {
            nextBtn.classList.add('visible');
        } else {
            nextBtn.classList.remove('visible');
        }

        // Atualiza mask-image
        grid.classList.remove('mask-left', 'mask-right', 'mask-both');

        if (canScrollLeft && canScrollRight) {
            grid.classList.add('mask-both');
        } else if (canScrollRight) {
            grid.classList.add('mask-right');
        } else if (canScrollLeft) {
            grid.classList.add('mask-left');
        }
    }

    // Event listeners
    prevBtn.addEventListener('click', function () {
        grid.scrollBy({ left: -200, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', function () {
        grid.scrollBy({ left: 200, behavior: 'smooth' });
    });

    grid.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);

    // Inicializa
    updateScrollButtons();
}

// Inicializa para ambas as listas
document.querySelectorAll('.preset-collection, .preset-access').forEach(container => {
    initScrollButtons(container);
});

// Função para inicializar o menu responsivo
function initResponsiveMenu() {
    // Criar botão hamburger no header
    const header = document.querySelector('.main-header');
    const logo = header.querySelector('.logo');

    // Criar botão hamburger
    const hamburgerBtn = document.createElement('button');
    hamburgerBtn.className = 'hamburger-btn';
    hamburgerBtn.setAttribute('aria-label', 'Menu');
    hamburgerBtn.innerHTML = `
        <div class="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    // Inserir botão após o logo
    logo.insertAdjacentElement('afterend', hamburgerBtn);

    // Criar overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // Selecionar sidebar
    const sidebar = document.querySelector('.navigation-sidebar');

    // Toggle menu ao clicar no hamburger
    hamburgerBtn.addEventListener('click', () => {
        toggleMenu();
    });

    // Fechar ao clicar no overlay
    overlay.addEventListener('click', () => {
        closeMenu();
    });

    // Fechar ao clicar em item do menu
    const navItems = sidebar.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Só fecha em mobile
            if (window.innerWidth <= 1199) {
                closeMenu();
            }
        });
    });

    // Função para abrir/fechar menu
    function toggleMenu() {
        hamburgerBtn.classList.toggle('active');
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');

        // Prevenir scroll do body quando menu aberto
        if (sidebar.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    // Função para fechar menu
    function closeMenu() {
        hamburgerBtn.classList.remove('active');
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Fechar menu ao redimensionar para desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1199) {
            closeMenu();
        }
    });
}

initResponsiveMenu();

// Função de notificação
async function notify(type, msg) {
    const notificationsContainer = document.querySelector(".notifications");
    const notificationsByType = {
        success: document.querySelector(".notification.success"),
        info: document.querySelector(".notification.info"),
        error: document.querySelector(".notification.error")
    };

    // remove notificações existentes
    const activeNotifications = notificationsContainer.querySelectorAll(".notification.show");

    await Promise.all([...activeNotifications].map(notification => {
        return new Promise(resolve => {
            // Garante que a animação ocorra e remova ao fim
            notification.classList.remove("show");
            notification.addEventListener("animationend", resolve, { once: true });
        });
    }));

    // Modifica notificação
    const selectedNotification = notificationsByType[type];
    const notificationMsg = selectedNotification.querySelector(".notification-message");
    notificationMsg.textContent = msg;

    // Mostra notificação
    selectedNotification.classList.add("show");

    setTimeout(() => {
        if (selectedNotification.classList.contains("show")) {
            selectedNotification.classList.remove("show");
        }
    }, 2500);
};

// ============================================
// Package Usage Chart (Rich Tooltip)
// ============================================
function loadUsageChart(renderTarget, dataObject, isDaily = false) {
    let canvas;
    // renderTarget tem tres opções de valores: "package", "session" e "user". 
    // "package" renderiza o gráfico de uso do pacote
    switch (renderTarget) {
        case "package":
            canvas = document.getElementById('packageUsageChart');
            break;
        case "session":
            canvas = document.getElementById('sessionUsageChart');
            break;
        case "user":
            canvas = document.getElementById('userUsageChart');
            break;
    }

    if (!canvas) return;

    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    const ctx = canvas.getContext('2d');

    const labels = Object.keys(dataObject);

    // Formata as labels apenas se NÃO for visualização diária (por hora)
    const formattedLabels = isDaily ? labels : labels.map(label => {
        const parts = label.split('/');
        // Verifica se é uma data (tem 3 partes) ou hora (formato HH:MM)
        if (parts.length === 3) {
            return `${parts[0]}/${parts[1]}`; // Retorna apenas dia/mês
        }
        return label; // Mantém o formato original se não for data
    });

    const hoursData = labels.map(label => dataObject[label].hours);

    const validHours = hoursData.filter(h => h >= 0);
    const maxValue = validHours.length > 0 ? Math.max(...validHours) : 0;
    const yAxisMax = maxValue === 0 ? 1 : maxValue * 1.2;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: formattedLabels, // Usa as labels formatadas
            datasets: [{
                data: hoursData,
                borderColor: '#4184e4',
                backgroundColor: function (context) {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
                    gradient.addColorStop(0, 'rgba(65, 132, 228, 0.3)');
                    gradient.addColorStop(1, 'rgba(65, 132, 228, 0)');
                    return gradient;
                },
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#4184e4',
                pointBorderColor: '#141619',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#58a6ff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    external: function (context) {
                        // Tooltip Element
                        let tooltipEl = document.getElementById('chartjs-tooltip');

                        // Create element on first render
                        if (!tooltipEl) {
                            tooltipEl = document.createElement('div');
                            tooltipEl.className = 'custom-scrollbar';
                            tooltipEl.id = 'chartjs-tooltip';
                            tooltipEl.style.background = '#1c1f20';
                            tooltipEl.style.border = '1px solid #333840';
                            tooltipEl.style.borderRadius = '8px';
                            tooltipEl.style.color = '#fff';
                            tooltipEl.style.opacity = 0;
                            tooltipEl.style.pointerEvents = 'none';
                            tooltipEl.style.position = 'absolute';
                            tooltipEl.style.transform = 'translate(-50%, 0)';
                            tooltipEl.style.transition = 'all .3s ease';
                            tooltipEl.style.padding = '12px';
                            tooltipEl.style.fontSize = '13px';
                            tooltipEl.style.zIndex = '1';
                            tooltipEl.style.maxHeight = '200px';
                            tooltipEl.style.overflowY = 'auto';
                            // tooltipEl.style.minWidth = '120px';

                            document.body.appendChild(tooltipEl);

                            // Controle de hover no tooltip (evita sumir ao interagir)
                            tooltipEl.addEventListener('mouseenter', () => {
                                if (tooltipEl._hideTimeout) {
                                    clearTimeout(tooltipEl._hideTimeout);
                                    tooltipEl._hideTimeout = null;
                                }
                                tooltipEl.style.opacity = 1;
                                tooltipEl.style.pointerEvents = 'auto';
                            });

                            tooltipEl.addEventListener('mouseleave', () => {
                                tooltipEl._hideTimeout = setTimeout(() => {
                                    tooltipEl.style.opacity = 0;
                                    tooltipEl.style.pointerEvents = 'none';
                                }, 150);
                            });
                        }

                        const tooltipModel = context.tooltip;

                        // Se o Chart.js quer esconder o tooltip
                        if (tooltipModel.opacity === 0) {
                            // Mas o mouse está sobre o tooltip? Mantém visível
                            if (tooltipEl.matches(':hover')) return;

                            if (tooltipEl._hideTimeout) clearTimeout(tooltipEl._hideTimeout);
                            tooltipEl._hideTimeout = setTimeout(() => {
                                tooltipEl.style.opacity = 0;
                                tooltipEl.style.pointerEvents = 'none';
                            }, 120);
                            return;
                        }

                        // Cancelar qualquer hide pendente
                        if (tooltipEl._hideTimeout) {
                            clearTimeout(tooltipEl._hideTimeout);
                            tooltipEl._hideTimeout = null;
                        }

                        // Conteúdo do tooltip
                        if (tooltipModel.body) {
                            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
                            const originalLabel = labels[dataIndex];
                            const itemData = dataObject[originalLabel];
                            const prefix = isDaily ? '🕐' : '📅';

                            let innerHtml = `
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #333840;">
                                <span style="font-size:16px;">${prefix}</span>
                                <strong>${originalLabel}</strong>
                                </div>
                            `;

                            // DAILY
                            if (isDaily) {
                                innerHtml += `
                                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4184e4" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                        </svg>
                                        <span>${formatHours(itemData.hours)} de uso</span>
                                    </div>
                                    ${renderTarget === "user" ? "" :
                                        `
                                        <div style="display:flex;align-items:center;gap:6px;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                            <circle cx="9" cy="7" r="4"/>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                            </svg>
                                            <span>${itemData.users} usuários</span>
                                        </div>
                                        `}
                                    `;
                            }
                            // MONTHLY
                            else {
                                innerHtml += `
                                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4184e4" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    <span>${formatHours(itemData.hours)} de uso</span>
                                </div>
                                ${renderTarget === "user" ? "" :
                                        `
                                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                    <span>${itemData.users} usuários</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" stroke-width="2">
                                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                                    </svg>
                                    <span>Pico: ${itemData.peak.count} às ${itemData.peak.hour}</span>
                                </div>
                                `}
                            `;
                            }

                            tooltipEl.innerHTML = innerHtml;
                        }

                        // Posicionamento
                        const position = context.chart.canvas.getBoundingClientRect();
                        tooltipEl.style.opacity = 1;
                        tooltipEl.style.pointerEvents = 'auto';
                        tooltipEl.style.left =
                            position.left + window.pageXOffset + tooltipModel.caretX + 'px';
                        tooltipEl.style.top =
                            position.top + window.pageYOffset + tooltipModel.caretY + 'px';
                    }
                }

            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#8e9091',
                        font: { size: 11 },
                        // Adapta a rotação dos labels se for visualização diária
                        maxRotation: isDaily ? 45 : 0,
                        minRotation: isDaily ? 45 : 0
                    }
                },
                y: {
                    beginAtZero: true,
                    max: yAxisMax,
                    grid: { color: '#333840' },
                    ticks: {
                        color: '#8e9091',
                        callback: v => formatHours(v)
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Listener para mudança de período
const packagePeriodSelect = document.getElementById('packageChartPeriodSelect');
const sessionPeriodSelect = document.getElementById('sessionChartPeriodSelect');
const userPeriodSelect = document.getElementById('userChartPeriodSelect');

packagePeriodSelect.addEventListener('change', (e) => updateChartPeriod('package', e));
sessionPeriodSelect.addEventListener('change', (e) => updateChartPeriod('session', e));
userPeriodSelect.addEventListener('change', (e) => updateChartPeriod('user', e));

function updateChartPeriod(chartType, event) {
    const selectedPeriod = event.target.value;
    const currentPackageId = document.querySelector("#package-details").dataset.packageId;
    const currentSessionId = document.querySelector("#package-details .preset-collection .screen-section.secondary .preset-session-overview").dataset.sessionId;
    const currentUserId = document.querySelector("#package-details .preset-collection .screen-section.secondary .preset-user-overview").dataset.userId;

    const pkg = packagesList.userCollection.find(p => p.id === currentPackageId);
    const session = pkg.sessions.find(s => s.id === currentSessionId);
    const user = pkg.users.find(u => u.id === currentUserId);

    // Atualizar o título do gráfico baseado no período
    const chartContainer = event.target.closest('.usage-chart-container');
    const chartTitle = chartContainer.querySelector('.chart-title');

    switch (selectedPeriod) {
        case 'today':
            chartTitle.textContent = 'Uso do pacote hoje';
            if (chartType === 'package') {
                loadPackageStats(pkg, 0);
            } else if (chartType === 'session') {
                loadSessionStats(session, pkg, 0);
            } else if (chartType === 'user') {
                loadUserStats(user, pkg, 0);
            }
            break;
        case '7days':
            chartTitle.textContent = 'Uso do pacote nos últimos 7 dias';
            if (chartType === 'package') {
                loadPackageStats(pkg, 7);
            } else if (chartType === 'session') {
                loadSessionStats(session, pkg, 7);
            } else if (chartType === 'user') {
                loadUserStats(user, pkg, 7);
            }
            break;
        case '30days':
            chartTitle.textContent = 'Uso do pacote nos últimos 30 dias';
            if (chartType === 'package') {
                loadPackageStats(pkg, 30);
            } else if (chartType === 'session') {
                loadSessionStats(session, pkg, 30);
            } else if (chartType === 'user') {
                loadUserStats(user, pkg, 30);
            }
            break;
    }

}