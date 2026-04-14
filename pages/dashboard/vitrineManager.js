// ============================================================================
// VITRINE MANAGER
// Handles all vitrine tab logic: sidebar nav, state management, product CRUD
// ============================================================================

let vitrineProducts = [];
let vitrineLoaded = false;
let createProductState = {
    step: 1,
    packageId: null,
    packageName: '',
    sessions: [],
    name: '',
    description: '',
    billingType: 'one_time',
    price: '',
    stock: '',
};



// ============================================================================
// SIDEBAR NAV — VIEW SWITCHING
// ============================================================================

(function initVitrineNav() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    const inicioSections = [
        document.getElementById('setup-alert'),
        document.querySelector('#packages-list')?.closest('.content-card'),
        document.getElementById('package-details'),
    ].filter(Boolean);

    // Find parent sections more reliably
    const packagesSection = document.querySelector('.content-card:has(#packages-list)') ||
        document.querySelector('#packages-list')?.closest('section');
    const packageDetails = document.getElementById('package-details');
    const vitrineSection = document.getElementById('vitrine-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Skip if already active
            if (item.classList.contains('active')) return;

            // Update active state
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            const view = item.dataset.view;

            if (view === 'inicio') {
                // Show inicio sections
                if (packagesSection) packagesSection.style.display = '';
                if (packageDetails) packageDetails.style.display = '';
                const setupAlert = document.getElementById('setup-alert');
                // Don't force-show setup alert; let its own logic manage visibility

                // Hide vitrine
                if (vitrineSection) vitrineSection.style.display = 'none';
            } else if (view === 'vitrine') {
                // Hide inicio sections
                if (packagesSection) packagesSection.style.display = 'none';
                if (packageDetails) packageDetails.style.display = 'none';
                const setupAlert = document.getElementById('setup-alert');
                if (setupAlert) setupAlert.style.display = 'none';

                // Show vitrine
                if (vitrineSection) vitrineSection.style.display = '';

                // Load vitrine data if not yet loaded
                if (!vitrineLoaded) {
                    loadVitrineTab();
                }
            }
        });
    });
})();

// ============================================================================
// VITRINE TAB LOADING
// ============================================================================

async function loadVitrineTab() {
    const container = document.getElementById('vitrine-container');
    setElementState(container, 'loading');

    // Always hide gate + banner first
    hideGate();
    hideOnboardingBanner();

    // Check if user is Plus
    if (!currentUserInfo || currentUserInfo.plan !== 'plus') {
        // Free user: show content state with blurred gate
        setElementState(container, 'vitrine-content');
        showGate('locked');
        vitrineLoaded = true;
        return;
    }

    // User is Plus — check Stripe connected account status
    try {
        const accountRes = await fetchManager.getSellerAccountStatus();
        console.log('[Vitrine] Account status:', accountRes);

        // State 1: No connected account at all
        if (!accountRes.ok || !accountRes.result?.connected) {
            setElementState(container, 'vitrine-content');
            showGate('connect');
            vitrineLoaded = true;
            return;
        }

        const accountData = accountRes.result.data;

        // State 2: Account exists but onboarding incomplete
        if (!accountData?.charges_enabled) {
            // Show real dashboard with onboarding banner
            setElementState(container, 'vitrine-content');
            showOnboardingBanner();
            // Update seller status to pending
            const statusEl = document.querySelector('.vt-seller-status');
            if (statusEl) {
                statusEl.className = 'vt-seller-status pending';
                statusEl.innerHTML = '<span class="vt-status-dot"></span> Pendente';
            }
            vitrineLoaded = true;
            return;
        }

        // State 3: Account fully active — show products
        updateStripeStatusBar(true);

        const productsRes = await fetchManager.getSellerProducts();
        console.log('[Vitrine] Products:', productsRes);
        vitrineProducts = productsRes.ok ? (productsRes.result?.products || []) : [];

        if (vitrineProducts.length > 0) {
            renderVitrineProducts(vitrineProducts);
        }
        setElementState(container, 'vitrine-content');

        // Load seller dashboard data (KPIs + seller info) in background
        loadSellerDashboardData();

        vitrineLoaded = true;
    } catch (err) {
        console.error('Error loading vitrine:', err);
        setElementState(container, 'vitrine-content');
        showGate('connect');
        vitrineLoaded = true;
    }
}

// ============================================================================
// GATE OVERLAY HELPERS
// ============================================================================

function showGate(type) {
    const overlay = document.getElementById('vt-gate-overlay');
    const lockedCard = document.getElementById('vt-gate-locked');
    const connectCard = document.getElementById('vt-gate-connect');

    if (!overlay) return;

    // Hide both cards first
    lockedCard?.classList.add('hidden');
    connectCard?.classList.add('hidden');

    // Show the right card
    if (type === 'locked') {
        lockedCard?.classList.remove('hidden');
    } else if (type === 'connect') {
        connectCard?.classList.remove('hidden');
    }

    // Show overlay
    overlay.classList.remove('hidden');
}

function hideGate() {
    const overlay = document.getElementById('vt-gate-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function showOnboardingBanner() {
    const banner = document.getElementById('vt-onboarding-banner');
    if (banner) banner.classList.remove('hidden');
}

function hideOnboardingBanner() {
    const banner = document.getElementById('vt-onboarding-banner');
    if (banner) banner.classList.add('hidden');
}

function updateStripeStatusBar(active) {
    const bars = document.querySelectorAll('.vt-stripe-bar');
    bars.forEach(bar => {
        bar.style.display = active ? 'flex' : 'none';
    });
}

// ============================================================================
// SELLER DASHBOARD DATA (KPIs + Seller Info + Sales Chart)
// Single fetch → client-side cache → JS recorte per period
// ============================================================================

function formatCentsToBRL(cents) {
    const value = (cents || 0) / 100;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Cache ──
const vitrineData = {
    ordersByDate: null, // { "dd/mm/yyyy": [{ localDateTime, seller_amount_cents }] }
};

// ── Process raw orders: UTC → local timezone, group by local date key ──
function processRawOrders(rawOrders) {
    const pad = v => String(v).padStart(2, '0');
    const result = {};

    for (const order of rawOrders) {
        const d = new Date(order.created_at); // UTC → local automatically
        const key = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

        if (!result[key]) result[key] = [];
        result[key].push({
            localDateTime: d,
            seller_amount_cents: order.seller_amount_cents || 0,
        });
    }

    return result;
}

// ── Filter orders by last N days (same pattern as filterByLastDays in contentRenderer) ──
function filterOrdersByLastDays(ordersByDate, days) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() - days);

    return Object.entries(ordersByDate)
        .filter(([key]) => {
            const [day, month, year] = key.split('/');
            let date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            date.setHours(0, 0, 0, 0);
            return date >= cutoff && date <= today;
        })
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
}

// ── Group today's orders by hour (same pattern as getDailyPackageUsage) ──
function getHourlyOrders(ordersByDate) {
    const pad = v => String(v).padStart(2, '0');
    const today = new Date();
    const todayKey = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;

    const todayOrders = ordersByDate[todayKey];
    const hourlyData = {};

    if (todayOrders) {
        for (const order of todayOrders) {
            const hour = order.localDateTime.getHours();
            const hourKey = `${pad(hour)}:00`;

            if (!hourlyData[hourKey]) {
                hourlyData[hourKey] = { revenue_cents: 0, count: 0 };
            }
            hourlyData[hourKey].revenue_cents += order.seller_amount_cents;
            hourlyData[hourKey].count++;
        }
    }

    return hourlyData;
}

// ── Aggregate daily totals from filtered orders (for chart) ──
function getDailyTotals(filteredOrders) {
    const result = {};
    for (const [dateKey, orders] of Object.entries(filteredOrders)) {
        let revenue_cents = 0;
        let count = 0;
        for (const order of orders) {
            revenue_cents += order.seller_amount_cents;
            count++;
        }
        // Use dd/mm as chart key (strip year)
        const shortKey = dateKey.substring(0, 5); // "dd/mm"
        result[shortKey] = { revenue_cents, count };
    }
    return result;
}

// ── Compute KPIs from filtered orders ──
function computeKPIs(filteredOrders) {
    let totalRevenue = 0;
    let totalSales = 0;
    for (const orders of Object.values(filteredOrders)) {
        for (const order of orders) {
            totalRevenue += order.seller_amount_cents;
            totalSales++;
        }
    }
    return { totalRevenue, totalSales };
}

// ============================================================================
// MAIN LOAD + PERIOD UPDATE
// ============================================================================

async function loadSellerDashboardData() {
    try {
        showDashboardSkeletons(true);

        const res = await fetchManager.getSellerDashboard();
        console.log('[Vitrine] Dashboard data:', res);

        if (!res.ok || !res.result) {
            showDashboardSkeletons(false);
            return;
        }

        const data = res.result;

        // ── Process and cache raw orders ──
        vitrineData.ordersByDate = processRawOrders(data.raw_orders || []);

        // ── Seller Info (static, doesn't change with period) ──
        const sellerStripeId = document.getElementById('seller-stripe-id');
        if (sellerStripeId) sellerStripeId.textContent = data.stripe_account_id || '-';

        const sellerBank = document.getElementById('seller-bank');
        if (sellerBank) {
            if (data.bank_name && data.bank_last4) {
                sellerBank.textContent = `${data.bank_name} ****${data.bank_last4}`;
            } else if (data.bank_name) {
                sellerBank.textContent = data.bank_name;
            } else {
                sellerBank.textContent = '-';
            }
        }

        const sellerCountry = document.getElementById('seller-country');
        if (sellerCountry) sellerCountry.textContent = data.country || '-';

        const statusEl = document.querySelector('.vt-seller-status');
        if (statusEl) {
            statusEl.className = 'vt-seller-status active';
            statusEl.innerHTML = '<span class="vt-status-dot"></span> Ativo';
        }

        showDashboardSkeletons(false);

        // ── Render default period (30 days) ──
        const periodSelect = document.getElementById('vt-chart-period-select');
        const defaultDays = periodSelect ? parseInt(periodSelect.value) || 30 : 30;
        updateVitrinePeriod(defaultDays);

    } catch (err) {
        console.error('[Vitrine] Error loading dashboard data:', err);
        showDashboardSkeletons(false);
    }
}

function updateVitrinePeriod(days) {
    if (!vitrineData.ordersByDate) return;

    // ── Dynamic KPI labels ──
    const kpiRevenueLabel = document.getElementById('kpi-revenue-label');
    const kpiSalesLabel = document.getElementById('kpi-sales-label');
    if (days <= 1) {
        if (kpiRevenueLabel) kpiRevenueLabel.textContent = 'Receita hoje';
        if (kpiSalesLabel) kpiSalesLabel.textContent = 'Vendas hoje';
    } else if (days <= 7) {
        if (kpiRevenueLabel) kpiRevenueLabel.textContent = 'Receita esta semana';
        if (kpiSalesLabel) kpiSalesLabel.textContent = 'Vendas esta semana';
    } else {
        if (kpiRevenueLabel) kpiRevenueLabel.textContent = 'Receita do mês';
        if (kpiSalesLabel) kpiSalesLabel.textContent = 'Vendas este mês';
    }

    if (days <= 1) {
        // ── Today: hourly chart ──
        const hourlyData = getHourlyOrders(vitrineData.ordersByDate);

        // Compute KPIs from today's data only
        const pad = v => String(v).padStart(2, '0');
        const today = new Date();
        const todayKey = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
        const todayOrders = vitrineData.ordersByDate[todayKey] ? { [todayKey]: vitrineData.ordersByDate[todayKey] } : {};
        const kpis = computeKPIs(todayOrders);

        const kpiRevenue = document.getElementById('kpi-revenue');
        if (kpiRevenue) kpiRevenue.textContent = formatCentsToBRL(kpis.totalRevenue);
        const kpiSales = document.getElementById('kpi-sales');
        if (kpiSales) kpiSales.textContent = kpis.totalSales;

        loadVitrineSalesChart(hourlyData, true);
    } else {
        // ── 7d / 30d: daily chart ──
        const filteredOrders = filterOrdersByLastDays(vitrineData.ordersByDate, days);
        const kpis = computeKPIs(filteredOrders);

        const kpiRevenue = document.getElementById('kpi-revenue');
        if (kpiRevenue) kpiRevenue.textContent = formatCentsToBRL(kpis.totalRevenue);
        const kpiSales = document.getElementById('kpi-sales');
        if (kpiSales) kpiSales.textContent = kpis.totalSales;

        const dailyTotals = getDailyTotals(filteredOrders);
        loadVitrineSalesChart(dailyTotals, false);
    }
}

function showDashboardSkeletons(show) {
    const kpiValueEls = ['kpi-revenue', 'kpi-sales'];
    kpiValueEls.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (show) {
            el.dataset.originalText = el.textContent;
            el.textContent = '';
            el.classList.add('skeleton');
            el.style.width = '80px';
            el.style.height = '24px';
            el.style.display = 'inline-block';
        } else {
            el.classList.remove('skeleton');
            el.style.width = '';
            el.style.height = '';
            el.style.display = '';
        }
    });

    const sellerEls = ['seller-stripe-id', 'seller-bank', 'seller-country'];
    sellerEls.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (show) {
            el.dataset.originalText = el.textContent;
            el.textContent = '';
            el.classList.add('skeleton');
            el.style.width = '100px';
            el.style.height = '16px';
            el.style.display = 'inline-block';
        } else {
            el.classList.remove('skeleton');
            el.style.width = '';
            el.style.height = '';
            el.style.display = '';
        }
    });
}

// ============================================================================
// SALES CHART (Chart.js — matches loadUsageChart style)
// Supports both daily (dd/mm labels) and hourly (HH:00 labels) modes
// ============================================================================

function loadVitrineSalesChart(dataObject, isHourly = false) {
    const canvas = document.getElementById('vitrineSalesChart');
    if (!canvas) return;

    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    const ctx = canvas.getContext('2d');

    const labels = Object.keys(dataObject);
    const revenueData = labels.map(key => (dataObject[key].revenue_cents || 0) / 100);

    // If no data, show empty state
    if (labels.length === 0) {
        const now = new Date();
        const emptyLabel = isHourly ? '00:00' : `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
        labels.push(emptyLabel);
        revenueData.push(0);
    }

    const maxValue = revenueData.length > 0 ? Math.max(...revenueData) : 0;
    const yAxisMax = maxValue === 0 ? 10 : maxValue * 1.2;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: revenueData,
                borderColor: '#4184e4',
                backgroundColor: function (context) {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                    gradient.addColorStop(0, 'rgba(65, 132, 228, 0.3)');
                    gradient.addColorStop(1, 'rgba(65, 132, 228, 0)');
                    return gradient;
                },
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#4184e4',
                pointBorderColor: '#141619',
                pointBorderWidth: 2,
                pointHoverRadius: 5,
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
                    backgroundColor: '#1c1f20',
                    borderColor: '#333840',
                    borderWidth: 1,
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    cornerRadius: 8,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: (items) => {
                            const key = labels[items[0].dataIndex];
                            return isHourly ? `🕐 ${key}` : `📅 ${key}`;
                        },
                        label: (item) => {
                            const key = labels[item.dataIndex];
                            const d = dataObject[key] || { revenue_cents: 0, count: 0 };
                            const revenue = formatCentsToBRL(d.revenue_cents);
                            return [`Receita: ${revenue}`, `Vendas: ${d.count}`];
                        },
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#8e9091',
                        font: { size: 11 },
                        maxRotation: isHourly ? 45 : 0,
                        minRotation: isHourly ? 45 : 0,
                        maxTicksLimit: isHourly ? 24 : 10,
                    }
                },
                y: {
                    beginAtZero: true,
                    max: yAxisMax,
                    grid: { color: '#333840' },
                    ticks: {
                        color: '#8e9091',
                        callback: v => `R$ ${v.toFixed(0)}`
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

// ── Date range picker listener (pure JS recorte, no re-fetch) ──
document.getElementById('vt-chart-period-select')?.addEventListener('change', (e) => {
    const days = parseInt(e.target.value) || 30;
    updateVitrinePeriod(days);
});

// ── Stripe Dashboard Link Button ──
document.getElementById('btn-stripe-dashboard')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-stripe-dashboard');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg> Abrindo...`;

    try {
        const res = await fetchManager.getSellerDashboardLink();
        if (res.ok && res.result?.url) {
            window.open(res.result.url, '_blank');
        } else {
            console.error('[Vitrine] Failed to get dashboard link:', res);
            notify('error', 'Erro ao abrir painel Stripe');
        }
    } catch (err) {
        console.error('[Vitrine] Dashboard link error:', err);
        notify('error', 'Erro de conexao');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
});

// ============================================================================
// PRODUCT RENDERING
// ============================================================================

function renderVitrineProducts(products) {
    const grid = document.getElementById('vitrine-products-grid');
    if (!grid) return;
    grid.innerHTML = '';

    products.forEach(product => {
        const card = createVitrineProductCard(product);
        grid.appendChild(card);
    });
}

function createVitrineProductCard(product) {
    const card = document.createElement('div');
    card.className = 'vp-card';
    if (product.status === 'paused') card.classList.add('vp-paused');
    card.dataset.productId = product.id;

    const sessions = product.sessions || [];
    const billingType = product.billing_type || product.billingType || 'one_time';
    const priceValue = parseFloat(product.price_cents || 0) / 100;
    const priceStr = priceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const slug = product.slug || product.id;
    const isPaused = product.status === 'paused';
    const totalSales = product.total_sales_count || 0;
    const activeAccess = product.active_access_count || 0;

    // === Header: title + badge ===
    const header = document.createElement('div');
    header.className = 'vp-header';

    const name = document.createElement('h3');
    name.className = 'vp-name';
    name.textContent = product.package_name || product.name;
    header.appendChild(name);

    if (isPaused) {
        const pausedBadge = document.createElement('span');
        pausedBadge.className = 'vp-paused-badge';
        pausedBadge.textContent = 'Pausado';
        header.appendChild(pausedBadge);
    } else {
        const badge = document.createElement('span');
        badge.className = `vp-billing-badge ${billingType === 'subscription' ? 'subscription' : 'one-time'}`;
        badge.textContent = billingType === 'subscription' ? 'Assinatura' : 'Pagamento único';
        header.appendChild(badge);
    }

    card.appendChild(header);

    // === Icons row (max 3 visible, +N badge if more) ===
    if (sessions.length > 0) {
        const iconsRow = document.createElement('div');
        iconsRow.className = 'vp-icons-row';
        const maxIcons = 3;
        const visibleSessions = sessions.slice(0, maxIcons);
        const remaining = sessions.length - maxIcons;

        visibleSessions.forEach((s, i) => {
            const icon = document.createElement('div');
            icon.className = 'vp-icon';
            const img = document.createElement('img');
            img.src = s.icon;
            img.alt = s.name;
            icon.appendChild(img);

            // Add +N badge on the last visible icon if there are more
            if (i === visibleSessions.length - 1 && remaining > 0) {
                const badge = document.createElement('span');
                badge.className = 'vp-icon-count';
                badge.textContent = `+${remaining}`;
                icon.appendChild(badge);
            }

            iconsRow.appendChild(icon);
        });
        card.appendChild(iconsRow);
    }

    // === Description ===
    const desc = document.createElement('p');
    desc.className = 'vp-desc';
    desc.textContent = product.description || product.package_name || '';
    card.appendChild(desc);

    // === Price ===
    const priceRow = document.createElement('div');
    priceRow.className = 'vp-price-row';
    const priceEl = document.createElement('span');
    priceEl.className = 'vp-price';
    priceEl.textContent = `R$ ${priceStr}`;
    priceRow.appendChild(priceEl);

    if (billingType === 'subscription') {
        const period = document.createElement('span');
        period.className = 'vp-period';
        period.textContent = '/mês';
        priceRow.appendChild(period);
    }
    card.appendChild(priceRow);

    // === Stats row ===
    const statsRow = document.createElement('div');
    statsRow.className = 'vp-stats-row';

    // Total sales stat (historical, never decreases)
    const salesStat = document.createElement('div');
    salesStat.className = 'vp-stat';
    salesStat.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
    salesStat.innerHTML += `<strong>${totalSales}</strong> vendas`;
    statsRow.appendChild(salesStat);

    // Active access stat (for all product types)
    const activeStat = document.createElement('div');
    activeStat.className = 'vp-stat';
    activeStat.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    activeStat.innerHTML += `<strong>${activeAccess}</strong> ativos`;
    statsRow.appendChild(activeStat);

    card.appendChild(statsRow);

    // === Stock progress bar (only if stock is limited) ===
    if (product.stock != null) {
        const stockBar = document.createElement('div');
        stockBar.className = 'vp-stock-bar';

        const track = document.createElement('div');
        track.className = 'vp-stock-track';
        const fill = document.createElement('div');
        fill.className = 'vp-stock-fill';

        const pct = Math.min(100, (activeAccess / product.stock) * 100);
        fill.style.width = `${pct}%`;
        if (pct >= 100) fill.classList.add('depleted');
        else if (pct >= 80) fill.classList.add('warning');

        track.appendChild(fill);
        stockBar.appendChild(track);

        const label = document.createElement('span');
        label.className = 'vp-stock-label';
        label.innerHTML = `<strong>${activeAccess}</strong>/${product.stock} vagas preenchidas`;
        stockBar.appendChild(label);

        card.appendChild(stockBar);
    }

    // === View button ===
    const viewBtn = document.createElement('a');
    viewBtn.className = 'vp-view-btn';
    viewBtn.href = `/pages/product/?slug=${slug}`;
    viewBtn.target = '_blank';
    viewBtn.textContent = 'Ver detalhes';
    card.appendChild(viewBtn);

    // === Overlay actions (hover options) ===
    const overlay = document.createElement('div');
    overlay.className = 'vp-overlay-actions';

    // Copy link button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'vp-copy-btn';
    copyBtn.title = 'Copiar link';
    copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
    copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = `${window.location.origin}/pages/product/?slug=${slug}`;
        navigator.clipboard.writeText(url).then(() => notify('success', 'Link copiado!'));
    });

    // Options button (⋯)
    const optionsBtn = document.createElement('button');
    optionsBtn.className = 'product-options-btn';
    optionsBtn.textContent = '⋯';

    // Product options menu
    const productOptions = document.createElement('div');
    productOptions.className = 'product-options hidden';

    // Edit option
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-product-btn';
    editBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
        </svg>
    `;
    editBtn.appendChild(document.createTextNode('Editar'));
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        productOptions.classList.add('hidden');
        openEditProductModal(product);
    });
    // Dropdown order: Pausar/Retomar first, then Editar, then Excluir
    if (isPaused) {
        const resumeBtn = document.createElement('button');
        resumeBtn.className = 'resume-product-btn';
        resumeBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6"></path>
                <path d="M21.34 15.57a10 10 0 1 1-.57-8.38"></path>
            </svg>
        `;
        resumeBtn.appendChild(document.createTextNode('Retomar'));
        resumeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            productOptions.classList.add('hidden');
            try {
                const res = await fetchManager.reactivateProduct(product.id);
                if (res.ok) {
                    notify('success', 'Produto retomado');
                    vitrineLoaded = false;
                    await loadVitrineTab();
                } else {
                    notify('error', 'Erro ao retomar');
                }
            } catch (err) {
                console.error('Resume error:', err);
                notify('error', 'Erro de conexão');
            }
        });
        productOptions.appendChild(resumeBtn);
    } else {
        const pauseBtn = document.createElement('button');
        pauseBtn.className = 'pause-product-btn';
        pauseBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M10 15V9"/>
                <path d="M14 15V9"/>
            </svg>
        `;
        pauseBtn.appendChild(document.createTextNode('Pausar'));
        pauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            productOptions.classList.add('hidden');
            openDeleteProductModal(product);
        });
        productOptions.appendChild(pauseBtn);
    }

    productOptions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-product-btn';
    deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
    `;
    deleteBtn.appendChild(document.createTextNode('Excluir'));
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        productOptions.classList.add('hidden');
        openHardDeleteProductModal(product);
    });
    productOptions.appendChild(deleteBtn);

    optionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.product-options:not(.hidden)').forEach(opt => {
            if (opt !== productOptions) opt.classList.add('hidden');
        });
        productOptions.classList.toggle('hidden');
    });

    overlay.appendChild(copyBtn);
    overlay.appendChild(optionsBtn);
    card.appendChild(overlay);
    card.appendChild(productOptions);

    return card;
}


// ============================================================================
// STRIPE CONNECT
// ============================================================================

document.getElementById('btn-connect-stripe')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-connect-stripe');
    btn.disabled = true;
    btn.textContent = 'Conectando...';

    try {
        const res = await fetchManager.startSellerOnboarding();
        console.log('[Vitrine] Onboarding response:', res);
        if (res.ok && res.result?.url) {
            window.location.href = res.result.url;
        } else {
            console.warn('[Vitrine] Onboarding failed, response:', res);
            btn.textContent = 'Erro — tente novamente';
            btn.disabled = false;
        }
    } catch (err) {
        console.error('Stripe onboarding error:', err);
        btn.textContent = 'Erro — tente novamente';
        btn.disabled = false;
    }
});

// Continue onboarding (pending state)
document.getElementById('btn-continue-onboarding')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-continue-onboarding');
    btn.disabled = true;
    btn.textContent = 'Redirecionando...';

    try {
        const res = await fetchManager.startSellerOnboarding();
        if (res.ok && res.result?.url) {
            window.location.href = res.result.url;
        } else {
            btn.textContent = 'Erro — tente novamente';
            btn.disabled = false;
        }
    } catch (err) {
        console.error('Continue onboarding error:', err);
        btn.textContent = 'Erro — tente novamente';
        btn.disabled = false;
    }
});

// ============================================================================
// CREATE PRODUCT MODAL
// ============================================================================

function openCreateProductModal() {
    // Reset state
    createProductState = {
        step: 1,
        packageId: null,
        packageName: '',
        sessions: [],
        description: '',
        billingType: 'one_time',
        price: '',
        stock: '',
    };

    // Reset UI
    document.getElementById('product-description').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-stock').value = '';

    // Reset billing options
    document.querySelectorAll('.billing-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.type === 'one_time');
    });
    document.querySelector('.subscription-note').style.display = 'none';

    // Hide error
    const errorEl = document.getElementById('create-product-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    // Render packages list
    renderStepPackages();

    // Show step 1
    goToStep(1);

    // Reset button
    const nextBtn = document.getElementById('product-step-next');
    nextBtn.textContent = 'Próximo';

    const btnContainer = nextBtn.closest('.buttonContent');
    setElementState(btnContainer, 'content');

    // Open modal
    const modal = document.getElementById('createProductModal');
    modal.classList.add('show');
}

function closeCreateProductModal() {
    const modal = document.getElementById('createProductModal');
    modal.classList.remove('show');
}

function renderStepPackages() {
    const list = document.getElementById('step-packages-list');
    const emptyEl = document.getElementById('step-empty-packages');

    const packages = packagesList?.userCollection || [];

    if (packages.length === 0) {
        list.style.display = 'none';
        emptyEl.style.display = '';
        return;
    }

    list.style.display = '';
    emptyEl.style.display = 'none';
    list.innerHTML = '';

    packages.forEach(pkg => {
        const item = document.createElement('div');
        item.className = 'step-package-item';
        item.dataset.packageId = pkg.id;

        // Icons
        const icons = document.createElement('div');
        icons.className = 'step-package-icons';
        (pkg.sessions || []).slice(0, 3).forEach(s => {
            const iconWrap = document.createElement('div');
            iconWrap.className = 'stack-icon';
            const img = document.createElement('img');
            img.src = s.icon;
            img.alt = s.name;
            iconWrap.appendChild(img);
            icons.appendChild(iconWrap);
        });

        const name = document.createElement('span');
        name.className = 'step-package-name';
        name.textContent = pkg.name;

        item.appendChild(icons);
        item.appendChild(name);

        item.addEventListener('click', () => {
            list.querySelectorAll('.step-package-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            createProductState.packageId = pkg.id;
            createProductState.packageName = pkg.name;
            createProductState.sessions = pkg.sessions || [];
        });

        list.appendChild(item);
    });
}

function goToStep(stepNum) {
    createProductState.step = stepNum;

    // Update step dots
    document.querySelectorAll('.step-dot').forEach(dot => {
        const dotStep = parseInt(dot.dataset.step);
        dot.classList.remove('active', 'completed');
        if (dotStep === stepNum) dot.classList.add('active');
        else if (dotStep < stepNum) dot.classList.add('completed');
    });

    // Update step panels
    document.querySelectorAll('.product-step').forEach(panel => {
        panel.classList.toggle('active', parseInt(panel.dataset.step) === stepNum);
    });

    // Update back button
    document.getElementById('product-step-back').style.display = stepNum > 1 ? '' : 'none';

    // Update next button text
    const nextBtn = document.getElementById('product-step-next');
    if (stepNum === 6) {
        nextBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>Publicar produto';
    } else {
        nextBtn.textContent = 'Próximo';
    }
}

function showCreateProductError(msg) {
    const errorEl = document.getElementById('create-product-error');
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
}

function hideCreateProductError() {
    const errorEl = document.getElementById('create-product-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
}

function renderReviewSummary() {
    const container = document.getElementById('review-summary');
    const s = createProductState;

    const typeLabel = s.billingType === 'subscription' ? 'Assinatura mensal' : 'Pagamento único';

    container.innerHTML = `
        <div class="review-row">
            <span class="review-label">Pacote</span>
            <span class="review-value">${escapeHtml(s.packageName)}</span>
        </div>
        <div class="review-row">
            <span class="review-label">Tipo</span>
            <span class="review-value">${typeLabel}</span>
        </div>
        <div class="review-row">
            <span class="review-label">Preço</span>
            <span class="review-value">R$ ${parseFloat(s.price).toFixed(2)}</span>
        </div>
        <div class="review-row">
            <span class="review-label">Quantidade</span>
            <span class="review-value">${s.stock ? s.stock : 'Ilimitado'}</span>
        </div>
    `;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Step navigation
document.getElementById('product-step-next')?.addEventListener('click', async () => {
    hideCreateProductError();
    const step = createProductState.step;

    // Validate current step
    switch (step) {
        case 1:
            if (!createProductState.packageId) {
                showCreateProductError('Selecione um pacote');
                return;
            }
            break;
        case 2:
            createProductState.description = document.getElementById('product-description').value.trim();
            break;
        case 3:
            // billingType already set via click handler
            break;
        case 4:
            createProductState.price = document.getElementById('product-price').value;
            if (!createProductState.price || parseFloat(createProductState.price) < 1) {
                showCreateProductError('Defina um preço válido (mínimo R$ 1,00)');
                return;
            }
            break;
        case 5:
            const stockVal = document.getElementById('product-stock').value.trim();
            createProductState.stock = stockVal || null;
            if (stockVal && parseInt(stockVal) < 1) {
                showCreateProductError('Quantidade deve ser pelo menos 1');
                return;
            }
            // Prepare review
            renderReviewSummary();
            break;
        case 6:
            // SUBMIT
            await submitCreateProduct();
            return;
    }

    goToStep(step + 1);
});

document.getElementById('product-step-back')?.addEventListener('click', () => {
    hideCreateProductError();
    if (createProductState.step > 1) {
        goToStep(createProductState.step - 1);
    }
});

// Billing type selection
document.querySelectorAll('.billing-option').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.billing-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        createProductState.billingType = opt.dataset.type;

        const subNote = document.querySelector('.subscription-note');
        subNote.style.display = opt.dataset.type === 'subscription' ? '' : 'none';
    });
});

// Submit product creation
async function submitCreateProduct() {
    const nextBtn = document.getElementById('product-step-next');
    const btnContainer = nextBtn.closest('.buttonContent');
    setElementState(btnContainer, 'loading');

    try {
        const s = createProductState;
        const res = await fetchManager.createProduct({
            package_id: s.packageId,
            description: s.description,
            billing_type: s.billingType,
            price_cents: Math.round(parseFloat(s.price) * 100),
            currency: 'brl',
            stock: s.stock ? parseInt(s.stock) : null,
        });

        if (res.ok) {
            closeCreateProductModal();
            notify('success', 'Produto criado com sucesso!');

            // Reload vitrine
            vitrineLoaded = false;
            await loadVitrineTab();
        } else {
            showCreateProductError(res.result?.error || 'Erro ao criar produto');
            setElementState(btnContainer, 'content');
        }
    } catch (err) {
        console.error('Create product error:', err);
        showCreateProductError('Erro de conexão');
        setElementState(btnContainer, 'content');
    }
}

// Modal open/close handlers
document.getElementById('btn-create-product')?.addEventListener('click', openCreateProductModal);

// Close modal handlers
document.getElementById('createProductModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCreateProductModal();
});
document.querySelector('#createProductModal .close-btn')?.addEventListener('click', closeCreateProductModal);

// ============================================================================
// DELETE PRODUCT MODAL
// ============================================================================

let deleteProductId = null;

function openDeleteProductModal(product) {
    deleteProductId = product.id;
    document.getElementById('delete-product-name').textContent = product.package_name || product.name;

    const btnContainer = document.querySelector('#deleteProductModal .buttonContent');
    setElementState(btnContainer, 'content');

    const modal = document.getElementById('deleteProductModal');
    modal.classList.add('show');
}

function closeDeleteProductModal() {
    const modal = document.getElementById('deleteProductModal');
    modal.classList.remove('show');
    deleteProductId = null;
}

document.getElementById('confirm-delete-product')?.addEventListener('click', async () => {
    if (!deleteProductId) return;

    const btnContainer = document.querySelector('#deleteProductModal .buttonContent');
    setElementState(btnContainer, 'loading');

    try {
        const res = await fetchManager.deleteProduct(deleteProductId);
        if (res.ok) {
            closeDeleteProductModal();
            notify('success', 'Produto pausado');

            // Reload
            vitrineLoaded = false;
            await loadVitrineTab();
        } else {
            notify('error', 'Erro ao pausar produto');
            setElementState(btnContainer, 'content');
        }
    } catch (err) {
        console.error('Delete product error:', err);
        notify('error', 'Erro de conexão');
        setElementState(btnContainer, 'content');
    }
});

document.getElementById('deleteProductModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDeleteProductModal();
});
document.querySelector('#deleteProductModal .cancel-btn')?.addEventListener('click', closeDeleteProductModal);

// ============================================================================
// EDIT PRODUCT MODAL
// ============================================================================

let editProductData = null;

function openEditProductModal(product) {
    editProductData = product;
    document.getElementById('edit-product-desc').value = product.description || '';

    const btnContainer = document.querySelector('#editProductModal .buttonContent');
    if (btnContainer) setElementState(btnContainer, 'content');

    const modal = document.getElementById('editProductModal');
    modal.classList.add('show');
}

function closeEditProductModal() {
    const modal = document.getElementById('editProductModal');
    modal.classList.remove('show');
    editProductData = null;
}

document.getElementById('confirm-edit-product')?.addEventListener('click', async () => {
    if (!editProductData) return;

    const description = document.getElementById('edit-product-desc').value.trim();

    const btnContainer = document.querySelector('#editProductModal .buttonContent');
    setElementState(btnContainer, 'loading');

    try {
        const res = await fetchManager.updateProduct(editProductData.id, { description });
        if (res.ok) {
            closeEditProductModal();
            notify('success', 'Produto atualizado');

            vitrineLoaded = false;
            await loadVitrineTab();
        } else {
            notify('error', res.result?.error || 'Erro ao atualizar');
            setElementState(btnContainer, 'content');
        }
    } catch (err) {
        console.error('Edit product error:', err);
        notify('error', 'Erro de conexão');
        setElementState(btnContainer, 'content');
    }
});

document.getElementById('editProductModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeEditProductModal();
});
document.querySelector('#editProductModal .close-btn')?.addEventListener('click', closeEditProductModal);
document.querySelector('#editProductModal .cancel-btn')?.addEventListener('click', closeEditProductModal);

// ============================================================================
// HARD DELETE PRODUCT MODAL
// ============================================================================

let hardDeleteProductId = null;

function openHardDeleteProductModal(product) {
    hardDeleteProductId = product.id;
    document.getElementById('hard-delete-product-name').textContent = product.package_name || product.name;

    const btnContainer = document.querySelector('#hardDeleteProductModal .buttonContent');
    setElementState(btnContainer, 'content');

    const modal = document.getElementById('hardDeleteProductModal');
    modal.classList.add('show');
}

function closeHardDeleteProductModal() {
    const modal = document.getElementById('hardDeleteProductModal');
    modal.classList.remove('show');
    hardDeleteProductId = null;
}

document.getElementById('confirm-hard-delete-product')?.addEventListener('click', async () => {
    if (!hardDeleteProductId) return;

    const btnContainer = document.querySelector('#hardDeleteProductModal .buttonContent');
    setElementState(btnContainer, 'loading');

    try {
        const res = await fetchManager.hardDeleteProduct(hardDeleteProductId);
        if (res.ok) {
            closeHardDeleteProductModal();
            notify('success', 'Produto excluído permanentemente');

            vitrineLoaded = false;
            await loadVitrineTab();
        } else {
            notify('error', 'Erro ao excluir produto');
            setElementState(btnContainer, 'content');
        }
    } catch (err) {
        console.error('Hard delete product error:', err);
        notify('error', 'Erro de conexão');
        setElementState(btnContainer, 'content');
    }
});

document.getElementById('hardDeleteProductModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeHardDeleteProductModal();
});
document.querySelector('#hardDeleteProductModal .cancel-btn')?.addEventListener('click', closeHardDeleteProductModal);


// ============================================================================
// SALES HISTORY MODAL
// ============================================================================

let allSalesHistory = [];

async function openSalesHistoryModal() {
    const modal = document.getElementById('salesHistoryModal');
    if (!modal) return;

    modal.classList.add('show');

    const loadingEl = document.getElementById('salesHistoryLoading');
    const wrapEl = document.getElementById('salesHistoryWrap');

    loadingEl.style.display = 'flex';
    wrapEl.innerHTML = '';

    try {
        const res = await fetchManager.getSellerSalesHistory();
        if (res.ok && res.result?.orders) {
            allSalesHistory = res.result.orders || [];
            renderSalesHistory(allSalesHistory);
        } else {
            wrapEl.innerHTML = '<div class="sh-empty-state">Erro ao carregar o histórico.</div>';
        }
    } catch (err) {
        console.error('Falha ao carregar historico:', err);
        wrapEl.innerHTML = '<div class="sh-empty-state">Erro de conexão.</div>';
    } finally {
        loadingEl.style.display = 'none';
    }
}

function closeSalesHistoryModal() {
    const modal = document.getElementById('salesHistoryModal');
    if (modal) modal.classList.remove('show');
    allSalesHistory = [];
}

document.getElementById('btn-sales-history')?.addEventListener('click', openSalesHistoryModal);
document.getElementById('salesHistoryModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSalesHistoryModal();
});
document.querySelector('#salesHistoryModal .close-btn')?.addEventListener('click', closeSalesHistoryModal);

// Helper for formatting currency value without symbol (e.g. "59,90")
function formatBRLValue(cents) {
    return ((cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function renderSalesHistory(orders) {
    const wrapEl = document.getElementById('salesHistoryWrap');
    if (orders.length === 0) {
        wrapEl.innerHTML = '<div class="sh-empty-state">Nenhuma venda realizada ainda.</div>';
        return;
    }

    let totalRevenue = 0;
    let totalSales = 0;

    // 1) Agrupar por ano -> mês
    const grouped = {};
    orders.forEach(order => {
        const d = new Date(order.created_at);
        const y = d.getFullYear();
        const m = d.getMonth(); // 0-11

        if (!grouped[y]) {
            grouped[y] = { revenue: 0, net: 0, sales: 0, months: {} };
        }
        if (!grouped[y].months[m]) {
            grouped[y].months[m] = { revenue: 0, net: 0, sales: 0, list: [] };
        }

        // receita = valor bruto (o que o seller definiu como preço do produto) = total - taxa plataforma (2 BRL)
        // liquido = valor líquido (o que o seller recebe) = total - taxa plataforma - taxa stripe
        const plataformaFeeCents = 200; // Taxa fixa de R$ 2,00 adicionada no checkout
        const receita = Math.max(0, (order.total_amount_cents || 0) - plataformaFeeCents);
        const liquido = order.seller_amount_cents || 0;

        totalRevenue += receita;
        totalSales++;

        grouped[y].revenue += receita;
        grouped[y].net += liquido;
        grouped[y].sales++;

        grouped[y].months[m].revenue += receita;
        grouped[y].months[m].net += liquido;
        grouped[y].months[m].sales++;

        grouped[y].months[m].list.push({
            ...order,
            dateObj: d,
            receita,
            liquido
        });
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // 2) Gerar HTML
    const yearsSorted = Object.keys(grouped).sort((a, b) => b - a); // Descending years

    wrapEl.innerHTML = '';

    yearsSorted.forEach(yStr => {
        const yData = grouped[yStr];
        const year = parseInt(yStr);

        const yearSection = document.createElement('div');
        yearSection.className = 'sh-year-group';

        // Year header block
        const yHeader = document.createElement('div');
        yHeader.className = 'sh-year-header';
        yHeader.innerHTML = `
            <div class="sh-year-stats">
                <div class="sh-year-stat">
                    <span class="sh-year-stat-label">Receita Bruta</span>
                    <span class="sh-year-stat-value">R$ ${formatBRLValue(yData.revenue)}</span>
                </div>
                <div class="sh-year-divider"></div>
                <div class="sh-year-stat">
                    <span class="sh-year-stat-label">Receita Líquida</span>
                    <span class="sh-year-stat-value highlight">R$ ${formatBRLValue(yData.net)}</span>
                </div>
                <div class="sh-year-divider"></div>
                <div class="sh-year-stat">
                    <span class="sh-year-stat-label">Vendas</span>
                    <span class="sh-year-stat-value">${yData.sales}</span>
                </div>
            </div>
            <div class="sh-year-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
                ${year}
            </div>
        `;
        yearSection.appendChild(yHeader);

        // Months sorted descending
        const monthsSorted = Object.keys(yData.months).sort((a, b) => b - a);

        monthsSorted.forEach(mStr => {
            const mData = yData.months[mStr];
            const month = parseInt(mStr);

            const isCurrentMonth = (year === currentYear && month === currentMonth);

            const mGroup = document.createElement('div');
            mGroup.className = `sh-month-group ${isCurrentMonth ? 'open' : ''}`;

            // Month toggle button
            const mBtn = document.createElement('button');
            mBtn.className = 'sh-month-btn';
            mBtn.innerHTML = `
                <div class="sh-month-title-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toggle-icon"><path d="m6 9 6 6 6-6"/></svg>
                    <span>${MONTH_NAMES[month]}</span>
                    ${isCurrentMonth ? '<span class="sh-month-tag">(Esse mês)</span>' : ''}
                    <span class="sh-month-val-green">R$ ${formatBRLValue(mData.net)}</span>
                </div>
                <div class="sh-month-stats">
                    R$ ${formatBRLValue(mData.revenue)}
                    <button class="sh-dots-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                </div>
            `;

            const mContent = document.createElement('div');
            mContent.className = 'sh-month-content';

            // Render items logic with pagination
            let currentLimit = 10;
            const renderItems = () => {
                mContent.innerHTML = `
                    <div class="sh-table-header">
                        <div class="sh-col sh-col-id">ID</div>
                        <div class="sh-col sh-col-prod">Produto</div>
                        <div class="sh-col sh-col-user">Comprador</div>
                        <div class="sh-col sh-col-val">Valor</div>
                        <div style="width: 28px;"></div>
                    </div>
                `;
                const itemsToShow = mData.list.slice(0, currentLimit);

                itemsToShow.forEach(order => {
                    const item = document.createElement('div');
                    item.className = 'sh-sale-item';

                    const day = String(order.dateObj.getDate()).padStart(2, '0');
                    const monthShort = MONTH_SHORT[order.dateObj.getMonth()];

                    const pName = order.product_name || 'Produto';
                    const splitP = pName.split(' ');
                    const initialP = splitP[0] ? splitP[0][0].toUpperCase() : 'P';

                    const buyerName = order.buyer_name || 'Usuário';
                    const splitU = buyerName.split(' ');
                    const initialU = splitU[0] ? splitU[0][0].toUpperCase() : 'U';

                    const userAvatarHtml = order.buyer_picture
                        ? `<img src="${order.buyer_picture}" alt="${buyerName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`
                        : initialU;

                    const hours = String(order.dateObj.getHours()).padStart(2, '0');
                    const mins = String(order.dateObj.getMinutes()).padStart(2, '0');
                    const timeStr = `${hours}:${mins}`;

                    item.innerHTML = `
                        <div class="sh-col sh-col-id">#${order.product_id.split('-')[0].toUpperCase()}</div>

                        <div class="sh-col sh-col-prod">
                            <div class="sh-texts">
                                <span class="sh-title">${pName}</span>
                                <span class="sh-sub date-sub">${day} ${monthShort} • ${timeStr}</span>
                            </div>
                        </div>

                        <div class="sh-col sh-col-user">
                            <div class="sh-avatar user-avatar" ${order.buyer_picture ? 'style="background: none;"' : ''}>${userAvatarHtml}</div>
                            <div class="sh-texts">
                                <span class="sh-title">${buyerName}</span>
                                <span class="sh-sub">${order.buyer_email || ''}</span>
                            </div>
                        </div>

                        <div class="sh-col sh-col-val">
                            <div class="sh-sale-revenue">R$ ${formatBRLValue(order.receita)}</div>
                            ${order.liquido !== order.receita ? `<div class="sh-sale-net" title="Valor Líquido">Liq: R$ ${formatBRLValue(order.liquido)}</div>` : ''}
                        </div>
                        
                        <button class="sh-sale-actions">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                    `;
                    mContent.appendChild(item);
                });

                if (currentLimit < mData.list.length) {
                    const btnMore = document.createElement('button');
                    btnMore.className = 'sh-load-more';
                    btnMore.textContent = 'Carregar mais vendas';
                    const wrapBtn = document.createElement('div');
                    wrapBtn.className = 'sh-load-more-wrap';
                    wrapBtn.appendChild(btnMore);
                    mContent.appendChild(wrapBtn);

                    btnMore.addEventListener('click', (e) => {
                        e.stopPropagation();
                        currentLimit += 10;
                        renderItems();
                    });
                }
            };

            renderItems();

            // Toggle Logic (rotation handled by CSS: .sh-month-group.open .toggle-icon)
            mBtn.addEventListener('click', () => {
                mGroup.classList.toggle('open');
            });

            mGroup.appendChild(mBtn);
            mGroup.appendChild(mContent);
            yearSection.appendChild(mGroup);
        });

        wrapEl.appendChild(yearSection);
    });
}
