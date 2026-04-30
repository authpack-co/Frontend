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

    // Always hide gate + banners first
    hideGate();
    hideOnboardingBanner();
    hideKycBanner();
    // Ensure "Criar produto" is visible by default (it may have been hidden in KYC state)
    document.getElementById('btn-create-product')?.classList.remove('hidden');

    // Check if user is Plus
    if (!currentUserInfo || currentUserInfo.plan !== 'plus') {
        // Free user: show content state with blurred gate
        setElementState(container, 'vitrine-content');
        showGate('locked');
        vitrineLoaded = true;
        return;
    }

    // User is Plus — check gateway recipient status
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

        // State 2: Account exists — check live KYC status
        const kycRes = await fetchManager.getSellerKycStatus();
        console.log('[Vitrine] KYC status:', kycRes);

        if (!kycRes.ok || kycRes.result?.kyc_needed) {
            // State 2: KYC pending — block selling until identity verified
            setElementState(container, 'vitrine-content');
            showKycBanner();
            // Hide "Criar produto" button
            document.getElementById('btn-create-product')?.classList.add('hidden');
            // Update seller status badge
            const statusEl = document.querySelector('.vt-seller-status');
            if (statusEl) {
                statusEl.className = 'vt-seller-status pending';
                statusEl.innerHTML = '<span class="vt-status-dot"></span> Pendente';
            }
            vitrineLoaded = true;
            return;
        }

        // State 3: Account fully active — show products
        updateGatewayStatusBar(true);

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

function showKycBanner() {
    const banner = document.getElementById('vt-kyc-banner');
    if (banner) banner.classList.remove('hidden');
}

function hideKycBanner() {
    const banner = document.getElementById('vt-kyc-banner');
    if (banner) banner.classList.add('hidden');
}

function updateGatewayStatusBar(active) {
    const bars = document.querySelectorAll('.vt-gateway-bar');
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
        const sellerRecipientId = document.getElementById('seller-recipient-id');
        if (sellerRecipientId) sellerRecipientId.textContent = data.gateway_recipient_id || data.stripe_account_id || '-';

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

    const sellerEls = ['seller-recipient-id', 'seller-bank', 'seller-country'];
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

// (Stripe dashboard link removed — Pagar.me seller manages account within AuthPack)

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
    const viewBtn = document.createElement('button');
    viewBtn.className = 'vp-view-btn';
    viewBtn.textContent = 'Ver detalhes';
    viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openProductDetailsModal(product);
    });
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
// SELLER ONBOARDING (Pagar.me)
// ============================================================================

let onboardingType = 'individual';

function openOnboardingModal() {
    const modal = document.getElementById('sellerOnboardingModal');
    if (!modal) return;
    modal.classList.add('show');
    modal.removeAttribute('aria-hidden');
    resetOnboardingForm();
}

function closeOnboardingModal() {
    const modal = document.getElementById('sellerOnboardingModal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
}

function resetOnboardingForm() {
    onboardingType = 'individual';
    updateOnboardingTabs();
    document.querySelectorAll('#sellerOnboardingModal input, #sellerOnboardingModal select').forEach(el => {
        if (el.tagName === 'SELECT') {
            el.selectedIndex = 0;
        } else {
            el.value = '';
        }
    });
    const otherInput = document.getElementById('onb-bank-bank-other');
    if (otherInput) otherInput.classList.add('hidden');
    const errorEl = document.getElementById('onboarding-error');
    if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.textContent = '';
    }
    const submitBtn = document.getElementById('onboarding-submit');
    const btnContainer = submitBtn?.closest('.buttonContent');
    if (btnContainer) setElementState(btnContainer, 'content');
}

function updateOnboardingTabs() {
    document.querySelectorAll('.onboarding-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.type === onboardingType);
    });
    const pfFields = document.getElementById('onb-pf-fields');
    const pjFields = document.getElementById('onb-pj-fields');
    if (pfFields) pfFields.classList.toggle('hidden', onboardingType !== 'individual');
    if (pjFields) pjFields.classList.toggle('hidden', onboardingType !== 'corporation');
}

function getOnboardingValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function getBankCode() {
    const select = document.getElementById('onb-bank-bank');
    if (!select) return '';
    if (select.value === 'other') {
        const otherInput = document.getElementById('onb-bank-bank-other');
        return sanitizeNumbers(otherInput ? otherInput.value : '');
    }
    return select.value;
}

function sanitizeNumbers(str) {
    return (str || '').replace(/\D/g, '');
}

function formatDateBR(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function showOnboardingError(msg) {
    const el = document.getElementById('onboarding-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
}

function validateAndBuildPayload() {
    const email = getOnboardingValue('onb-email');
    if (!email) return { error: 'Informe o e-mail.' };

    const site_url = getOnboardingValue(onboardingType === 'individual' ? 'onb-site_url' : 'onb-pj-site_url') || undefined;

    let register_information = { email, type: onboardingType };
    if (site_url) register_information.site_url = site_url;

    if (onboardingType === 'individual') {
        const name = getOnboardingValue('onb-pf-name');
        const document = sanitizeNumbers(getOnboardingValue('onb-pf-document'));
        const mother_name = getOnboardingValue('onb-pf-mother_name');
        const birthdate = formatDateBR(getOnboardingValue('onb-pf-birthdate'));
        const monthly_income = parseInt(getOnboardingValue('onb-pf-monthly_income')) || 0;
        const professional_occupation = getOnboardingValue('onb-pf-professional_occupation');
        const phone_ddd = getOnboardingValue('onb-pf-phone_ddd');
        const phone_number = getOnboardingValue('onb-pf-phone_number');

        if (!name || !document || !mother_name || !birthdate || !monthly_income || !professional_occupation) {
            return { error: 'Preencha todos os dados pessoais obrigatórios.' };
        }
        if (document.length !== 11) return { error: 'CPF deve ter 11 dígitos.' };

        const address = {
            street: getOnboardingValue('onb-pf-street'),
            complementary: getOnboardingValue('onb-pf-complementary'),
            street_number: getOnboardingValue('onb-pf-street_number'),
            neighborhood: getOnboardingValue('onb-pf-neighborhood'),
            city: getOnboardingValue('onb-pf-city'),
            state: getOnboardingValue('onb-pf-state').toUpperCase(),
            zip_code: sanitizeNumbers(getOnboardingValue('onb-pf-zip_code')),
            reference_point: getOnboardingValue('onb-pf-reference_point'),
        };
        if (!address.street || !address.street_number || !address.neighborhood || !address.city || !address.state || !address.zip_code) {
            return { error: 'Preencha todos os campos do endereço.' };
        }

        register_information = {
            ...register_information,
            name,
            document,
            mother_name,
            birthdate,
            monthly_income,
            professional_occupation,
            address,
            phone_numbers: [{ ddd: phone_ddd, number: phone_number, type: 'mobile' }],
        };
    } else {
        const company_name = getOnboardingValue('onb-pj-company_name');
        const trading_name = getOnboardingValue('onb-pj-trading_name');
        const document = sanitizeNumbers(getOnboardingValue('onb-pj-document'));
        const annual_revenue = parseInt(getOnboardingValue('onb-pj-annual_revenue')) || 0;
        const corporation_type = getOnboardingValue('onb-pj-corporation_type');
        const founding_date = getOnboardingValue('onb-pj-founding_date');
        const phone_ddd = getOnboardingValue('onb-pj-phone_ddd');
        const phone_number = getOnboardingValue('onb-pj-phone_number');

        if (!company_name || !trading_name || !document || !annual_revenue || !corporation_type || !founding_date) {
            return { error: 'Preencha todos os dados da empresa obrigatórios.' };
        }
        if (document.length !== 14) return { error: 'CNPJ deve ter 14 dígitos.' };

        const main_address = {
            street: getOnboardingValue('onb-pj-street'),
            complementary: getOnboardingValue('onb-pj-complementary'),
            street_number: getOnboardingValue('onb-pj-street_number'),
            neighborhood: getOnboardingValue('onb-pj-neighborhood'),
            city: getOnboardingValue('onb-pj-city'),
            state: getOnboardingValue('onb-pj-state').toUpperCase(),
            zip_code: sanitizeNumbers(getOnboardingValue('onb-pj-zip_code')),
            reference_point: getOnboardingValue('onb-pj-reference_point'),
        };
        if (!main_address.street || !main_address.street_number || !main_address.neighborhood || !main_address.city || !main_address.state || !main_address.zip_code) {
            return { error: 'Preencha todos os campos do endereço da empresa.' };
        }

        const partnerName = getOnboardingValue('onb-partner-name');
        const partnerEmail = getOnboardingValue('onb-partner-email');
        const partnerDocument = sanitizeNumbers(getOnboardingValue('onb-partner-document'));
        const partnerMother = getOnboardingValue('onb-partner-mother_name');
        const partnerBirth = formatDateBR(getOnboardingValue('onb-partner-birthdate'));
        const partnerIncome = parseInt(getOnboardingValue('onb-partner-monthly_income')) || 0;
        const partnerJob = getOnboardingValue('onb-partner-professional_occupation');
        const partnerPhoneDdd = getOnboardingValue('onb-partner-phone_ddd');
        const partnerPhoneNum = getOnboardingValue('onb-partner-phone_number');

        if (!partnerName || !partnerEmail || !partnerDocument || !partnerMother || !partnerBirth || !partnerIncome || !partnerJob) {
            return { error: 'Preencha todos os dados do representante legal.' };
        }
        if (partnerDocument.length !== 11) return { error: 'CPF do representante deve ter 11 dígitos.' };

        const partnerAddress = {
            street: getOnboardingValue('onb-partner-street'),
            complementary: getOnboardingValue('onb-partner-complementary'),
            street_number: getOnboardingValue('onb-partner-street_number'),
            neighborhood: getOnboardingValue('onb-partner-neighborhood'),
            city: getOnboardingValue('onb-partner-city'),
            state: getOnboardingValue('onb-partner-state').toUpperCase(),
            zip_code: sanitizeNumbers(getOnboardingValue('onb-partner-zip_code')),
            reference_point: getOnboardingValue('onb-partner-reference_point'),
        };
        if (!partnerAddress.street || !partnerAddress.street_number || !partnerAddress.neighborhood || !partnerAddress.city || !partnerAddress.state || !partnerAddress.zip_code) {
            return { error: 'Preencha todos os campos do endereço do representante.' };
        }

        register_information = {
            ...register_information,
            company_name,
            trading_name,
            document,
            annual_revenue,
            corporation_type,
            founding_date,
            main_address,
            phone_numbers: [{ ddd: phone_ddd, number: phone_number, type: 'mobile' }],
            managing_partners: [{
                name: partnerName,
                email: partnerEmail,
                document: partnerDocument,
                type: 'individual',
                mother_name: partnerMother,
                birthdate: partnerBirth,
                monthly_income: partnerIncome,
                professional_occupation: partnerJob,
                self_declared_legal_representative: true,
                address: partnerAddress,
                phone_numbers: [{ ddd: partnerPhoneDdd, number: partnerPhoneNum, type: 'mobile' }],
            }],
        };
    }

    const holder_name = getOnboardingValue('onb-bank-holder_name');
    const holder_document = sanitizeNumbers(getOnboardingValue('onb-bank-holder_document'));
    const holder_type = document.getElementById('onb-bank-holder_type')?.value || 'individual';
    const bank = getBankCode();
    const branch_number = sanitizeNumbers(getOnboardingValue('onb-bank-branch_number'));
    const branch_check_digit = sanitizeNumbers(getOnboardingValue('onb-bank-branch_check_digit')) || undefined;
    const account_number = sanitizeNumbers(getOnboardingValue('onb-bank-account_number'));
    const account_check_digit = sanitizeNumbers(getOnboardingValue('onb-bank-account_check_digit'));
    const accountType = document.getElementById('onb-bank-type')?.value || 'checking';

    if (!holder_name || !holder_document || !bank || !branch_number || !account_number || !account_check_digit) {
        return { error: 'Preencha todos os dados bancários obrigatórios.' };
    }
    if (bank.length !== 3) {
        return { error: 'O código do banco deve ter 3 dígitos (código COMPE). Ex: 260 para Nubank, 341 para Itaú.' };
    }

    const default_bank_account = {
        holder_name,
        holder_type,
        holder_document,
        bank,
        branch_number,
        account_number,
        account_check_digit,
        type: accountType,
    };
    if (branch_check_digit) default_bank_account.branch_check_digit = branch_check_digit;

    return { register_information, default_bank_account };
}

// Open modal on gate click
document.getElementById('btn-connect-seller')?.addEventListener('click', () => {
    openOnboardingModal();
});

// Modal close handlers
document.getElementById('close-onboarding-modal')?.addEventListener('click', closeOnboardingModal);
document.getElementById('onboarding-cancel')?.addEventListener('click', closeOnboardingModal);
document.getElementById('sellerOnboardingModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeOnboardingModal();
});

// Tab switching
document.querySelectorAll('.onboarding-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        onboardingType = tab.dataset.type;
        updateOnboardingTabs();
    });
});

// Bank select "other" toggle
document.getElementById('onb-bank-bank')?.addEventListener('change', (e) => {
    const otherInput = document.getElementById('onb-bank-bank-other');
    if (otherInput) {
        otherInput.classList.toggle('hidden', e.target.value !== 'other');
        if (e.target.value !== 'other') otherInput.value = '';
    }
});

// Submit handler
document.getElementById('onboarding-submit')?.addEventListener('click', async () => {
    const submitBtn = document.getElementById('onboarding-submit');
    const btnContainer = submitBtn?.closest('.buttonContent');

    const payload = validateAndBuildPayload();
    if (payload.error) {
        showOnboardingError(payload.error);
        return;
    }

    if (btnContainer) setElementState(btnContainer, 'loading');

    try {
        const res = await fetchManager.startSellerOnboarding(payload);
        console.log('[Vitrine] Onboarding response:', res);

        if (res.ok) {
            closeOnboardingModal();
            notify('success', 'Cadastro enviado com sucesso! Aguarde a aprovação.');
            setTimeout(() => {
                vitrineLoaded = false;
                loadVitrineTab();
            }, 1500);
        } else {
            let errMsg = res.result?.error || 'Erro ao cadastrar. Tente novamente.';
            // Append Pagar.me validation details if available
            const details = res.result?.details;
            if (details && typeof details === 'object') {
                const detailMessages = Object.entries(details)
                    .map(([field, msgs]) => {
                        const msgText = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
                        return `${field}: ${msgText}`;
                    })
                    .join(' | ');
                if (detailMessages) errMsg += ` (${detailMessages})`;
            } else if (details) {
                errMsg += ` (${details})`;
            }
            showOnboardingError(errMsg);
            if (btnContainer) setElementState(btnContainer, 'content');
        }
    } catch (err) {
        console.error('Seller onboarding error:', err);
        showOnboardingError('Erro de conexão. Tente novamente.');
        if (btnContainer) setElementState(btnContainer, 'content');
    }
});

// Check onboarding status (pending state)
document.getElementById('btn-continue-onboarding')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-continue-onboarding');
    btn.disabled = true;
    btn.textContent = 'Verificando...';

    try {
        const res = await fetchManager.getSellerAccountStatus();
        if (res.ok && res.result?.data?.charges_enabled) {
            notify('success', 'Seu cadastro foi aprovado! Recarregando...');
            setTimeout(() => loadVitrine(), 1500);
        } else {
            notify('info', 'Seu cadastro ainda está em análise.');
            btn.textContent = 'Ver status';
            btn.disabled = false;
        }
    } catch (err) {
        console.error('Onboarding status check error:', err);
        btn.textContent = 'Ver status';
        btn.disabled = false;
    }
});

// KYC link button — generate and open the Pagar.me biometric verification link
document.getElementById('btn-kyc-link')?.addEventListener('click', async () => {
    const btnContainer = document.getElementById('btn-kyc-link-container');
    if (btnContainer) setElementState(btnContainer, 'loading');

    try {
        const res = await fetchManager.generateKycLink();
        if (res.ok && res.result?.url) {
            window.open(res.result.url, '_blank');
            notify('info', 'Link de verificação aberto em nova aba. Volte aqui após concluir.');
        } else {
            const errMsg = res.result?.error || 'Erro ao gerar link de verificação.';
            notify('error', errMsg);
        }
    } catch (err) {
        console.error('KYC link generation error:', err);
        notify('error', 'Erro de conexão. Tente novamente.');
    } finally {
        if (btnContainer) setElementState(btnContainer, 'content');
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

    // Description
    document.getElementById('edit-product-desc').value = product.description || '';

    // Price — subscription products: keep original price (gateway-locked)
    const priceInput = document.getElementById('edit-product-price');
    const priceHint = document.getElementById('edit-product-price-hint');
    const isSubscription = product.billing_type === 'subscription';
    priceInput.value = product.price_cents ? (product.price_cents / 100).toFixed(2) : '';
    priceInput.disabled = isSubscription;
    priceInput.style.opacity = isSubscription ? '0.5' : '';
    if (priceHint) priceHint.classList.toggle('hidden', !isSubscription);

    // Limit price to 2 decimal places on blur
    priceInput.onblur = () => {
        const v = parseFloat(priceInput.value);
        if (!isNaN(v)) priceInput.value = v.toFixed(2);
    };

    // Stock — always editable; hint shows active user minimum if applicable
    const stockInput = document.getElementById('edit-product-stock');
    const stockHint = document.getElementById('edit-product-stock-hint');
    stockInput.disabled = false;
    stockInput.style.opacity = '';
    stockInput.value = product.stock != null ? product.stock : '';
    if (stockHint) {
        const activeCount = parseInt(product.active_access_count) || 0;
        stockHint.textContent = activeCount > 0
            ? `Mínimo: ${activeCount} (usuários ativos no momento).`
            : 'Deixe vazio para ilimitado.';
        stockHint.classList.remove('hidden');
    }

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

    // Price — only editable for one_time products
    const isSubscription = editProductData.billing_type === 'subscription';
    const priceRaw = document.getElementById('edit-product-price').value;
    const priceFloat = parseFloat(priceRaw);
    if (!isSubscription && (!priceRaw || priceFloat < 1)) {
        notify('error', 'Defina um preço válido (mínimo R$ 1,00)');
        return;
    }
    const priceCents = isSubscription ? editProductData.price_cents : Math.round(priceFloat * 100);

    // Stock — empty = ilimitado (null); se preenchido, valida >= usuários ativos (pre-check)
    const stockRaw = document.getElementById('edit-product-stock').value.trim();
    const stockVal = stockRaw ? parseInt(stockRaw, 10) : null;
    if (stockRaw) {
        if (isNaN(stockVal) || stockVal < 1) {
            notify('error', 'Quantidade deve ser pelo menos 1');
            return;
        }
        const activeCount = parseInt(editProductData.active_access_count) || 0;
        if (activeCount > 0 && stockVal < activeCount) {
            notify('error', `Quantidade mínima é ${activeCount} (usuários ativos no produto).`);
            return;
        }
    }

    const btnContainer = document.querySelector('#editProductModal .buttonContent');
    setElementState(btnContainer, 'loading');

    try {
        const res = await fetchManager.updateProduct(editProductData.id, {
            description,
            price_cents: priceCents,
            stock: stockVal,
        });
        if (res.ok) {
            closeEditProductModal();
            notify('success', 'Produto atualizado');

            vitrineLoaded = false;
            await loadVitrineTab();
        } else {
            const errCode = res.result?.error;
            if (errCode === 'STOCK_BELOW_ACTIVE_USERS') {
                const liveCount = res.result?.activeCount ?? '?';
                notify('error', `Limite inferior aos usuários ativos (${liveCount}). Uma compra pode ter ocorrido agora.`);
            } else {
                notify('error', errCode || 'Erro ao atualizar');
            }
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
        // liquido = valor líquido (o que o seller recebe) = total - taxa plataforma - taxa gateway
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
                        <div class="sh-col sh-col-date">Data</div>
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
                    const dateLabel = `${order.dateObj.getDate()} ${MONTH_SHORT[order.dateObj.getMonth()]}, ${hours}:${mins}`;

                    item.innerHTML = `
                        <div class="sh-col sh-col-date">${dateLabel}</div>

                        <div class="sh-col sh-col-id">#${order.product_id.split('-')[0].toUpperCase()}</div>

                        <div class="sh-col sh-col-prod">
                            <div class="sh-texts">
                                <span class="sh-title">${pName}</span>
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

// ============================================================================
// PRODUCT DETAILS MODAL
// ============================================================================

async function openProductDetailsModal(product) {
    const modal = document.getElementById('productDetailsModal');
    if (!modal) return;

    // Set title
    document.getElementById('pd-modal-title').textContent = product.package_name || product.name || 'Detalhes do produto';

    modal.classList.add('show');

    const loadingEl = document.getElementById('productDetailsLoading');
    const wrapEl = document.getElementById('productDetailsWrap');

    loadingEl.style.display = 'flex';
    wrapEl.innerHTML = '';

    try {
        const res = await fetchManager.getProductDetails(product.id);
        if (res.ok && res.result) {
            renderProductDetails(res.result, wrapEl);
        } else {
            wrapEl.innerHTML = '<div class="sh-empty-state">Erro ao carregar os detalhes.</div>';
        }
    } catch (err) {
        console.error('Falha ao carregar detalhes do produto:', err);
        wrapEl.innerHTML = '<div class="sh-empty-state">Erro de conexão.</div>';
    } finally {
        loadingEl.style.display = 'none';
    }
}

function closeProductDetailsModal() {
    const modal = document.getElementById('productDetailsModal');
    modal.classList.remove('show');
}

document.getElementById('productDetailsModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeProductDetailsModal();
});
document.querySelector('#productDetailsModal .close-btn')?.addEventListener('click', closeProductDetailsModal);

function renderProductDetails(data, wrapEl) {
    const { product, activeUsers, orders } = data;

    // ── Section 1: Product Info ──
    const infoSection = document.createElement('div');
    infoSection.className = 'pd-section';

    const infoTitle = document.createElement('h3');
    infoTitle.className = 'pd-section-title';
    infoTitle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> Informações`;
    infoSection.appendChild(infoTitle);

    const grid = document.createElement('div');
    grid.className = 'pd-info-grid';

    const billingLabel = product.billing_type === 'subscription' ? 'Assinatura mensal' : 'Pagamento único';
    const priceStr = (parseFloat(product.price_cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const priceSuffix = product.billing_type === 'subscription' ? '/mês' : '';
    const statusLabel = product.status === 'active' ? 'Ativo' : 'Pausado';
    const statusClass = product.status === 'active' ? 'pd-status-active' : 'pd-status-paused';

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return `${String(d.getDate()).padStart(2, '0')} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
    };

    const stockLabel = product.stock != null
        ? `${product.active_access_count || 0}/${product.stock}`
        : 'Ilimitado';

    const infoItems = [
        { label: 'ID', value: '#' + product.id.split('-')[0].toUpperCase() },
        { label: 'Tipo', value: billingLabel },
        { label: 'Status', value: `<span class="pd-status-badge ${statusClass}"><span class="status-dot"></span>${statusLabel}</span>`, isHtml: true },
        { label: 'Preço', value: `R$ ${priceStr}${priceSuffix}` },
        { label: 'Pacote', value: product.package_name || '—' },
        { label: 'Criado em', value: formatDate(product.created_at) },
        { label: 'Última alteração', value: formatDate(product.updated_at) },
        { label: 'Vagas', value: stockLabel },
    ];

    infoItems.forEach(item => {
        const el = document.createElement('div');
        el.className = 'pd-info-item';
        el.innerHTML = `
            <span class="pd-info-label">${item.label}</span>
            <span class="pd-info-value">${item.isHtml ? item.value : escapeHtml(item.value)}</span>
        `;
        grid.appendChild(el);
    });

    infoSection.appendChild(grid);

    // ── Top grid container (info + users side by side) ──
    const topGrid = document.createElement('div');
    topGrid.className = 'pd-top-grid';
    topGrid.appendChild(infoSection);

    // ── Section 2: Active Users ──
    const usersSection = document.createElement('div');
    usersSection.className = 'pd-section';

    const usersTitle = document.createElement('h3');
    usersTitle.className = 'pd-section-title';
    usersTitle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Usuários ativos <span class="pd-count">${activeUsers.length}</span>`;
    usersSection.appendChild(usersTitle);

    if (activeUsers.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'sh-empty-state';
        empty.textContent = 'Nenhum usuário ativo no momento.';
        usersSection.appendChild(empty);
    } else {
        // Paginated user list
        let userLimit = 10;
        const userListContainer = document.createElement('div');
        userListContainer.className = 'pd-user-list';
        usersSection.appendChild(userListContainer);

        const renderUserItems = () => {
            userListContainer.innerHTML = '';
            const visibleUsers = activeUsers.slice(0, userLimit);

            visibleUsers.forEach(user => {
                const item = document.createElement('div');
                item.className = 'pd-user-item';

                const userName = user.name || 'Usuário';
                const initials = userName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

                const avatarHtml = user.picture
                    ? `<img src="${user.picture}" alt="${userName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`
                    : initials;

                const grantedDate = user.granted_at ? new Date(user.granted_at) : null;
                const dateStr = grantedDate
                    ? `${String(grantedDate.getDate()).padStart(2, '0')} ${MONTH_SHORT[grantedDate.getMonth()]} ${grantedDate.getFullYear()}`
                    : '—';

                item.innerHTML = `
                    <div class="sh-avatar user-avatar" ${user.picture ? 'style="background: none;"' : ''}>${avatarHtml}</div>
                    <div class="pd-user-info">
                        <span class="sh-title">${escapeHtml(userName)}</span>
                        <span class="sh-sub">${escapeHtml(user.email || '')}</span>
                    </div>
                    <span class="pd-user-date">${dateStr}</span>
                `;
                userListContainer.appendChild(item);
            });

            if (userLimit < activeUsers.length) {
                const wrapBtn = document.createElement('div');
                wrapBtn.className = 'sh-load-more-wrap';
                const moreBtn = document.createElement('button');
                moreBtn.className = 'sh-load-more';
                moreBtn.textContent = `Carregar mais (${activeUsers.length - userLimit} restantes)`;
                moreBtn.addEventListener('click', () => {
                    userLimit += 10;
                    renderUserItems();
                });
                wrapBtn.appendChild(moreBtn);
                userListContainer.appendChild(wrapBtn);
            }
        };
        renderUserItems();
    }

    topGrid.appendChild(usersSection);
    wrapEl.appendChild(topGrid);

    // ── Section 3: Sales History ──
    const salesSection = document.createElement('div');
    salesSection.className = 'pd-section';

    const salesTitle = document.createElement('h3');
    salesTitle.className = 'pd-section-title';
    salesTitle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> Histórico de vendas`;
    salesSection.appendChild(salesTitle);

    if (orders.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'sh-empty-state';
        empty.textContent = 'Nenhuma venda realizada ainda.';
        salesSection.appendChild(empty);
    } else {
        // Reuse the same year→month grouping logic
        const grouped = {};
        orders.forEach(order => {
            const d = new Date(order.created_at);
            const y = d.getFullYear();
            const m = d.getMonth();

            if (!grouped[y]) grouped[y] = { revenue: 0, net: 0, sales: 0, months: {} };
            if (!grouped[y].months[m]) grouped[y].months[m] = { revenue: 0, net: 0, sales: 0, list: [] };

            const plataformaFeeCents = 200;
            const receita = Math.max(0, (order.total_amount_cents || 0) - plataformaFeeCents);
            const liquido = order.seller_amount_cents || 0;

            grouped[y].revenue += receita;
            grouped[y].net += liquido;
            grouped[y].sales++;

            grouped[y].months[m].revenue += receita;
            grouped[y].months[m].net += liquido;
            grouped[y].months[m].sales++;

            grouped[y].months[m].list.push({ ...order, dateObj: d, receita, liquido });
        });

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const yearsSorted = Object.keys(grouped).sort((a, b) => b - a);

        yearsSorted.forEach(yStr => {
            const yData = grouped[yStr];
            const year = parseInt(yStr);

            const yearSection = document.createElement('div');
            yearSection.className = 'sh-year-group';

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

            const monthsSorted = Object.keys(yData.months).sort((a, b) => b - a);

            monthsSorted.forEach(mStr => {
                const mData = yData.months[mStr];
                const month = parseInt(mStr);
                const isCurrentMonth = (year === currentYear && month === currentMonth);

                const mGroup = document.createElement('div');
                mGroup.className = `sh-month-group ${isCurrentMonth ? 'open' : ''}`;

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

                let currentLimit = 10;
                const renderItems = () => {
                    // Without the "Produto" column — we're in context
                    mContent.innerHTML = `
                        <div class="sh-table-header">
                            <div class="sh-col sh-col-id" style="min-width: 110px;">Data</div>
                            <div class="sh-col sh-col-user">Comprador</div>
                            <div class="sh-col sh-col-val">Valor</div>
                            <div style="width: 28px;"></div>
                        </div>
                    `;
                    const itemsToShow = mData.list.slice(0, currentLimit);

                    itemsToShow.forEach(order => {
                        const item = document.createElement('div');
                        item.className = 'sh-sale-item';

                        const hours = String(order.dateObj.getHours()).padStart(2, '0');
                        const mins = String(order.dateObj.getMinutes()).padStart(2, '0');
                        const dateLabel = `${order.dateObj.getDate()} ${MONTH_SHORT[order.dateObj.getMonth()]}, ${hours}:${mins}`;

                        const buyerName = order.buyer_name || 'Usuário';
                        const splitU = buyerName.split(' ');
                        const initialU = splitU[0] ? splitU[0][0].toUpperCase() : 'U';

                        const userAvatarHtml = order.buyer_picture
                            ? `<img src="${order.buyer_picture}" alt="${buyerName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`
                            : initialU;

                        item.innerHTML = `
                            <div class="sh-col sh-col-date">${dateLabel}</div>

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

                mBtn.addEventListener('click', () => {
                    mGroup.classList.toggle('open');
                });

                mGroup.appendChild(mBtn);
                mGroup.appendChild(mContent);
                yearSection.appendChild(mGroup);
            });

            salesSection.appendChild(yearSection);
        });
    }

    wrapEl.appendChild(salesSection);
}

// ============================================================================
// WITHDRAWAL MODAL (Detalhes de Saque)
// ============================================================================

async function openWithdrawalModal() {
    const modal = document.getElementById('withdrawalModal');
    if (!modal) return;

    modal.classList.add('show');

    const loadingEl = document.getElementById('withdrawalLoading');
    const wrapEl = document.getElementById('withdrawalWrap');

    loadingEl.style.display = 'flex';
    wrapEl.innerHTML = '';

    try {
        const res = await fetchManager.getWithdrawalInfo();
        if (res.ok && res.result) {
            renderWithdrawalInfo(res.result, wrapEl);
        } else {
            wrapEl.innerHTML = '<div class="sh-empty-state">Erro ao carregar informações de saque.</div>';
        }
    } catch (err) {
        console.error('openWithdrawalModal error:', err);
        wrapEl.innerHTML = '<div class="sh-empty-state">Erro de conexão.</div>';
    } finally {
        loadingEl.style.display = 'none';
    }
}

function closeWithdrawalModal() {
    const modal = document.getElementById('withdrawalModal');
    if (modal) modal.classList.remove('show');
}

// Status badge helper for transfer status
function _transferStatusBadge(status) {
    const map = {
        transferred: { label: 'Transferido', cls: 'wd-status-success' },
        pending_transfer: { label: 'Pendente', cls: 'wd-status-pending' },
        processing: { label: 'Processando', cls: 'wd-status-pending' },
        failed: { label: 'Falhou', cls: 'wd-status-failed' },
        canceled: { label: 'Cancelado', cls: 'wd-status-failed' },
        created: { label: 'Criado', cls: 'wd-status-pending' },
    };
    const s = map[status] || { label: status || '—', cls: 'wd-status-pending' };
    return `<span class="wd-status-badge ${s.cls}">${s.label}</span>`;
}

function renderWithdrawalInfo(data, wrapEl) {
    const { balance, transfers, bank_name, bank_last4, next_transfer_date } = data;

    const available = balance?.available_amount || 0;
    const waiting = balance?.waiting_funds_amount || 0;

    // Format next transfer date
    let nextDateLabel = '—';
    if (next_transfer_date) {
        const d = new Date(next_transfer_date + 'T12:00:00');
        nextDateLabel = `${String(d.getDate()).padStart(2, '0')} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
    }

    // Bank label
    const bankLabel = (bank_name && bank_last4)
        ? `${bank_name} ****${bank_last4}`
        : (bank_name || '—');

    // ── Balance summary panel ──
    const summaryEl = document.createElement('div');
    summaryEl.className = 'wd-summary';
    summaryEl.innerHTML = `
        <div class="wd-balance-grid">
            <div class="wd-balance-card available">
                <div class="wd-balance-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div class="wd-balance-info">
                    <span class="wd-balance-label">Disponível para saque</span>
                    <span class="wd-balance-value available">R$ ${formatBRLValue(available)}</span>
                </div>
            </div>
            <div class="wd-balance-card">
                <div class="wd-balance-icon muted">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div class="wd-balance-info">
                    <span class="wd-balance-label">Aguardando compensação</span>
                    <span class="wd-balance-value">R$ ${formatBRLValue(waiting)}</span>
                </div>
            </div>
            <div class="wd-balance-card">
                <div class="wd-balance-icon muted">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
                </div>
                <div class="wd-balance-info">
                    <span class="wd-balance-label">Próximo repasse automático</span>
                    <span class="wd-balance-value">${nextDateLabel}</span>
                </div>
            </div>
            <div class="wd-balance-card">
                <div class="wd-balance-icon muted">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/></svg>
                </div>
                <div class="wd-balance-info">
                    <span class="wd-balance-label">Conta destino</span>
                    <span class="wd-balance-value">${bankLabel}</span>
                </div>
            </div>
        </div>
    `;
    wrapEl.appendChild(summaryEl);

    // ── Payables breakdown (money on the way) ──
    const { payable_groups } = data;
    if (payable_groups && payable_groups.length > 0) {
        const pgSection = document.createElement('div');
        pgSection.className = 'wd-payables-section';

        const pgTitle = document.createElement('div');
        pgTitle.className = 'wd-payables-title';
        pgTitle.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Recebíveis agendados
        `;
        pgSection.appendChild(pgTitle);

        const pgList = document.createElement('div');
        pgList.className = 'wd-payables-list';

        payable_groups.forEach(pg => {
            const d = new Date(pg.payment_date + 'T12:00:00');
            const dateLabel = `${String(d.getDate()).padStart(2, '0')} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;

            const row = document.createElement('div');
            row.className = 'wd-payable-row';
            row.innerHTML = `
                <div class="wd-payable-date">
                    <span class="wd-payable-dot"></span>
                    ${dateLabel}
                </div>
                <div class="wd-payable-right">
                    <span class="wd-payable-amount">R$ ${formatBRLValue(pg.amount)}</span>
                    <span class="wd-payable-count">${pg.count} ${pg.count === 1 ? 'transação' : 'transações'}</span>
                </div>
            `;
            pgList.appendChild(row);
        });

        pgSection.appendChild(pgList);
        wrapEl.appendChild(pgSection);
    }


    const btnWrap = document.createElement('div');
    btnWrap.className = 'wd-btn-wrap buttonContent content-state';
    btnWrap.id = 'wd-btn-container';
    btnWrap.innerHTML = `
        <div class="preset-content">
            <button class="btn btn-primary wd-withdraw-btn" id="btn-withdraw-now" ${available <= 0 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Sacar agora ${available > 0 ? '(R$ ' + formatBRLValue(available) + ')' : ''}
            </button>
            ${available <= 0 ? '<p class="wd-no-balance-note">Nenhum saldo disponível para saque no momento.</p>' : ''}
        </div>
        <div class="preset-loading">
            <button class="btn btn-primary wd-withdraw-btn" disabled>
                <div class="spinner" style="width:16px;height:16px;"></div>
                Processando...
            </button>
        </div>
    `;
    wrapEl.appendChild(btnWrap);

    // Withdraw button click handler
    document.getElementById('btn-withdraw-now')?.addEventListener('click', async () => {
        setElementState(btnWrap, 'loading');
        try {
            const res = await fetchManager.requestWithdrawal();
            if (res.ok && res.result?.success) {
                notify('success', `Saque de R$ ${formatBRLValue(res.result.amount_cents)} solicitado com sucesso!`);
                closeWithdrawalModal();
                setTimeout(() => openWithdrawalModal(), 300);
            } else {
                const errMsg = res.result?.error || 'Erro ao solicitar saque';
                notify('error', errMsg);
                setElementState(btnWrap, 'content');
            }
        } catch (err) {
            console.error('requestWithdrawal error:', err);
            notify('error', 'Erro de conexão ao solicitar saque');
            setElementState(btnWrap, 'content');
        }
    });

    // ── Transfer history ──
    const historySection = document.createElement('div');
    historySection.className = 'pd-section wd-history-section';

    const historyTitle = document.createElement('h3');
    historyTitle.className = 'pd-section-title';
    historyTitle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg> Histórico de repasses`;
    historySection.appendChild(historyTitle);

    if (!transfers || transfers.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'sh-empty-state';
        empty.textContent = 'Nenhum repasse realizado ainda.';
        historySection.appendChild(empty);
    } else {
        const listEl = document.createElement('div');
        listEl.className = 'wd-transfer-list';

        // Table header
        const headerEl = document.createElement('div');
        headerEl.className = 'sh-table-header';
        headerEl.innerHTML = `
            <div class="sh-col" style="flex:1.5;">Data</div>
            <div class="sh-col" style="flex:2;">Valor</div>
            <div class="sh-col" style="flex:1.5;">Status</div>
            <div class="sh-col" style="flex:2;">Previsão / Efetivado</div>
        `;
        listEl.appendChild(headerEl);

        // Sort by newest first
        const sorted = [...transfers].sort((a, b) =>
            new Date(b.date_created || b.created_at || 0) - new Date(a.date_created || a.created_at || 0)
        );

        sorted.forEach(transfer => {
            const createdAt = new Date(transfer.date_created || transfer.created_at);
            const dateLabel = `${String(createdAt.getDate()).padStart(2, '0')} ${MONTH_SHORT[createdAt.getMonth()]} ${createdAt.getFullYear()}`;

            let fundingLabel = '—';
            const fundingRaw = transfer.funding_date || transfer.funding_estimated_date;
            if (fundingRaw) {
                const fd = new Date(fundingRaw);
                fundingLabel = `${String(fd.getDate()).padStart(2, '0')} ${MONTH_SHORT[fd.getMonth()]} ${fd.getFullYear()}`;
            }

            const row = document.createElement('div');
            row.className = 'sh-sale-item wd-transfer-row';
            row.innerHTML = `
                <div class="sh-col" style="flex:1.5;">${dateLabel}</div>
                <div class="sh-col" style="flex:2;">
                    <span class="wd-transfer-amount">R$ ${formatBRLValue(transfer.amount || 0)}</span>
                </div>
                <div class="sh-col" style="flex:1.5;">${_transferStatusBadge(transfer.status)}</div>
                <div class="sh-col" style="flex:2;">${fundingLabel}</div>
            `;
            listEl.appendChild(row);
        });

        historySection.appendChild(listEl);
    }

    wrapEl.appendChild(historySection);
}

// Event listeners
document.getElementById('btn-withdrawal-details')?.addEventListener('click', openWithdrawalModal);
document.getElementById('withdrawalModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeWithdrawalModal();
});
document.querySelector('#withdrawalModal .close-btn')?.addEventListener('click', closeWithdrawalModal);
