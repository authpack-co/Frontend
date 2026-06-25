// ============================================================================
// VITRINE MANAGER
// Handles all vitrine tab logic: sidebar nav, state management, product CRUD
// ============================================================================

let vitrineProducts = [];
let vitrineCategories = [];
// Whether the category bar allows mutations (create/edit/drag/assign). True for
// an active Plus seller; false for an inactive (former-Plus) read-only vitrine.
let vitrineCategoriesEditable = false;
let vitrineLoaded = false;
// True when the seller is a registered recipient who no longer has Plus.
let createProductState = {
    step: 1,
    packageId: null,
    packageName: '',
    sessions: [],
    name: '',
    description: '',
    billingType: 'one_time',
    allowInstallments: false,
    price: '',
    stock: '',
};



// ============================================================================
// SIDEBAR NAV — VIEW SWITCHING
// ============================================================================

(function initVitrineNav() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');

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
                const productsSection = document.querySelector('.vt-products-section');
                if (productsSection) productsSection.style.display = '';
                // Show the dashboard financial widgets
                _setVitrineDashboardVisible(true);

                // Load vitrine data if not yet loaded
                if (!vitrineLoaded) {
                    loadVitrineTab();
                }
            }
        });
    });
})();

// Helper: show/hide the main vitrine dashboard widgets (hero, KPIs, chart row, seller panel, info bar)
function _setVitrineDashboardVisible(visible) {
    const d = visible ? '' : 'none';
    const finHero = document.getElementById('fin-hero');
    if (finHero) finHero.style.display = d;
    const finKpiRow = document.getElementById('fin-kpi-row');
    if (finKpiRow) finKpiRow.style.display = d;
    const finDashRow = document.getElementById('fin-dashboard-row');
    if (finDashRow) finDashRow.style.display = d;
    const infoBar = document.querySelector('.fin-info-bar');
    if (infoBar) infoBar.style.display = d;
    const vitrinHdr = document.querySelector('.vitrine-header');
    if (vitrinHdr) vitrinHdr.style.display = d;
}

// ============================================================================
// VITRINE TAB LOADING
// ============================================================================

async function loadVitrineTab() {
    const container = document.getElementById('vitrine-container');
    setElementState(container, 'loading');

    // Reset banner + ensure "Criar produto" is visible (it may have been hidden
    // in the KYC-pending state).
    hideKycBanner();
    document.getElementById('btn-create-product')?.classList.remove('hidden');

    // Seller status is now role-based (set manually by the admin team). Selling
    // no longer depends on Plus, and non-sellers don't even see this nav item —
    // so this is a defensive guard.
    const isSeller = !!currentUserInfo && currentUserInfo.role === 'seller';
    if (!isSeller) {
        _setVitrineDashboardVisible(false);
        vitrineLoaded = true;
        return;
    }

    try {
        // Seller by role — check live KYC status to decide if selling is unlocked.
        const kycRes = await fetchManager.getSellerKycStatus();
        console.log('[Vitrine] KYC status:', kycRes);

        if (!kycRes.ok || kycRes.result?.kyc_needed) {
            // State 2: KYC pending — show full dashboard but block selling
            _setVitrineDashboardVisible(true);
            setElementState(container, 'vitrine-content');
            showKycBanner();
            document.getElementById('btn-create-product')?.classList.add('hidden');
            const statusEl = document.getElementById('fin-seller-status');
            if (statusEl) {
                statusEl.className = 'fin-seller-mini-status pending';
                statusEl.innerHTML = '<span class="fin-seller-mini-dot"></span> Pendente';
            }

            // Load products (render empty state if none)
            const productsRes = await fetchManager.getSellerProducts();
            vitrineProducts = productsRes.ok ? (productsRes.result?.products || []) : [];
            vitrineCategoriesEditable = true;
            await loadVitrineCategories();
            renderVitrineProducts(vitrineProducts);

            // Load dashboard data (handles API failures gracefully)
            loadSellerDashboardData();

            vitrineLoaded = true;
            return;
        }

        // State 3: Account fully active — show products
        _setVitrineDashboardVisible(true);
        updateGatewayStatusBar(true);

        const productsRes = await fetchManager.getSellerProducts();
        console.log('[Vitrine] Products:', productsRes);
        vitrineProducts = productsRes.ok ? (productsRes.result?.products || []) : [];

        vitrineCategoriesEditable = true;
        await loadVitrineCategories();
        renderVitrineProducts(vitrineProducts);
        setElementState(container, 'vitrine-content');

        // Load seller dashboard data (KPIs + seller info) in background
        loadSellerDashboardData();

        vitrineLoaded = true;
    } catch (err) {
        console.error('Error loading vitrine:', err);
        // Seller by role but data failed to load — show the dashboard shell so
        // the seller still has access (data calls handle their own failures).
        _setVitrineDashboardVisible(true);
        setElementState(container, 'vitrine-content');
        vitrineLoaded = true;
    }
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
            total_amount_cents: order.total_amount_cents || order.amount || 0,
            gateway_fee_cents: order.gateway_fee_cents || 0,
            platform_fee_cents: order.platform_fee_cents || 0,
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
                hourlyData[hourKey] = { gross_cents: 0, net_cents: 0, count: 0 };
            }
            hourlyData[hourKey].gross_cents += order.total_amount_cents || order.seller_amount_cents;
            hourlyData[hourKey].net_cents += order.seller_amount_cents;
            hourlyData[hourKey].count++;
        }
    }

    return hourlyData;
}

// ── Aggregate daily totals from filtered orders (for chart) ──
function getDailyTotals(filteredOrders) {
    const result = {};
    for (const [dateKey, orders] of Object.entries(filteredOrders)) {
        let gross_cents = 0;
        let net_cents = 0;
        let count = 0;
        for (const order of orders) {
            gross_cents += order.total_amount_cents || order.seller_amount_cents;
            net_cents += order.seller_amount_cents;
            count++;
        }
        // Use dd/mm as chart key (strip year)
        const shortKey = dateKey.substring(0, 5); // "dd/mm"
        result[shortKey] = { gross_cents, net_cents, count };
    }
    return result;
}

// ── Receita bruta do período usando dados completos do sales-history ──
// Bruto = total_amount_cents (preço limpo pago pelo comprador).
function computeGrossFromHistory(days) {
    if (!allSalesHistory || allSalesHistory.length === 0) return null;

    const now = new Date();
    const today = new Date(now);
    today.setHours(23, 59, 59, 999);

    let gross = 0;

    if (days <= 1) {
        // Apenas hoje
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        allSalesHistory.forEach(order => {
            const d = new Date(order.created_at);
            if (d >= startOfDay && d <= today) {
                gross += (order.total_amount_cents || 0);
            }
        });
    } else {
        // Últimos N dias
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - days);
        cutoff.setHours(0, 0, 0, 0);
        allSalesHistory.forEach(order => {
            const d = new Date(order.created_at);
            if (d >= cutoff && d <= today) {
                gross += (order.total_amount_cents || 0);
            }
        });
    }

    return gross;
}

// ── Receita bruta por dia/hora para o gráfico, usando allSalesHistory ──
// Retorna { "dd/mm": gross_cents } (diário) ou { "HH:00": gross_cents } (horário).
// Retorna null quando allSalesHistory estiver vazio (usa fallback de raw_orders).
function buildGrossChartFromHistory(days, isHourly) {
    if (!allSalesHistory || allSalesHistory.length === 0) return null;

    const pad = v => String(v).padStart(2, '0');
    const now = new Date();
    const result = {};

    if (isHourly) {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        allSalesHistory.forEach(order => {
            const d = new Date(order.created_at);
            if (d < startOfDay) return;
            const key = `${pad(d.getHours())}:00`;
            if (!result[key]) result[key] = 0;
            result[key] += (order.total_amount_cents || 0);
        });
    } else {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - days);
        cutoff.setHours(0, 0, 0, 0);
        allSalesHistory.forEach(order => {
            const d = new Date(order.created_at);
            if (d < cutoff) return;
            const key = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
            if (!result[key]) result[key] = 0;
            result[key] += (order.total_amount_cents || 0);
        });
    }

    return result;
}

// ── Compute KPIs from filtered orders ──
function computeKPIs(filteredOrders) {
    let totalRevenue = 0;  // net (seller_amount_cents)
    let totalGross = 0;    // total_amount_cents (bruto)
    let totalFees = 0;     // gateway + platform fees
    let totalSales = 0;
    for (const orders of Object.values(filteredOrders)) {
        for (const order of orders) {
            totalRevenue += order.seller_amount_cents;
            // Bruto = total pago pelo comprador (preço limpo). Fallback p/ pedidos
            // sem total_amount_cents: seller_amount + comissão da plataforma.
            const gatewayFee = order.gateway_fee_cents || 0;
            const platformFee = order.platform_fee_cents || 0;
            totalGross += order.total_amount_cents || Math.max(0, (order.seller_amount_cents || 0) + platformFee);
            totalFees += gatewayFee + platformFee;
            totalSales++;
        }
    }
    return { totalRevenue, totalGross, totalFees, totalSales };
}

// ── KPIs do período para "Performance de vendas" + "Resumo rápido" ──
// Reaproveita allSalesHistory (tem total_amount_cents correto, mesma janela do
// gráfico) e cai para o cache de raw_orders quando o histórico ainda não chegou.
// Mesmas fórmulas do histórico: bruto = total_amount_cents; líquido = seller_amount.
function applyVitrinePeriodKPIs(days) {
    let gross = 0, net = 0, sales = 0;

    if (allSalesHistory && allSalesHistory.length > 0) {
        const now = new Date();
        const end = new Date(now); end.setHours(23, 59, 59, 999);
        const start = new Date(now);
        if (days <= 1) {
            start.setHours(0, 0, 0, 0);
        } else {
            start.setDate(start.getDate() - days);
            start.setHours(0, 0, 0, 0);
        }
        allSalesHistory.forEach(order => {
            const d = new Date(order.created_at);
            if (d < start || d > end) return;
            gross += (order.total_amount_cents || 0);
            net += order.seller_amount_cents || 0;
            sales++;
        });
    } else {
        // Fallback: cache de raw_orders
        let filtered;
        if (days <= 1) {
            const pad = v => String(v).padStart(2, '0');
            const today = new Date();
            const todayKey = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
            filtered = vitrineData.ordersByDate?.[todayKey] ? { [todayKey]: vitrineData.ordersByDate[todayKey] } : {};
        } else {
            filtered = filterOrdersByLastDays(vitrineData.ordersByDate || {}, days);
        }
        const k = computeKPIs(filtered);
        gross = k.totalGross; net = k.totalRevenue; sales = k.totalSales;
    }

    const avgTicket = sales > 0 ? Math.round(gross / sales) : 0;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    // Performance de vendas (KPI cards)
    set('kpi-gross-revenue', formatCentsToBRL(gross));
    set('kpi-net-revenue', formatCentsToBRL(net));
    set('kpi-sales', sales);
    set('kpi-avg-ticket', formatCentsToBRL(avgTicket));
    // Resumo rápido (painel lateral)
    set('fin-gross-revenue', formatCentsToBRL(gross));
    set('fin-net-revenue', formatCentsToBRL(net));
    set('fin-sales-count', sales);
    set('fin-avg-ticket-summary', formatCentsToBRL(avgTicket));
}

// ============================================================================
// MAIN LOAD + PERIOD UPDATE
// ============================================================================

async function loadSellerDashboardData() {
    try {
        showDashboardSkeletons(true);

        // ── Always populate seller card from currentUserInfo first ──
        const finSellerName = document.getElementById('fin-seller-name');
        if (finSellerName) finSellerName.textContent = currentUserInfo?.name || 'Vendedor';

        const finSellerEmail = document.getElementById('fin-seller-email');
        if (finSellerEmail) finSellerEmail.textContent = currentUserInfo?.email || '';

        const finSellerAvatar = document.getElementById('fin-seller-avatar');
        if (finSellerAvatar && currentUserInfo?.picture) {
            finSellerAvatar.innerHTML = `<img src="${currentUserInfo.picture}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        }

        const finSellerCountry = document.getElementById('fin-seller-country');
        if (finSellerCountry) finSellerCountry.textContent = 'Brasil';

        // Load dashboard, withdrawal info, sales history e cash flow em paralelo
        const [dashRes, withdrawalRes, salesHistRes, cashFlowRes] = await Promise.all([
            fetchManager.getSellerDashboard(),
            fetchManager.getWithdrawalInfo(),
            fetchManager.getSellerSalesHistory(),
            fetchManager.getCashFlow(),
        ]);

        console.log('[Vitrine] Dashboard data:', dashRes);
        console.log('[Vitrine] Withdrawal info:', withdrawalRes);

        // ── Process dashboard data (may fail for non-active accounts → use defaults) ──
        if (dashRes.ok && dashRes.result) {
            const data = dashRes.result;

            vitrineData.ordersByDate = processRawOrders(data.raw_orders || []);

            const statusEl = document.getElementById('fin-seller-status');
            if (statusEl) {
                statusEl.className = 'fin-seller-mini-status active';
                statusEl.innerHTML = '<span class="fin-seller-mini-dot"></span> Ativo';
            }

            const finSellerBank = document.getElementById('fin-seller-bank');
            if (finSellerBank) finSellerBank.textContent = data.bank_name || '—';

            const finSellerAccount = document.getElementById('fin-seller-account');
            if (finSellerAccount) finSellerAccount.textContent = data.bank_last4 ? `****${data.bank_last4}` : '—';

            const finSellerRecipient = document.getElementById('fin-seller-recipient');
            if (finSellerRecipient) {
                const rid = data.gateway_recipient_id || '—';
                finSellerRecipient.textContent = rid.length > 14 ? rid.slice(0, 11) + '…' : rid;
                finSellerRecipient.title = rid;
            }

            if (data.performance) {
                const perf = data.performance;
                const kpiGross = document.getElementById('kpi-gross-revenue');
                if (kpiGross) kpiGross.textContent = formatCentsToBRL(perf.gross_revenue_cents);
                const kpiNet = document.getElementById('kpi-net-revenue');
                if (kpiNet) kpiNet.textContent = formatCentsToBRL(perf.net_revenue_cents);
                const kpiSales = document.getElementById('kpi-sales');
                if (kpiSales) kpiSales.textContent = perf.sales_count;
                const kpiAvgTicket = document.getElementById('kpi-avg-ticket');
                if (kpiAvgTicket) kpiAvgTicket.textContent = formatCentsToBRL(perf.average_ticket_cents);

                const finGross = document.getElementById('fin-gross-revenue');
                if (finGross) finGross.textContent = formatCentsToBRL(perf.gross_revenue_cents);
                const finNet = document.getElementById('fin-net-revenue');
                if (finNet) finNet.textContent = formatCentsToBRL(perf.net_revenue_cents);
                const finSalesCount = document.getElementById('fin-sales-count');
                if (finSalesCount) finSalesCount.textContent = perf.sales_count;
                const finAvgTicket = document.getElementById('fin-avg-ticket-summary');
                if (finAvgTicket) finAvgTicket.textContent = formatCentsToBRL(perf.average_ticket_cents);
            }
        } else {
            vitrineData.ordersByDate = {};
        }

        // ── Pré-popula allSalesHistory para cálculo correto de receita bruta ──
        if (salesHistRes.ok && salesHistRes.result?.orders) {
            allSalesHistory = salesHistRes.result.orders;
        }

        // ── Process withdrawal data (balance + transfers) ──
        if (withdrawalRes.ok && withdrawalRes.result) {
            financialCenterData.balance = withdrawalRes.result.balance;
            financialCenterData.transfers = withdrawalRes.result.transfers || [];
            financialCenterData.tedFeeCents = withdrawalRes.result.ted_fee_cents ?? 367;
            financialCenterData.netWithdrawableCents = withdrawalRes.result.net_withdrawable_cents ?? Math.max(0, (withdrawalRes.result.balance?.available_amount || 0) - (withdrawalRes.result.ted_fee_cents ?? 367));

            const available = withdrawalRes.result.balance?.available_amount || 0;
            const waiting = withdrawalRes.result.balance?.waiting_funds_amount || 0;

            const finAvailable = document.getElementById('fin-available-balance');
            if (finAvailable) finAvailable.textContent = formatCentsToBRL(available);

            const pendingHint = document.getElementById('fin-pending-hint');
            const pendingAmount = document.getElementById('fin-pending-amount');
            if (pendingHint && pendingAmount) {
                if (waiting > 0) {
                    pendingAmount.textContent = formatCentsToBRL(waiting);
                    pendingHint.style.display = '';
                } else {
                    pendingHint.style.display = 'none';
                }
            }

            // Automatic transfers were removed — withdrawals are manual-only,
            // so there is no "next transfer" date to display anymore.

            updateQuickSummary();
        }

        // ── Populate Cash Flow (Movimentações) cards ──
        if (cashFlowRes.ok && cashFlowRes.result) {
            const cf = cashFlowRes.result;
            const cfEntriesTotal = document.getElementById('cf-entries-total');
            if (cfEntriesTotal) cfEntriesTotal.textContent = formatCentsToBRL(cf.entries.total_cents);
            const cfEntriesSales = document.getElementById('cf-entries-sales');
            if (cfEntriesSales) cfEntriesSales.textContent = formatCentsToBRL(cf.entries.new_sales_cents);
            const cfEntriesSubs = document.getElementById('cf-entries-subscriptions');
            if (cfEntriesSubs) cfEntriesSubs.textContent = formatCentsToBRL(cf.entries.subscription_renewals_cents);
            const cfEntriesInst = document.getElementById('cf-entries-installments');
            if (cfEntriesInst) cfEntriesInst.textContent = formatCentsToBRL(cf.entries.installment_payments_cents);
            const cfEntriesPending = document.getElementById('cf-entries-pending');
            if (cfEntriesPending) cfEntriesPending.textContent = formatCentsToBRL(cf.entries.pending_settlement_cents);
            const cfExitsTotal = document.getElementById('cf-exits-total');
            if (cfExitsTotal) cfExitsTotal.textContent = formatCentsToBRL(cf.exits.total_cents);
            const cfExitsWithdrawn = document.getElementById('cf-exits-withdrawn');
            if (cfExitsWithdrawn) cfExitsWithdrawn.textContent = formatCentsToBRL(cf.exits.withdrawn_cents);
            const cfExitsReceived = document.getElementById('cf-exits-received');
            if (cfExitsReceived) cfExitsReceived.textContent = formatCentsToBRL(cf.exits.received_cents);
            const cfExitsWithdrawals = document.getElementById('cf-exits-withdrawals');
            if (cfExitsWithdrawals) cfExitsWithdrawals.textContent = cf.exits.withdrawal_count;
        }

        showDashboardSkeletons(false);

        // ── Always render chart (empty state when no data) ──
        const periodSelect = document.getElementById('vt-chart-period-select');
        const defaultDays = periodSelect ? parseInt(periodSelect.value) || 30 : 30;
        updateVitrinePeriod(defaultDays);

    } catch (err) {
        console.error('[Vitrine] Error loading dashboard data:', err);
        showDashboardSkeletons(false);
        // Ensure chart renders even on total failure
        vitrineData.ordersByDate = vitrineData.ordersByDate || {};
        updateVitrinePeriod(30);
    }
}

function updateVitrinePeriod(days) {
    if (!vitrineData.ordersByDate) return;

    // ── Rótulos dependentes do período (KPIs + subtítulos) ──
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    if (days <= 1) {
        setText('kpi-sales-label', 'Vendas hoje');
        setText('kpi-gross-sub', 'Total vendido hoje');
        setText('fin-perf-sub', 'Somente novas vendas de hoje');
    } else if (days <= 7) {
        setText('kpi-sales-label', 'Vendas esta semana');
        setText('kpi-gross-sub', 'Total vendido em 7 dias');
        setText('fin-perf-sub', 'Somente novas vendas dos últimos 7 dias');
    } else {
        setText('kpi-sales-label', 'Vendas este mês');
        setText('kpi-gross-sub', 'Total vendido no mês');
        setText('fin-perf-sub', 'Somente novas vendas do mês');
    }

    // ── Resumo rápido + Performance de vendas adaptados ao período ──
    applyVitrinePeriodKPIs(days);

    let chartData;
    let transferData = null;

    if (days <= 1) {
        // ── Today: hourly chart ──
        chartData = getHourlyOrders(vitrineData.ordersByDate);
        transferData = getHourlyTransfers(financialCenterData.transfers);

        // Sobrescreve gross_cents do gráfico com dados do sales-history (que tem
        // total_amount_cents correto — raw_orders pode não ter esse campo).
        const historyGross = buildGrossChartFromHistory(days, true);
        if (historyGross) {
            Object.keys(chartData).forEach(key => {
                if (historyGross[key] !== undefined) chartData[key].gross_cents = historyGross[key];
            });
        }

        loadVitrineSalesChart(chartData, transferData, true);
    } else {
        // ── 7d / 30d: daily chart ──
        const filteredOrders = filterOrdersByLastDays(vitrineData.ordersByDate, days);
        chartData = getDailyTotals(filteredOrders);
        transferData = getDailyTransfers(financialCenterData.transfers, days);

        // Sobrescreve gross_cents do gráfico com dados do sales-history (que tem
        // total_amount_cents correto — raw_orders pode não ter esse campo).
        const historyGross = buildGrossChartFromHistory(days, false);
        if (historyGross) {
            Object.keys(chartData).forEach(key => {
                if (historyGross[key] !== undefined) chartData[key].gross_cents = historyGross[key];
            });
        }

        loadVitrineSalesChart(chartData, transferData, false);
    }

}

function showDashboardSkeletons(show) {
    const kpiValueEls = ['kpi-gross-revenue', 'kpi-net-revenue', 'kpi-sales', 'kpi-avg-ticket', 'cf-entries-total', 'cf-exits-total', 'fin-available-balance'];
    kpiValueEls.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (show) {
            el.dataset.originalText = el.textContent;
            el.textContent = '';
            el.classList.add('skeleton');
            el.style.width = id === 'fin-available-balance' ? '160px' : '80px';
            el.style.height = id === 'fin-available-balance' ? '36px' : '24px';
            el.style.display = 'inline-block';
        } else {
            el.classList.remove('skeleton');
            el.style.width = '';
            el.style.height = '';
            el.style.display = '';
        }
    });

    const sellerMiniEls = [
        { id: 'fin-seller-name', w: '120px', h: '18px' },
        { id: 'fin-seller-email', w: '140px', h: '14px' },
        { id: 'fin-seller-bank', w: '80px', h: '14px' },
        { id: 'fin-seller-account', w: '60px', h: '14px' },
        { id: 'fin-seller-country', w: '60px', h: '14px' },
        { id: 'fin-seller-recipient', w: '80px', h: '14px' },
    ];
    sellerMiniEls.forEach(({ id, w, h }) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (show) {
            el.dataset.originalText = el.textContent;
            el.textContent = '';
            el.classList.add('skeleton');
            el.style.width = w;
            el.style.height = h;
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

// ── Aggregate transfer data by day for chart ──
function getDailyTransfers(transfers, days) {
    const result = {};
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    if (!transfers) return result;

    transfers.forEach(t => {
        const d = new Date(t.date_created || t.created_at || 0);
        if (d < cutoff) return;
        const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!result[key]) result[key] = 0;
        result[key] += (t.amount || 0);
    });
    return result;
}

function getHourlyTransfers(transfers) {
    const result = {};
    const pad = v => String(v).padStart(2, '0');
    const today = new Date();
    const todayKey = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;

    if (!transfers) return result;

    transfers.forEach(t => {
        const d = new Date(t.date_created || t.created_at || 0);
        const tKey = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
        if (tKey !== todayKey) return;
        const hourKey = `${pad(d.getHours())}:00`;
        if (!result[hourKey]) result[hourKey] = 0;
        result[hourKey] += (t.amount || 0);
    });
    return result;
}

function loadVitrineSalesChart(dataObject, transfersData = null, isHourly = false) {
    const canvas = document.getElementById('vitrineSalesChart');
    if (!canvas) return;

    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    // Manage empty state overlay
    const wrapper = document.getElementById('vt-chart-wrapper');
    let emptyOverlay = wrapper?.querySelector('.vt-chart-empty-overlay');
    const hasData = Object.keys(dataObject).some(key => (dataObject[key].count || 0) > 0 || (dataObject[key].gross_cents || 0) > 0);

    if (!hasData) {
        if (!emptyOverlay && wrapper) {
            emptyOverlay = document.createElement('div');
            emptyOverlay.className = 'vt-chart-empty-overlay';
            emptyOverlay.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 3v18h18"/>
                    <path d="m19 9-5 5-4-4-3 3"/>
                </svg>
                <span>Nenhuma venda registrada neste período</span>`;
            wrapper.appendChild(emptyOverlay);
        }
        if (emptyOverlay) emptyOverlay.style.display = '';
    } else {
        if (emptyOverlay) emptyOverlay.style.display = 'none';
    }

    const ctx = canvas.getContext('2d');

    const labels = Object.keys(dataObject);
    const salesCountData = labels.map(key => dataObject[key].count || 0);
    const grossData = labels.map(key => (dataObject[key].gross_cents || 0) / 100);

    if (labels.length === 0) {
        const now = new Date();
        const emptyLabel = isHourly ? '00:00' : `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
        labels.push(emptyLabel);
        salesCountData.push(0);
        grossData.push(0);
    }

    const maxCount = salesCountData.length > 0 ? Math.max(...salesCountData) : 0;
    const maxGross = grossData.length > 0 ? Math.max(...grossData) : 0;
    const yCountMax = maxCount === 0 ? 5 : Math.ceil(maxCount * 1.3);
    const yGrossMax = maxGross === 0 ? 10 : maxGross * 1.2;

    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    const chartPointBorder = isDarkTheme ? '#141619' : '#ffffff';
    const tooltipBg = isDarkTheme ? '#1c1f20' : '#ffffff';
    const tooltipBorder = isDarkTheme ? '#333840' : '#e5e7eb';
    const tooltipTitle = isDarkTheme ? '#fff' : '#111827';
    const tooltipBody = isDarkTheme ? '#ccc' : '#374151';
    const gridColor = isDarkTheme ? '#333840' : '#e5e7eb';
    const tickColor = isDarkTheme ? '#8e9091' : '#6b7280';

    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Receita bruta',
                    data: grossData,
                    yAxisID: 'y',
                    borderColor: '#22c55e',
                    backgroundColor: function (context) {
                        const chartCtx = context.chart.ctx;
                        const gradient = chartCtx.createLinearGradient(0, 0, 0, 200);
                        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.18)');
                        gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
                        return gradient;
                    },
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#22c55e',
                    pointBorderColor: chartPointBorder,
                    pointBorderWidth: 2,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#4ade80',
                    pointHoverBorderWidth: 2,
                    order: 1
                },
                {
                    label: 'Nº de vendas',
                    data: salesCountData,
                    yAxisID: 'y1',
                    borderColor: '#4184e4',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 4],
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#4184e4',
                    pointBorderColor: chartPointBorder,
                    pointBorderWidth: 2,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#58a6ff',
                    pointHoverBorderWidth: 2,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    titleColor: tooltipTitle,
                    bodyColor: tooltipBody,
                    cornerRadius: 8,
                    padding: 12,
                    displayColors: true,
                    boxWidth: 8,
                    boxHeight: 8,
                    usePointStyle: true,
                    callbacks: {
                        title: (items) => {
                            const key = labels[items[0].dataIndex];
                            return isHourly ? `🕐 ${key}` : `📅 ${key}`;
                        },
                        label: (item) => {
                            if (item.dataset.label === 'Receita bruta') {
                                return `Receita bruta: ${formatCentsToBRL(item.raw * 100)}`;
                            }
                            return `Vendas: ${item.raw}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: tickColor,
                        font: { size: 11 },
                        maxRotation: isHourly ? 45 : 0,
                        minRotation: isHourly ? 45 : 0,
                        maxTicksLimit: isHourly ? 24 : 10,
                    }
                },
                y: {
                    beginAtZero: true,
                    max: yGrossMax,
                    position: 'left',
                    grid: { color: gridColor },
                    ticks: {
                        color: tickColor,
                        callback: v => `R$ ${v.toFixed(0)}`
                    }
                },
                y1: {
                    beginAtZero: true,
                    max: yCountMax,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: {
                        color: tickColor,
                        stepSize: 1,
                        callback: v => Number.isInteger(v) ? v : ''
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
// FINANCIAL CENTER
// ============================================================================

let financialCenterData = {
    ordersByDate: null,
    transfers: [],
    balance: null,
};

function updateQuickSummary() {
    // Quick summary panel is now populated from backend performance data
    // in loadSellerDashboardData — nothing period-dependent here.
}

// ============================================================================
// PRODUCT RENDERING
// ============================================================================

function renderVitrineProducts(products) {
    const container = document.getElementById('vitrine-products-grid');
    if (!container) return;
    container.innerHTML = '';

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="vt-empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
                    <path d="M2 7h20"/>
                </svg>
                <span class="vt-empty-state-title">Nenhum produto criado</span>
                <span class="vt-empty-state-desc">Crie seu primeiro produto para começar a vender.</span>
            </div>`;
        return;
    }

    const makeGrid = (items) => {
        const grid = document.createElement('div');
        grid.className = 'vt-cat-grid';
        items.forEach(p => grid.appendChild(createVitrineProductCard(p)));
        return grid;
    };

    // No categories yet → a single flat grid (no section headers).
    if (!vitrineCategories || vitrineCategories.length === 0) {
        container.appendChild(makeGrid(products));
        return;
    }

    // One section per category (in the seller's order), then "Outros" for
    // products not in any category. A product in multiple categories repeats.
    const sections = [];
    vitrineCategories.forEach(cat => {
        const items = products.filter(p => (p.category_ids || []).includes(cat.id));
        if (items.length) sections.push({ cat, items });
    });
    const uncategorized = products.filter(p => !(p.category_ids || []).length);
    if (uncategorized.length) sections.push({ cat: null, items: uncategorized });

    // Edge case: categories exist but no product is tagged → flat grid.
    if (sections.length === 0) {
        container.appendChild(makeGrid(products));
        return;
    }

    sections.forEach(({ cat, items }) => {
        const section = document.createElement('div');
        section.className = 'vt-cat-section';

        const head = document.createElement('div');
        head.className = 'vt-cat-section-head';
        const dot = document.createElement('span');
        dot.className = 'vt-cat-section-dot';
        if (cat) dot.style.background = cat.color;
        else dot.classList.add('vt-cat-section-dot-muted');
        head.appendChild(dot);
        const title = document.createElement('h4');
        title.className = 'vt-cat-section-title';
        title.textContent = cat ? cat.name : 'Outros';
        head.appendChild(title);
        const count = document.createElement('span');
        count.className = 'vt-cat-section-count';
        count.textContent = items.length;
        head.appendChild(count);
        section.appendChild(head);

        section.appendChild(makeGrid(items));
        container.appendChild(section);
    });
}

async function reloadVitrineProducts() {
    try {
        const res = await fetchManager.getSellerProducts();
        vitrineProducts = res.ok ? (res.result?.products || []) : [];
        renderVitrineProducts(vitrineProducts);
    } catch (err) {
        console.error('Error reloading products:', err);
    }
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
            img.alt = s.name;
            AuthPackFavicon.apply(img, { icon: s.icon, url: s.url });
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
        const url = `${window.location.origin}/pages/product/?product=${product.id}`;
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
                    await reloadVitrineProducts();
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

    // "Adicionar a" — category submenu (flyout). Only when the seller can edit
    // and has at least one category.
    if (vitrineCategoriesEditable && vitrineCategories.length > 0) {
        const addToItem = document.createElement('div');
        addToItem.className = 'vt-add-to-item';

        const addToBtn = document.createElement('button');
        addToBtn.className = 'vt-add-to-btn';
        addToBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>`;
        addToBtn.appendChild(document.createTextNode('Adicionar a'));
        const caret = document.createElement('span');
        caret.className = 'vt-add-to-caret';
        caret.textContent = '‹';
        addToBtn.appendChild(caret);
        addToBtn.addEventListener('click', (e) => e.stopPropagation());
        addToItem.appendChild(addToBtn);

        const submenu = document.createElement('div');
        submenu.className = 'vt-cat-submenu';
        vitrineCategories.forEach(cat => {
            const isOn = (product.category_ids || []).includes(cat.id);
            const opt = document.createElement('button');
            opt.className = 'vt-cat-submenu-item' + (isOn ? ' active' : '');
            opt.innerHTML = `<span class="vt-cat-dot" style="background:${cat.color}"></span>`;
            const lbl = document.createElement('span');
            lbl.className = 'vt-cat-submenu-name';
            lbl.textContent = cat.name;
            opt.appendChild(lbl);
            const check = document.createElement('span');
            check.className = 'vt-cat-submenu-check';
            check.textContent = isOn ? '✓' : '';
            opt.appendChild(check);
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleProductCategory(product, cat.id, opt, check);
            });
            submenu.appendChild(opt);
        });
        addToItem.appendChild(submenu);
        productOptions.appendChild(addToItem);
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
        // Close any other open menu and clear its overflow override.
        document.querySelectorAll('.vp-card.menu-open').forEach(c => {
            if (c !== card) c.classList.remove('menu-open');
        });
        document.querySelectorAll('.product-options:not(.hidden)').forEach(opt => {
            if (opt !== productOptions) opt.classList.add('hidden');
        });
        const willOpen = productOptions.classList.contains('hidden');
        productOptions.classList.toggle('hidden');
        // While open, let the card overflow so the "Adicionar a" flyout isn't
        // clipped by .vp-card { overflow: hidden }.
        card.classList.toggle('menu-open', willOpen);
    });

    overlay.appendChild(copyBtn);
    overlay.appendChild(optionsBtn);
    card.appendChild(overlay);
    card.appendChild(productOptions);

    return card;
}


// ============================================================================
// VITRINE CATEGORIES
// ============================================================================

// Must mirror backend src/utils/vitrineCategoryColors.js
const VITRINE_CATEGORY_COLORS = ['#3b82f6', '#22c55e', '#8b5cf6', '#f97316', '#ec4899'];

// Fetch + render the seller's categories. Called whenever the products load.
async function loadVitrineCategories() {
    try {
        const res = await fetchManager.getSellerCategories();
        vitrineCategories = res.ok ? (res.result?.categories || []) : [];
    } catch (err) {
        console.error('Error loading categories:', err);
        vitrineCategories = [];
    }
    renderCategoryBar();
}

function renderCategoryBar() {
    const addBtn = document.getElementById('btn-add-category');
    const chips = document.getElementById('vt-cat-chips');
    if (!chips) return;

    if (addBtn) addBtn.classList.toggle('hidden', !vitrineCategoriesEditable);

    chips.innerHTML = '';
    vitrineCategories.forEach(cat => {
        const chip = document.createElement('div');
        chip.className = 'vt-cat-chip';
        chip.dataset.catId = cat.id;
        chip.draggable = vitrineCategoriesEditable;

        const dot = document.createElement('span');
        dot.className = 'vt-cat-dot';
        dot.style.background = cat.color;
        chip.appendChild(dot);

        const name = document.createElement('span');
        name.className = 'vt-cat-name';
        name.textContent = cat.name;
        chip.appendChild(name);

        if (vitrineCategoriesEditable) {
            chip.title = 'Editar categoria';
            chip.addEventListener('click', () => {
                // A drag just ended on this chip — swallow the click.
                if (chip.dataset.justDragged) { delete chip.dataset.justDragged; return; }
                openCategoryModal('edit', cat);
            });
            attachChipDrag(chip);
        }

        chips.appendChild(chip);
    });
}

// ── Drag-and-drop reorder (native, dependency-free) ──
let draggedChip = null;

function attachChipDrag(chip) {
    chip.addEventListener('dragstart', (e) => {
        draggedChip = chip;
        chip.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    chip.addEventListener('dragend', () => {
        chip.classList.remove('dragging');
        chip.dataset.justDragged = '1';
        setTimeout(() => { delete chip.dataset.justDragged; }, 300);
        draggedChip = null;
        persistCategoryOrder();
    });
    chip.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedChip || draggedChip === chip) return;
        const chips = document.getElementById('vt-cat-chips');
        const rect = chip.getBoundingClientRect();
        const after = (e.clientX - rect.left) > rect.width / 2;
        chips.insertBefore(draggedChip, after ? chip.nextSibling : chip);
    });
}

async function persistCategoryOrder() {
    const chips = document.getElementById('vt-cat-chips');
    const order = Array.from(chips.querySelectorAll('.vt-cat-chip')).map(c => c.dataset.catId);
    const current = vitrineCategories.map(c => c.id);
    if (order.length === current.length && order.every((id, i) => id === current[i])) return;

    // Optimistic: reorder the local model to match the DOM, and re-group the
    // product sections so the dashboard reflects the new order immediately.
    const byId = Object.fromEntries(vitrineCategories.map(c => [c.id, c]));
    vitrineCategories = order.map(id => byId[id]).filter(Boolean);
    renderVitrineProducts(vitrineProducts);

    try {
        const res = await fetchManager.reorderCategories(order);
        if (!res.ok) throw new Error('reorder failed');
    } catch (err) {
        console.error('Reorder error:', err);
        notify('error', 'Não foi possível salvar a ordem');
        await loadVitrineCategories(); // resync chips from server
        renderVitrineProducts(vitrineProducts); // and the product sections
    }
}

// ── Create / edit modal ──
let categoryModalMode = 'create';
let categoryModalId = null;
let categoryModalColor = VITRINE_CATEGORY_COLORS[0];

function renderColorSwatches() {
    const wrap = document.getElementById('vt-color-swatches');
    if (!wrap) return;
    wrap.innerHTML = '';
    VITRINE_CATEGORY_COLORS.forEach(color => {
        const sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'vt-swatch' + (color === categoryModalColor ? ' selected' : '');
        sw.style.background = color;
        sw.addEventListener('click', () => {
            categoryModalColor = color;
            wrap.querySelectorAll('.vt-swatch').forEach(s => s.classList.remove('selected'));
            sw.classList.add('selected');
        });
        wrap.appendChild(sw);
    });
}

function openCategoryModal(mode, cat) {
    categoryModalMode = mode;
    categoryModalId = cat?.id || null;
    categoryModalColor = cat?.color || VITRINE_CATEGORY_COLORS[0];

    document.getElementById('category-modal-title').textContent = mode === 'edit' ? 'Editar categoria' : 'Nova categoria';
    document.getElementById('category-name-input').value = cat?.name || '';
    document.getElementById('category-modal-save').textContent = mode === 'edit' ? 'Salvar' : 'Criar';
    document.getElementById('category-modal-delete').classList.toggle('hidden', mode !== 'edit');

    const err = document.getElementById('category-modal-error');
    err.classList.add('hidden');
    err.textContent = '';

    const btnContainer = document.querySelector('#categoryModal .buttonContent');
    setElementState(btnContainer, 'content');

    renderColorSwatches();
    document.getElementById('categoryModal').classList.add('show');
    setTimeout(() => document.getElementById('category-name-input').focus(), 50);
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('show');
}

function showCategoryError(msg) {
    const err = document.getElementById('category-modal-error');
    err.textContent = msg;
    err.classList.remove('hidden');
}

async function saveCategoryModal() {
    const name = document.getElementById('category-name-input').value.trim();
    if (name.length < 2 || name.length > 30) {
        showCategoryError('O nome deve ter entre 2 e 30 caracteres.');
        return;
    }

    const btnContainer = document.querySelector('#categoryModal .buttonContent');
    setElementState(btnContainer, 'loading');

    try {
        const res = categoryModalMode === 'edit'
            ? await fetchManager.updateCategory(categoryModalId, { name, color: categoryModalColor })
            : await fetchManager.createCategory({ name, color: categoryModalColor });

        if (res.ok) {
            closeCategoryModal();
            notify('success', categoryModalMode === 'edit' ? 'Categoria atualizada' : 'Categoria criada');
            await loadVitrineCategories();
            renderVitrineProducts(vitrineProducts); // refresh "Adicionar a" submenus
        } else {
            showCategoryError(res.result?.error || 'Erro ao salvar a categoria.');
            setElementState(btnContainer, 'content');
        }
    } catch (err) {
        console.error('Save category error:', err);
        showCategoryError('Erro de conexão.');
        setElementState(btnContainer, 'content');
    }
}

// ── Delete ──
let deleteCategoryId = null;

function openDeleteCategoryModal(cat) {
    deleteCategoryId = cat.id;
    document.getElementById('delete-category-name').textContent = cat.name;
    const btnContainer = document.querySelector('#deleteCategoryModal .buttonContent');
    setElementState(btnContainer, 'content');
    document.getElementById('deleteCategoryModal').classList.add('show');
}

function closeDeleteCategoryModal() {
    document.getElementById('deleteCategoryModal').classList.remove('show');
    deleteCategoryId = null;
}

// ── Toggle a product's membership in a category (M2M) ──
async function toggleProductCategory(product, categoryId, optEl, checkEl) {
    const ids = product.category_ids || (product.category_ids = []);
    const isOn = ids.includes(categoryId);
    try {
        const res = isOn
            ? await fetchManager.removeProductFromCategory(product.id, categoryId)
            : await fetchManager.addProductToCategory(product.id, categoryId);
        if (!res.ok) throw new Error('toggle failed');

        if (isOn) {
            product.category_ids = ids.filter(id => id !== categoryId);
            optEl.classList.remove('active');
            checkEl.textContent = '';
        } else {
            ids.push(categoryId);
            optEl.classList.add('active');
            checkEl.textContent = '✓';
        }
    } catch (err) {
        console.error('Toggle category error:', err);
        notify('error', 'Erro ao atualizar categoria');
    }
}

// ── Wire up modal controls (once on load) ──
document.getElementById('btn-add-category')?.addEventListener('click', () => openCategoryModal('create'));
document.getElementById('category-modal-save')?.addEventListener('click', saveCategoryModal);
document.getElementById('category-modal-cancel')?.addEventListener('click', closeCategoryModal);
document.getElementById('category-modal-close')?.addEventListener('click', closeCategoryModal);
document.getElementById('categoryModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCategoryModal();
});
document.getElementById('category-name-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveCategoryModal();
});
document.getElementById('category-modal-delete')?.addEventListener('click', () => {
    const cat = vitrineCategories.find(c => c.id === categoryModalId);
    if (!cat) return;
    closeCategoryModal();
    openDeleteCategoryModal(cat);
});

document.getElementById('confirm-delete-category')?.addEventListener('click', async () => {
    if (!deleteCategoryId) return;
    const goneId = deleteCategoryId;
    const btnContainer = document.querySelector('#deleteCategoryModal .buttonContent');
    setElementState(btnContainer, 'loading');
    try {
        const res = await fetchManager.deleteCategory(goneId);
        if (res.ok) {
            closeDeleteCategoryModal();
            notify('success', 'Categoria excluída');
            await loadVitrineCategories();
            // Drop the deleted id from local product assignments + refresh cards.
            vitrineProducts.forEach(p => {
                if (Array.isArray(p.category_ids)) p.category_ids = p.category_ids.filter(id => id !== goneId);
            });
            renderVitrineProducts(vitrineProducts);
        } else {
            notify('error', res.result?.error || 'Erro ao excluir');
            setElementState(btnContainer, 'content');
        }
    } catch (err) {
        console.error('Delete category error:', err);
        notify('error', 'Erro de conexão');
        setElementState(btnContainer, 'content');
    }
});
document.getElementById('deleteCategoryModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDeleteCategoryModal();
});
document.querySelector('#deleteCategoryModal .cancel-btn')?.addEventListener('click', closeDeleteCategoryModal);

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
        allowInstallments: false,
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

    // Reset installments toggle
    const installCheckbox = document.getElementById('product-allow-installments');
    if (installCheckbox) installCheckbox.checked = false;

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
            img.alt = s.name;
            AuthPackFavicon.apply(img, { icon: s.icon, url: s.url });
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

    let installmentsRow = '';
    if (s.billingType === 'one_time') {
        installmentsRow = `
        <div class="review-row">
            <span class="review-label">Parcelas</span>
            <span class="review-value">${s.allowInstallments ? 'Até 12x sem juros' : 'Apenas à vista'}</span>
        </div>`;
    }

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
        ${installmentsRow}
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
            createProductState.allowInstallments = !!document.getElementById('product-allow-installments')?.checked;
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

        if (opt.dataset.type === 'subscription') {
            const cb = document.getElementById('product-allow-installments');
            if (cb) cb.checked = false;
            createProductState.allowInstallments = false;
        }
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
            allow_installments: s.allowInstallments,
            price_cents: Math.round(parseFloat(s.price) * 100),
            currency: 'brl',
            stock: s.stock ? parseInt(s.stock) : null,
        });

        if (res.ok) {
            closeCreateProductModal();
            notify('success', 'Produto criado com sucesso!');

            await reloadVitrineProducts();
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

            await reloadVitrineProducts();
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

            await reloadVitrineProducts();
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

            await reloadVitrineProducts();
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
    // Não limpar allSalesHistory aqui: os KPIs do dashboard (receita bruta)
    // dependem dessa variável e ela seria perdida, fazendo bruto = líquido.
}


document.getElementById('salesHistoryModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSalesHistoryModal();
});
document.querySelector('#salesHistoryModal .close-btn')?.addEventListener('click', closeSalesHistoryModal);

// ── Withdrawal history modal open / close ──
document.getElementById('btn-ver-financeiro')?.addEventListener('click', openWithdrawalModal);
document.getElementById('btn-ver-financeiro-3')?.addEventListener('click', openSalesHistoryModal);

document.getElementById('withdrawalModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeWithdrawalModal();
});
document.querySelector('#withdrawalModal .close-btn')?.addEventListener('click', closeWithdrawalModal);

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

        // receita = valor bruto (preço limpo pago pelo comprador) = total_amount_cents
        // liquido = valor líquido que o seller recebe (92%) = seller_amount_cents
        const receita = order.total_amount_cents || 0;
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
                        <div class="sh-col sh-col-prod">Produto</div>
                        <div class="sh-col sh-col-user">Comprador</div>
                        <div class="sh-col sh-col-pay">Método</div>
                        <div class="sh-col sh-col-val">Valor Bruto</div>
                        <div class="sh-col sh-col-liq">Valor Líquido</div>
                        <div style="width: 28px;"></div>
                    </div>
                `;
                const itemsToShow = mData.list.slice(0, currentLimit);

                itemsToShow.forEach(order => {
                    const item = document.createElement('div');
                    item.className = 'sh-sale-item';

                    const buyerName = order.buyer_name || 'Usuário';
                    const splitU = buyerName.split(' ');
                    const initialU = splitU[0] ? splitU[0][0].toUpperCase() : 'U';

                    const userAvatarHtml = order.buyer_picture
                        ? `<img src="${order.buyer_picture}" alt="${buyerName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`
                        : initialU;

                    const hours = String(order.dateObj.getHours()).padStart(2, '0');
                    const mins = String(order.dateObj.getMinutes()).padStart(2, '0');
                    const dateLabel = `${order.dateObj.getDate()} ${MONTH_SHORT[order.dateObj.getMonth()]}, ${hours}:${mins}`;

                    const pName = order.product_name || 'Produto';
                    const productIdShort = '#' + (order.product_id || '').split('-')[0].toUpperCase();

                    item.innerHTML = `
                        <div class="sh-col sh-col-date">${dateLabel}</div>

                        <div class="sh-col sh-col-prod">
                            <div class="sh-texts">
                                <span class="sh-title">${pName}</span>
                                <span class="sh-sub">${productIdShort}</span>
                            </div>
                        </div>

                        <div class="sh-col sh-col-user">
                            <div class="sh-avatar user-avatar" ${order.buyer_picture ? 'style="background: none;"' : ''}>${userAvatarHtml}</div>
                            <div class="sh-texts">
                                <span class="sh-title">${buyerName}</span>
                                <span class="sh-sub">${order.buyer_email || ''}</span>
                            </div>
                        </div>

                        <div class="sh-col sh-col-pay">${_paymentMethodBadge(order.payment_method)}</div>

                        <div class="sh-col sh-col-val">
                            <div class="sh-sale-revenue">R$ ${formatBRLValue(order.receita)}</div>
                        </div>

                        <div class="sh-col sh-col-liq">
                            <div class="sh-sale-net" style="font-size: 14px; font-weight: 600;">R$ ${formatBRLValue(order.liquido)}</div>
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

            const receita = order.total_amount_cents || 0;
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
                    mContent.innerHTML = `
                        <div class="sh-table-header">
                            <div class="sh-col sh-col-date">Data</div>
                            <div class="sh-col sh-col-user">Comprador</div>
                            <div class="sh-col sh-col-pay">Método</div>
                            <div class="sh-col sh-col-val">Valor Bruto</div>
                            <div class="sh-col sh-col-liq">Valor Líquido</div>
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

                            <div class="sh-col sh-col-pay">${_paymentMethodBadge(order.payment_method)}</div>

                            <div class="sh-col sh-col-val">
                                <div class="sh-sale-revenue">R$ ${formatBRLValue(order.receita)}</div>
                            </div>

                            <div class="sh-col sh-col-liq">
                                <div class="sh-sale-net" style="font-size: 14px; font-weight: 600;">R$ ${formatBRLValue(order.liquido)}</div>
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
            const transfers = res.result.transfers || [];
            const TED_FEE = res.result.ted_fee_cents ?? 367;
            if (transfers.length === 0) {
                wrapEl.innerHTML = '<div class="sh-empty-state">Nenhum saque realizado ainda.</div>';
            } else {
                _renderTransferHistory(transfers, TED_FEE, wrapEl);
            }
        } else {
            wrapEl.innerHTML = '<div class="sh-empty-state">Erro ao carregar histórico de saques.</div>';
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

// Payment method badge helper
function _paymentMethodBadge(method) {
    if (method === 'pix') {
        return `<span class="sh-pay-badge sh-pay-pix">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 30 30" fill="currentColor"><path d="M 15 1.0996094 C 13.975 1.0996094 12.949922 1.4895313 12.169922 2.2695312 L 7.1894531 7.25 L 7.3398438 7.25 C 8.6098437 7.25 9.7992188 7.740625 10.699219 8.640625 L 14.189453 12.130859 C 14.639453 12.570859 15.360547 12.570859 15.810547 12.130859 L 19.300781 8.640625 C 20.200781 7.740625 21.390156 7.25 22.660156 7.25 L 22.810547 7.25 L 17.830078 2.2695312 C 17.050078 1.4895313 16.025 1.0996094 15 1.0996094 z M 5.6894531 8.75 L 2.2695312 12.169922 C 0.70953125 13.729922 0.70953125 16.270078 2.2695312 17.830078 L 5.6894531 21.25 L 7.3398438 21.25 C 8.2098438 21.25 9.030625 20.910781 9.640625 20.300781 L 13.130859 16.810547 C 14.160859 15.780547 15.839141 15.780547 16.869141 16.810547 L 20.359375 20.300781 C 20.969375 20.910781 21.790156 21.25 22.660156 21.25 L 24.310547 21.25 L 27.730469 17.830078 C 29.290469 16.270078 29.290469 13.729922 27.730469 12.169922 L 24.310547 8.75 L 22.660156 8.75 C 21.790156 8.75 20.969375 9.0892188 20.359375 9.6992188 L 16.869141 13.189453 C 16.359141 13.699453 15.68 13.960938 15 13.960938 C 14.32 13.960938 13.640859 13.699453 13.130859 13.189453 L 9.640625 9.6992188 C 9.030625 9.0892187 8.2098437 8.75 7.3398438 8.75 L 5.6894531 8.75 z M 15 17.539062 C 14.7075 17.539062 14.414453 17.649141 14.189453 17.869141 L 10.699219 21.359375 C 9.7992188 22.259375 8.6098437 22.75 7.3398438 22.75 L 7.1894531 22.75 L 12.169922 27.730469 C 13.729922 29.290469 16.270078 29.290469 17.830078 27.730469 L 22.810547 22.75 L 22.660156 22.75 C 21.390156 22.75 20.200781 22.259375 19.300781 21.359375 L 15.810547 17.869141 C 15.585547 17.649141 15.2925 17.539062 15 17.539062 z"></path></svg>
            PIX
        </span>`;
    }
    if (method === 'credit_card') {
        return `<span class="sh-pay-badge sh-pay-card">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>
            Crédito
        </span>`;
    }
    return '<span style="color: var(--ap-text-muted); font-size: 13px;">—</span>';
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
    const { balance, transfers, bank_name, bank_last4 } = data;

    const available = balance?.available_amount || 0;
    const waiting = balance?.waiting_funds_amount || 0;
    const transferred = balance?.transferred_amount || 0;

    // Net values provided by the backend (TED fee already accounted for)
    const TED_FEE = data.ted_fee_cents ?? 367;
    const netAmount = data.net_withdrawable_cents ?? Math.max(0, available - TED_FEE);

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
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>
                <div class="wd-balance-info">
                    <span class="wd-balance-label">Já transferido</span>
                    <span class="wd-balance-value">R$ ${formatBRLValue(transferred)}</span>
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


    // ── Step 1: Withdraw trigger button ──
    const step1 = document.createElement('div');
    step1.className = 'wd-step wd-step-1';
    step1.innerHTML = `
        <button class="btn btn-primary wd-withdraw-btn" id="btn-withdraw-now" ${netAmount <= 0 ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Sacar agora ${netAmount > 0 ? '(R$ ' + formatBRLValue(netAmount) + ')' : ''}
        </button>
        ${netAmount <= 0 ? '<p class="wd-no-balance-note">Saldo insuficiente para cobrir a taxa TED de R$3,67.</p>' : ''}
    `;
    wrapEl.appendChild(step1);

    // ── Step 2: Confirmation panel (hidden initially) ──
    const step2 = document.createElement('div');
    step2.className = 'wd-step wd-step-2';
    step2.style.display = 'none';
    step2.innerHTML = `
        <div class="wd-confirm-panel">
            <div class="wd-confirm-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Confirmar saque
            </div>
            <div class="wd-confirm-breakdown">
                <div class="wd-confirm-row">
                    <span class="wd-confirm-label">Saldo disponível</span>
                    <span class="wd-confirm-value">R$ ${formatBRLValue(available)}</span>
                </div>
                <div class="wd-confirm-row wd-confirm-fee">
                    <span class="wd-confirm-label">Taxa TED (transferência bancária)</span>
                    <span class="wd-confirm-value wd-fee">− R$ ${formatBRLValue(TED_FEE)}</span>
                </div>
                <div class="wd-confirm-divider"></div>
                <div class="wd-confirm-row wd-confirm-total">
                    <span class="wd-confirm-label">Você receberá</span>
                    <span class="wd-confirm-value wd-net">R$ ${formatBRLValue(netAmount)}</span>
                </div>
            </div>
            <div class="wd-confirm-actions">
                <button class="btn btn-secondary wd-cancel-btn" id="btn-withdraw-cancel">Cancelar</button>
                <div class="wd-confirm-btn-wrap buttonContent content-state" id="wd-confirm-btn-wrap">
                    <div class="preset-content">
                        <button class="btn btn-primary wd-withdraw-btn" id="btn-withdraw-confirm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Confirmar
                        </button>
                    </div>
                    <div class="preset-loading">
                        <button class="btn btn-primary wd-withdraw-btn" disabled>
                            <div class="spinner" style="width:16px;height:16px;"></div>
                            Processando...
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    wrapEl.appendChild(step2);

    // ── Event: "Sacar agora" → show confirmation panel ──
    document.getElementById('btn-withdraw-now')?.addEventListener('click', () => {
        step1.style.display = 'none';
        step2.style.display = 'block';
    });

    // ── Event: "Cancelar" → back to step 1 ──
    document.getElementById('btn-withdraw-cancel')?.addEventListener('click', () => {
        step2.style.display = 'none';
        step1.style.display = 'block';
    });

    // ── Event: "Confirmar" → execute withdrawal ──
    const confirmBtnWrap = document.getElementById('wd-confirm-btn-wrap');
    document.getElementById('btn-withdraw-confirm')?.addEventListener('click', async () => {
        setElementState(confirmBtnWrap, 'loading');
        try {
            const res = await fetchManager.requestWithdrawal(netAmount);
            if (res.ok && res.result?.success) {
                notify('success', `Saque de R$ ${formatBRLValue(res.result.amount_cents)} solicitado com sucesso!`);
                closeWithdrawalModal();
                setTimeout(() => openWithdrawalModal(), 300);
            } else {
                const errMsg = res.result?.error || 'Erro ao solicitar saque';
                notify('error', errMsg);
                setElementState(confirmBtnWrap, 'content');
            }
        } catch (err) {
            console.error('requestWithdrawal error:', err);
            notify('error', 'Erro de conexão ao solicitar saque');
            setElementState(confirmBtnWrap, 'content');
        }
    });

    // ── Transfer history (grouped by year → month) ──
    const historySection = document.createElement('div');
    historySection.className = 'pd-section wd-history-section';

    const historyTitle = document.createElement('h3');
    historyTitle.className = 'pd-section-title';
    historyTitle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg> Histórico de saques`;
    historySection.appendChild(historyTitle);

    if (!transfers || transfers.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'sh-empty-state';
        empty.textContent = 'Nenhum saque realizado ainda.';
        historySection.appendChild(empty);
    } else {
        _renderTransferHistory(transfers, TED_FEE, historySection);
    }

    wrapEl.appendChild(historySection);
}

// ── Render transfer history grouped by year → month ──
function _renderTransferHistory(transfers, TED_FEE, container) {
    // 1) Group by year → month
    const grouped = {};
    transfers.forEach(t => {
        const d = new Date(t.date_created || t.created_at || 0);
        const y = d.getFullYear();
        const m = d.getMonth(); // 0-11
        const isTransferred = t.status === 'transferred';

        // "Sacado" e "Recebido" só contam transferências com sucesso
        // sacado  = recebido + taxa TED (valor bruto solicitado)
        // recebido = t.amount (valor líquido que chegou na conta)
        // fee      = TED_FEE (taxa debitada)
        const sacado = isTransferred ? (t.amount || 0) + TED_FEE : 0;
        const received = isTransferred ? (t.amount || 0) : 0;
        const fee = isTransferred ? TED_FEE : 0;

        if (!grouped[y]) {
            grouped[y] = { successCount: 0, sacado: 0, received: 0, fees: 0, months: {} };
        }
        if (!grouped[y].months[m]) {
            grouped[y].months[m] = { successCount: 0, sacado: 0, received: 0, fees: 0, list: [] };
        }

        if (isTransferred) grouped[y].successCount++;
        grouped[y].sacado += sacado;
        grouped[y].received += received;
        grouped[y].fees += fee;

        if (isTransferred) grouped[y].months[m].successCount++;
        grouped[y].months[m].sacado += sacado;
        grouped[y].months[m].received += received;
        grouped[y].months[m].fees += fee;
        grouped[y].months[m].list.push({ ...t, dateObj: d, sacado, received, fee });
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // 2) Build HTML — anos decrescentes
    const yearsSorted = Object.keys(grouped).sort((a, b) => b - a);

    yearsSorted.forEach(yStr => {
        const yData = grouped[yStr];
        const year = parseInt(yStr);

        const yearSection = document.createElement('div');
        yearSection.className = 'sh-year-group';

        // ── Year header: Sacado | Recebido | Taxas TED | Transferências ──
        const yHeader = document.createElement('div');
        yHeader.className = 'sh-year-header';
        yHeader.innerHTML = `
            <div class="sh-year-stats">
                <div class="sh-year-stat">
                    <span class="sh-year-stat-label">Sacado</span>
                    <span class="sh-year-stat-value">R$ ${formatBRLValue(yData.sacado)}</span>
                </div>
                <div class="sh-year-divider"></div>
                <div class="sh-year-stat">
                    <span class="sh-year-stat-label">Recebido</span>
                    <span class="sh-year-stat-value highlight">R$ ${formatBRLValue(yData.received)}</span>
                </div>
                <div class="sh-year-divider"></div>
                <div class="sh-year-stat">
                    <span class="sh-year-stat-label">Taxas TED</span>
                    <span class="sh-year-stat-value" style="color: var(--ap-danger, #ef4444);">− R$ ${formatBRLValue(yData.fees)}</span>
                </div>
                <div class="sh-year-divider"></div>
                <div class="sh-year-stat">
                    <span class="sh-year-stat-label">Saques</span>
                    <span class="sh-year-stat-value">${yData.successCount}</span>
                </div>
            </div>
            <div class="sh-year-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
                ${year}
            </div>
        `;
        yearSection.appendChild(yHeader);

        // ── Meses decrescentes ──
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
                    <span class="sh-month-val-green">R$ ${formatBRLValue(mData.received)}</span>
                </div>
                <div class="sh-month-stats">
                    Sacado R$ ${formatBRLValue(mData.sacado)} &nbsp;·&nbsp; Recebido R$ ${formatBRLValue(mData.received)} &nbsp;·&nbsp; ${mData.successCount} ${mData.successCount === 1 ? 'saque' : 'saques'}
                </div>
            `;

            const mContent = document.createElement('div');
            mContent.className = 'sh-month-content';

            mContent.innerHTML = `
                <div class="sh-table-header">
                    <div class="sh-col" style="flex:1.8;">Data</div>
                    <div class="sh-col" style="flex:1.4;">Status</div>
                    <div class="sh-col" style="flex:1.6; text-align:right; padding-right: 8px;">Sacado</div>
                    <div class="sh-col" style="flex:1.6; text-align:right; padding-right: 8px;">Recebido</div>
                    <div class="sh-col" style="flex:1.4; text-align:right; padding-right: 8px;">Taxa TED</div>
                </div>
            `;

            // Mais recentes primeiro
            const sortedItems = [...mData.list].sort((a, b) => b.dateObj - a.dateObj);

            let currentLimit = 10;
            const renderItems = () => {
                // Remove linhas (mantém o header)
                while (mContent.children.length > 1) mContent.removeChild(mContent.lastChild);

                sortedItems.slice(0, currentLimit).forEach(t => {
                    const day = String(t.dateObj.getDate()).padStart(2, '0');
                    const hours = String(t.dateObj.getHours()).padStart(2, '0');
                    const mins = String(t.dateObj.getMinutes()).padStart(2, '0');
                    const dateLabel = `${day} ${MONTH_SHORT[t.dateObj.getMonth()]}, ${hours}:${mins}`;

                    const row = document.createElement('div');
                    row.className = 'sh-sale-item wd-transfer-row';
                    row.innerHTML = `
                        <div class="sh-col" style="flex:1.8;">${dateLabel}</div>
                        <div class="sh-col" style="flex:1.4;">${_transferStatusBadge(t.status)}</div>
                        <div class="sh-col" style="flex:1.6; text-align:right; padding-right: 8px;">
                            ${t.sacado > 0
                            ? `<span class="wd-transfer-amount">R$ ${formatBRLValue(t.sacado)}</span>`
                            : `<span class="sh-sale-net">—</span>`}
                        </div>
                        <div class="sh-col" style="flex:1.6; text-align:right; padding-right: 8px;">
                            ${t.received > 0
                            ? `<span class="sh-sale-revenue">R$ ${formatBRLValue(t.received)}</span>`
                            : `<span class="sh-sale-net">—</span>`}
                        </div>
                        <div class="sh-col" style="flex:1.4; text-align:right; padding-right: 8px;">
                            ${t.fee > 0
                            ? `<span style="color: var(--ap-danger, #ef4444); font-size: 0.82rem;">− R$ ${formatBRLValue(t.fee)}</span>`
                            : `<span class="sh-sale-net">—</span>`}
                        </div>
                    `;
                    mContent.appendChild(row);
                });

                if (currentLimit < sortedItems.length) {
                    const wrapBtn = document.createElement('div');
                    wrapBtn.className = 'sh-load-more-wrap';
                    const moreBtn = document.createElement('button');
                    moreBtn.className = 'sh-load-more';
                    moreBtn.textContent = `Carregar mais (${sortedItems.length - currentLimit} restantes)`;
                    moreBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        currentLimit += 10;
                        renderItems();
                    });
                    wrapBtn.appendChild(moreBtn);
                    mContent.appendChild(wrapBtn);
                }
            };

            renderItems();

            mBtn.addEventListener('click', () => mGroup.classList.toggle('open'));

            mGroup.appendChild(mBtn);
            mGroup.appendChild(mContent);
            yearSection.appendChild(mGroup);
        });

        container.appendChild(yearSection);
    });
}

// ============================================================================
// PERSONAL DATA MODAL (Meus Dados Pessoais)
// ============================================================================

function _maskCPF(cpf) {
    if (!cpf || cpf.length !== 11) return cpf || '—';
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
}

function _maskCNPJ(cnpj) {
    if (!cnpj || cnpj.length !== 14) return cnpj || '—';
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
}

function _formatDocument(doc, type) {
    if (!doc) return '—';
    if (type === 'company' || doc.length === 14) return _maskCNPJ(doc);
    return _maskCPF(doc);
}

function _formatPhone(phone) {
    if (!phone) return '—';
    const ddd = phone.ddd || '';
    const number = phone.number || '';
    if (number.length === 9) return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5, 9)}`;
    if (number.length === 8) return `(${ddd}) ${number.slice(0, 4)}-${number.slice(4, 8)}`;
    return `(${ddd}) ${number}`;
}

function _formatCEP(cep) {
    if (!cep) return '—';
    const c = String(cep).replace(/\D/g, '');
    if (c.length === 8) return `${c.slice(0, 5)}-${c.slice(5, 8)}`;
    return cep;
}

function _formatMoney(value) {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (isNaN(num)) return '—';
    // value comes in cents from backend (monthly_income etc are strings in cents from pagarme docs)
    return `R$ ${(num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function _formatDateBR(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function _recipientStatusLabel(status) {
    const map = {
        active: 'Ativo',
        registration: 'Em cadastro',
        affiliation: 'Em afiliação',
        refused: 'Recusado',
        suspended: 'Suspenso',
        blocked: 'Bloqueado',
        inactive: 'Inativo',
        pending: 'Pendente',
    };
    return map[status] || status || '—';
}

function _recipientTypeLabel(type) {
    if (type === 'individual') return 'Pessoa Física';
    if (type === 'company') return 'Pessoa Jurídica';
    return type || '—';
}

function _bankTypeLabel(type) {
    if (type === 'checking') return 'Corrente';
    if (type === 'savings') return 'Poupança';
    return type || '—';
}

async function openPersonalDataModal() {
    const modal = document.getElementById('personalDataModal');
    if (!modal) return;

    modal.classList.add('show');

    const loadingEl = document.getElementById('personalDataLoading');
    const wrapEl = document.getElementById('personalDataWrap');

    loadingEl.style.display = 'flex';
    wrapEl.innerHTML = '';

    try {
        const res = await fetchManager.getSellerPersonalData();
        if (res.ok && res.result) {
            renderPersonalData(res.result, wrapEl);
        } else {
            wrapEl.innerHTML = '<div class="sh-empty-state">Erro ao carregar seus dados.</div>';
        }
    } catch (err) {
        console.error('openPersonalDataModal error:', err);
        wrapEl.innerHTML = '<div class="sh-empty-state">Erro de conexão.</div>';
    } finally {
        loadingEl.style.display = 'none';
    }
}

function closePersonalDataModal() {
    const modal = document.getElementById('personalDataModal');
    if (modal) modal.classList.remove('show');
}

function _statusBadgeClass(status) {
    const map = {
        active: 'success',
        registration: 'warning',
        affiliation: 'warning',
        refused: 'danger',
        suspended: 'danger',
        blocked: 'danger',
        inactive: 'muted',
        pending: 'warning',
    };
    return map[status] || 'muted';
}

function _getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderPersonalData(data, wrapEl) {
    const { profile, recipient, bank_account, transfer_settings, register_information } = data;

    const container = document.createElement('div');
    container.className = 'pd-container';

    // ── Profile Header ──
    const statusClass = _statusBadgeClass(recipient?.status);
    const statusLabel = _recipientStatusLabel(recipient?.status);
    const initials = _getInitials(profile?.name || recipient?.name);

    const profileHeader = document.createElement('div');
    profileHeader.className = 'pd-profile-header';
    profileHeader.innerHTML = `
        <div class="pd-avatar">
            ${profile?.picture
            ? `<img src="${profile.picture}" alt="" class="pd-avatar-img">`
            : `<span class="pd-avatar-fallback">${initials}</span>`
        }
        </div>
        <div class="pd-profile-info">
            <h3 class="pd-profile-name">${profile?.name || recipient?.name || '—'}</h3>
            <p class="pd-profile-email">${profile?.email || recipient?.email || '—'}</p>
            <span class="pd-status-badge ${statusClass}">
                <span class="pd-status-dot"></span>
                ${statusLabel}
            </span>
        </div>
    `;
    container.appendChild(profileHeader);

    // ── Section: Account Data ──
    const accountSection = document.createElement('div');
    accountSection.className = 'pd-card';
    accountSection.innerHTML = `
        <div class="pd-card-header">
            <div class="pd-card-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <span class="pd-card-title">Dados da Conta</span>
        </div>
        <div class="pd-card-body">
            <div class="pd-data-row">
                <span class="pd-data-label">Nome</span>
                <span class="pd-data-value">${recipient?.name || '—'}</span>
            </div>
            <div class="pd-data-row">
                <span class="pd-data-label">E-mail</span>
                <span class="pd-data-value">${recipient?.email || '—'}</span>
            </div>
            <div class="pd-data-row">
                <span class="pd-data-label">CPF/CNPJ</span>
                <span class="pd-data-value">${_formatDocument(recipient?.document, recipient?.type)}</span>
            </div>
            <div class="pd-data-row">
                <span class="pd-data-label">Tipo</span>
                <span class="pd-data-value">${_recipientTypeLabel(recipient?.type)}</span>
            </div>
            <div class="pd-data-row">
                <span class="pd-data-label">ID do Recebedor</span>
                <span class="pd-data-value mono">${recipient?.id || '—'}</span>
            </div>
        </div>
    `;
    container.appendChild(accountSection);

    // ── Section: Bank Account ──
    if (bank_account) {
        const bankSection = document.createElement('div');
        bankSection.className = 'pd-card';
        const bankName = bank_account.bank || '—';
        const agency = bank_account.branch_number
            ? `${bank_account.branch_number}${bank_account.branch_check_digit ? '-' + bank_account.branch_check_digit : ''}`
            : '—';
        const account = bank_account.account_number
            ? `${bank_account.account_number}${bank_account.account_check_digit ? '-' + bank_account.account_check_digit : ''}`
            : '—';
        bankSection.innerHTML = `
            <div class="pd-card-header">
                <div class="pd-card-icon accent-green">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/></svg>
                </div>
                <span class="pd-card-title">Dados Bancários</span>
            </div>
            <div class="pd-card-body">
                <div class="pd-data-row">
                    <span class="pd-data-label">Banco</span>
                    <span class="pd-data-value">${bankName}</span>
                </div>
                <div class="pd-data-row">
                    <span class="pd-data-label">Agência</span>
                    <span class="pd-data-value">${agency}</span>
                </div>
                <div class="pd-data-row">
                    <span class="pd-data-label">Conta</span>
                    <span class="pd-data-value">${account}</span>
                </div>
                <div class="pd-data-row">
                    <span class="pd-data-label">Tipo</span>
                    <span class="pd-data-value">${_bankTypeLabel(bank_account.type)}</span>
                </div>
                <div class="pd-data-row">
                    <span class="pd-data-label">Titular</span>
                    <span class="pd-data-value">${bank_account.holder_name || '—'}</span>
                </div>
                <div class="pd-data-row">
                    <span class="pd-data-label">Documento do Titular</span>
                    <span class="pd-data-value">${_formatDocument(bank_account.holder_document, bank_account.holder_type)}</span>
                </div>
            </div>
        `;
        container.appendChild(bankSection);
    }

    // ── Section: Transfer Settings ──
    if (transfer_settings) {
        const tsSection = document.createElement('div');
        tsSection.className = 'pd-card';
        tsSection.innerHTML = `
            <div class="pd-card-header">
                <div class="pd-card-icon accent-blue">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 22h-1a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4h1"/><path d="M7 22h1a4 4 0 0 0 4-4V6a4 4 0 0 0-4-4H7"/><path d="M12 2v20"/></svg>
                </div>
                <span class="pd-card-title">Configuração de Transferência</span>
            </div>
            <div class="pd-card-body">
                <div class="pd-data-row">
                    <span class="pd-data-label">Modo de recebimento</span>
                    <span class="pd-data-value">Saque manual</span>
                </div>
                <div class="pd-data-row">
                    <span class="pd-data-label">Como funciona</span>
                    <span class="pd-data-value">Você saca o saldo disponível quando quiser</span>
                </div>
            </div>
        `;
        container.appendChild(tsSection);
    }

    // ── Section: Address ──
    const addr = register_information?.address || register_information?.main_address;
    if (addr) {
        const addrSection = document.createElement('div');
        addrSection.className = 'pd-card';
        addrSection.innerHTML = `
            <div class="pd-card-header">
                <div class="pd-card-icon accent-orange">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <span class="pd-card-title">Endereço</span>
            </div>
            <div class="pd-card-body">
                <div class="pd-data-row">
                    <span class="pd-data-label">Rua</span>
                    <span class="pd-data-value">${addr.street || '—'}${addr.street_number ? ', ' + addr.street_number : ''}</span>
                </div>
                <div class="pd-data-row">
                    <span class="pd-data-label">Complemento</span>
                    <span class="pd-data-value">${addr.complementary || '—'}</span>
                </div>
                <div class="pd-data-row">
                    <span class="pd-data-label">Bairro</span>
                    <span class="pd-data-value">${addr.neighborhood || '—'}</span>
                </div>
                <div class="pd-data-row">
                    <span class="pd-data-label">Cidade/UF</span>
                    <span class="pd-data-value">${addr.city || '—'}${addr.state ? ' - ' + addr.state : ''}</span>
                </div>
                <div class="pd-data-row">
                    <span class="pd-data-label">CEP</span>
                    <span class="pd-data-value">${_formatCEP(addr.zip_code)}</span>
                </div>
                <div class="pd-data-row">
                    <span class="pd-data-label">Ponto de referência</span>
                    <span class="pd-data-value">${addr.reference_point || '—'}</span>
                </div>
            </div>
        `;
        container.appendChild(addrSection);
    }

    // ── Section: Contact / Register Info ──
    if (register_information) {
        const regSection = document.createElement('div');
        regSection.className = 'pd-card';

        const phones = register_information.phone_numbers || [];
        const phonesHtml = phones.length > 0
            ? phones.map(p => `<span class="pd-data-value">${_formatPhone(p)}</span>`).join('<span class="pd-phone-sep">•</span>')
            : '';

        // PF specific
        const pfRows = [];
        if (register_information.mother_name) pfRows.push(`<div class="pd-data-row"><span class="pd-data-label">Nome da mãe</span><span class="pd-data-value">${register_information.mother_name}</span></div>`);
        if (register_information.birthdate) pfRows.push(`<div class="pd-data-row"><span class="pd-data-label">Data de nascimento</span><span class="pd-data-value">${register_information.birthdate}</span></div>`);
        if (register_information.monthly_income) pfRows.push(`<div class="pd-data-row"><span class="pd-data-label">Renda mensal</span><span class="pd-data-value">${_formatMoney(register_information.monthly_income)}</span></div>`);
        if (register_information.professional_occupation) pfRows.push(`<div class="pd-data-row"><span class="pd-data-label">Ocupação profissional</span><span class="pd-data-value">${register_information.professional_occupation}</span></div>`);

        // PJ specific
        const pjRows = [];
        if (register_information.company_name) pjRows.push(`<div class="pd-data-row"><span class="pd-data-label">Razão social</span><span class="pd-data-value">${register_information.company_name}</span></div>`);
        if (register_information.trading_name) pjRows.push(`<div class="pd-data-row"><span class="pd-data-label">Nome fantasia</span><span class="pd-data-value">${register_information.trading_name}</span></div>`);
        if (register_information.annual_revenue) pjRows.push(`<div class="pd-data-row"><span class="pd-data-label">Faturamento anual</span><span class="pd-data-value">${_formatMoney(register_information.annual_revenue)}</span></div>`);
        if (register_information.founding_date) pjRows.push(`<div class="pd-data-row"><span class="pd-data-label">Data de fundação</span><span class="pd-data-value">${register_information.founding_date}</span></div>`);
        if (register_information.cnae) pjRows.push(`<div class="pd-data-row"><span class="pd-data-label">CNAE</span><span class="pd-data-value">${register_information.cnae}</span></div>`);

        regSection.innerHTML = `
            <div class="pd-card-header">
                <div class="pd-card-icon accent-purple">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 10h2"/><path d="M16 14h2"/><path d="M6.17 15a3 3 0 0 1 5.66 0"/><circle cx="9" cy="11" r="2"/><rect x="2" y="5" width="20" height="14" rx="2"/></svg>
                </div>
                <span class="pd-card-title">Informações Cadastrais</span>
            </div>
            <div class="pd-card-body">
                ${register_information.name ? `<div class="pd-data-row"><span class="pd-data-label">Nome completo</span><span class="pd-data-value">${register_information.name}</span></div>` : ''}
                ${register_information.site_url ? `<div class="pd-data-row"><span class="pd-data-label">Site</span><span class="pd-data-value">${register_information.site_url}</span></div>` : ''}
                ${pfRows.join('')}
                ${pjRows.join('')}
                ${phonesHtml ? `<div class="pd-data-row"><span class="pd-data-label">Telefone(s)</span><span class="pd-data-value">${phonesHtml}</span></div>` : ''}
            </div>
        `;
        container.appendChild(regSection);
    }

    wrapEl.appendChild(container);
}

// ============================================================================
// WITHDRAW CONFIRM MODAL
// ============================================================================

function openWithdrawConfirmModal() {
    const modal = document.getElementById('withdrawConfirmModal');
    if (!modal) return;

    const available = financialCenterData.balance?.available_amount ?? 0;
    const tedFee = financialCenterData.tedFeeCents ?? 367;
    const net = financialCenterData.netWithdrawableCents ?? Math.max(0, available - tedFee);

    document.getElementById('wc-requested').textContent = formatCentsToBRL(available);
    document.getElementById('wc-ted-fee').textContent = formatCentsToBRL(tedFee);
    document.getElementById('wc-net').textContent = formatCentsToBRL(net);

    const confirmBtn = document.getElementById('wc-confirm-btn');
    confirmBtn.disabled = net <= 0;

    modal.classList.add('show');
}

function closeWithdrawConfirmModal() {
    const modal = document.getElementById('withdrawConfirmModal');
    if (modal) modal.classList.remove('show');
}

async function confirmWithdrawal() {
    const available = financialCenterData.balance?.available_amount ?? 0;
    if (available <= 0) return;

    const confirmBtn = document.getElementById('wc-confirm-btn');
    const cancelBtn = document.getElementById('wc-cancel-btn');
    const originalLabel = confirmBtn.textContent;
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    confirmBtn.textContent = 'Aguarde…';

    const restoreButton = () => {
        confirmBtn.disabled = false;
        cancelBtn.disabled = false;
        confirmBtn.textContent = originalLabel;
    };

    try {
        const res = await fetchManager.requestWithdrawal(available);
        if (res.ok && res.result?.success) {
            closeWithdrawConfirmModal();
            notify('success', `Saque de R$ ${formatBRLValue(res.result.amount_cents)} solicitado com sucesso!`);
            // Refresh balances: the now-pending withdrawal is counted as a saída,
            // so the available balance drops (to R$ 0,00 when the full amount was
            // withdrawn), preventing a second withdrawal of the same funds.
            loadSellerDashboardData();
        } else {
            notify('error', res.result?.error || 'Erro ao solicitar saque. Tente novamente.');
            restoreButton();
        }
    } catch (err) {
        console.error('confirmWithdrawal error:', err);
        notify('error', 'Erro de conexão. Tente novamente.');
        restoreButton();
    }
}

// Event listeners

document.getElementById('withdrawalModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeWithdrawalModal();
});
document.querySelector('#withdrawalModal .close-btn')?.addEventListener('click', closeWithdrawalModal);

document.getElementById('btn-personal-data')?.addEventListener('click', openPersonalDataModal);
document.getElementById('personalDataModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closePersonalDataModal();
});
document.querySelector('#personalDataModal .close-btn')?.addEventListener('click', closePersonalDataModal);


// "Sacar agora" button → opens confirmation modal
document.getElementById('btn-sacar-agora')?.addEventListener('click', openWithdrawConfirmModal);
document.getElementById('withdrawConfirmModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeWithdrawConfirmModal();
});
document.querySelector('#withdrawConfirmModal .wc-close-btn')?.addEventListener('click', closeWithdrawConfirmModal);
document.getElementById('wc-cancel-btn')?.addEventListener('click', closeWithdrawConfirmModal);
document.getElementById('wc-confirm-btn')?.addEventListener('click', confirmWithdrawal);

// "Ver histórico de saques" (Minha Vitrine)
document.getElementById('btn-ver-financeiro')?.addEventListener('click', openWithdrawalModal);

// "Ver histórico de vendas" (Minha Vitrine)
document.getElementById('btn-ver-financeiro-3')?.addEventListener('click', openSalesHistoryModal);


// ============================================================================
// CASH FLOW DETAIL MODALS (Entradas / Saídas)
// ============================================================================

const MONTH_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

let cfEntriesCurrentMonth = null;
let cfEntriesData = null;
let cfEntriesFilter = 'all';

function getDefaultCfMonth() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
}

function cfMonthKey(m) {
    return `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
}

function cfMonthLabel(m) {
    return `${MONTH_FULL[m.month]} ${m.year}`;
}

function cfMonthRefLabel(m) {
    return `${MONTH_FULL[m.month].toLowerCase()} de ${m.year}`;
}

function cfPrevMonth(m) {
    let month = m.month - 1;
    let year = m.year;
    if (month < 0) { month = 11; year--; }
    return { year, month };
}

function cfNextMonth(m) {
    let month = m.month + 1;
    let year = m.year;
    if (month > 11) { month = 0; year++; }
    return { year, month };
}

function cfIsCurrentMonth(m) {
    const now = new Date();
    return m.year === now.getFullYear() && m.month === now.getMonth();
}

// ── Entries modal open/close ──

async function openCashFlowEntriesModal() {
    const modal = document.getElementById('cashFlowEntriesModal');
    if (!modal) return;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    cfEntriesCurrentMonth = cfEntriesCurrentMonth || getDefaultCfMonth();
    cfEntriesFilter = 'all';
    _cfResetTabsAndMetrics();
    await loadCashFlowEntriesDetail(cfEntriesCurrentMonth);
}

function closeCashFlowEntriesModal() {
    const modal = document.getElementById('cashFlowEntriesModal');
    if (!modal) return;
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// ── Avatar helpers ──

const _cfAvatarBgPalette = ['#e0f2fe', '#dcfce7', '#fef3c7', '#ede9fe', '#fce7f3', '#fff7ed'];
const _cfAvatarFgPalette = ['#0369a1', '#15803d', '#b45309', '#7c3aed', '#be185d', '#c2410c'];

function _cfAvatarBg(name) {
    return _cfAvatarBgPalette[(name || 'U').charCodeAt(0) % _cfAvatarBgPalette.length];
}

function _cfAvatarFg(name) {
    return _cfAvatarFgPalette[(name || 'U').charCodeAt(0) % _cfAvatarFgPalette.length];
}

function _cfInitials(name) {
    if (!name) return 'U';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ── Date helpers ──

function _cfFormatDateShort(dateStr) {
    if (!dateStr) return '';
    const [, m, d] = dateStr.split('-');
    return `${d}/${m}`;
}

function _cfDateLabel(dateStr) {
    if (!dateStr || dateStr === '0000-00-00') return 'Sem data';
    const [y, m, d] = dateStr.split('-').map(Number);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateStr === todayStr) return 'Hoje';
    if (dateStr === yesterdayStr) return 'Ontem';
    return `${d} de ${MONTH_FULL[m - 1].toLowerCase()}`;
}

// ── Release label per category ──

function _cfReleaseLabel(catKey, item) {
    if (catKey === 'subscription') return 'Renovação mensal';
    if (catKey === 'installment') return `${item.installment || ''}ª de ${item.total_installments || ''} parcelas`;
    if (catKey === 'pending_settlement') return `Liberação ${_cfFormatDateShort(item.release_date)}`;
    return `Liberado ${_cfFormatDateShort(item.release_date)}`;
}

// ── Category metadata ──

const CF_CAT_COLORS = {
    new_sale: '#22c55e',
    subscription: '#3b82f6',
    installment: '#f59e0b',
    pending_settlement: '#8b5cf6',
};

const CF_CATEGORIES = [
    { key: 'new_sale', label: 'Novas vendas' },
    { key: 'subscription', label: 'Assinaturas' },
    { key: 'installment', label: 'Parcelas' },
    { key: 'pending_settlement', label: 'Aguardando compensação' },
];

// ── Reset tabs and metric cards ──

function _cfResetTabsAndMetrics() {
    document.querySelectorAll('#cashFlowEntriesModal .cf-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.filter === 'all');
    });
    document.querySelectorAll('#cashFlowEntriesModal .cf-metric').forEach(m => {
        m.classList.remove('active');
    });
}

// ── Main data loader ──

async function loadCashFlowEntriesDetail(m) {
    const monthLabel = document.getElementById('cf-entries-month-label');
    const monthRef = document.getElementById('cfMonthRef');
    const nextBtn = document.getElementById('cf-entries-next');
    if (monthLabel) monthLabel.textContent = cfMonthLabel(m);
    if (monthRef) monthRef.textContent = cfMonthRefLabel(m);
    if (nextBtn) nextBtn.disabled = cfIsCurrentMonth(m);

    const loading = document.getElementById('cfEntriesLoading');
    const list = document.getElementById('cfEntriesList');
    if (loading) loading.style.display = 'flex';
    if (list) list.innerHTML = '';

    try {
        const res = await fetchManager.getCashFlowDetail(cfMonthKey(m));
        if (loading) loading.style.display = 'none';
        if (!res.ok || !res.result) {
            _cfRenderEmptyState(list, 'Não foi possível carregar os dados.');
            _cfUpdateHeroAndMetrics(null);
            return;
        }

        cfEntriesData = res.result;
        cfEntriesFilter = 'all';
        _cfResetTabsAndMetrics();
        _cfUpdateHeroAndMetrics(cfEntriesData);
        _cfRenderList();

    } catch (err) {
        console.error('[CashFlow] Error loading entries detail:', err);
        if (loading) loading.style.display = 'none';
        _cfRenderEmptyState(list, 'Erro ao carregar dados.');
        _cfUpdateHeroAndMetrics(null);
    }
}

// ── Update hero amount + metric cards + tab badges ──

function _cfUpdateHeroAndMetrics(data) {
    const heroAmount = document.getElementById('cfHeroAmount');
    const footerTotal = document.getElementById('cfFooterTotal');

    if (!data) {
        if (heroAmount) heroAmount.textContent = 'R$ 0,00';
        if (footerTotal) footerTotal.textContent = 'R$ 0,00';
        ['cf-m-sales', 'cf-m-sub', 'cf-m-inst', 'cf-m-pend'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'R$ 0,00';
        });
        ['cf-m-sales-c', 'cf-m-sub-c', 'cf-m-inst-c', 'cf-m-pend-c'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
        ['cf-badge-all', 'cf-badge-new_sale', 'cf-badge-sub', 'cf-badge-inst', 'cf-badge-pend'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
        return;
    }

    const totals = data.monthly_totals || {};
    const cats = data.categories || {};

    if (heroAmount) heroAmount.textContent = formatCentsToBRL(totals.total_cents || 0);
    if (footerTotal) footerTotal.textContent = formatCentsToBRL(totals.total_cents || 0);

    const salesEl = document.getElementById('cf-m-sales');
    const subEl = document.getElementById('cf-m-sub');
    const instEl = document.getElementById('cf-m-inst');
    const pendEl = document.getElementById('cf-m-pend');
    if (salesEl) salesEl.textContent = formatCentsToBRL(totals.new_sales_cents || 0);
    if (subEl) subEl.textContent = formatCentsToBRL(totals.subscription_cents || 0);
    if (instEl) instEl.textContent = formatCentsToBRL(totals.installment_cents || 0);
    if (pendEl) pendEl.textContent = formatCentsToBRL(totals.pending_settlement_cents || 0);

    const salesCount = cats.new_sale?.items?.length || 0;
    const subCount = cats.subscription?.items?.length || 0;
    const instCount = cats.installment?.items?.length || 0;
    const pendCount = cats.pending_settlement?.items?.length || 0;
    const totalCount = salesCount + subCount + instCount + pendCount;

    const salesCEl = document.getElementById('cf-m-sales-c');
    const subCEl = document.getElementById('cf-m-sub-c');
    const instCEl = document.getElementById('cf-m-inst-c');
    const pendCEl = document.getElementById('cf-m-pend-c');
    if (salesCEl) salesCEl.textContent = `${salesCount} transaç${salesCount === 1 ? 'ão' : 'ões'}`;
    if (subCEl) subCEl.textContent = `${subCount} renovaç${subCount === 1 ? 'ão' : 'ões'}`;
    if (instCEl) instCEl.textContent = `${instCount} parcela${instCount === 1 ? '' : 's'}`;
    if (pendCEl) pendCEl.textContent = `${pendCount} aguardando`;

    const allBadge = document.getElementById('cf-badge-all');
    const saleBadge = document.getElementById('cf-badge-new_sale');
    const subBadge = document.getElementById('cf-badge-sub');
    const instBadge = document.getElementById('cf-badge-inst');
    const pendBadge = document.getElementById('cf-badge-pend');
    if (allBadge) allBadge.textContent = totalCount;
    if (saleBadge) saleBadge.textContent = salesCount;
    if (subBadge) subBadge.textContent = subCount;
    if (instBadge) instBadge.textContent = instCount;
    if (pendBadge) pendBadge.textContent = pendCount;
}

// ── Render transaction list ──

function _cfRenderList() {
    const list = document.getElementById('cfEntriesList');
    if (!list || !cfEntriesData) return;
    list.innerHTML = '';

    const cats = cfEntriesData.categories || {};

    const allItems = [];
    CF_CATEGORIES.forEach(catDef => {
        const cat = cats[catDef.key];
        if (!cat || !cat.items) return;
        cat.items.forEach(item => {
            allItems.push({ ...item, _cat: catDef.key, _color: CF_CAT_COLORS[catDef.key] });
        });
    });

    const filtered = cfEntriesFilter === 'all'
        ? allItems
        : allItems.filter(item => item._cat === cfEntriesFilter);

    // Update footer total based on filter
    const footerTotal = document.getElementById('cfFooterTotal');
    if (footerTotal) {
        const filteredSum = filtered.reduce((sum, item) => sum + (item.amount_cents || 0), 0);
        footerTotal.textContent = formatCentsToBRL(cfEntriesFilter === 'all'
            ? (cfEntriesData.monthly_totals?.total_cents || 0)
            : filteredSum);
    }

    if (filtered.length === 0) {
        const monthName = cfEntriesCurrentMonth ? MONTH_FULL[cfEntriesCurrentMonth.month] : '';
        const msg = cfEntriesFilter !== 'all'
            ? 'Nenhuma transação nesta categoria'
            : `Nenhuma entrada em ${monthName}`;
        _cfRenderEmptyState(list, msg);
        _cfRenderFutureSection(list);
        return;
    }

    const groups = {};
    filtered.forEach(item => {
        const dateKey = item.release_date || item.order_created_at || '0000-00-00';
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(item);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach(dateKey => {
        const group = document.createElement('div');
        group.className = 'cf-date-group';

        const header = document.createElement('div');
        header.className = 'cf-date-header';
        header.textContent = _cfDateLabel(dateKey);
        group.appendChild(header);

        groups[dateKey].forEach(item => {
            group.appendChild(_cfRenderTxn(item));
        });

        list.appendChild(group);
    });

    _cfRenderFutureSection(list);
}

// ── Render single transaction item ──

function _cfRenderTxn(item) {
    const wrap = document.createElement('div');
    wrap.className = 'cf-txn';
    wrap.setAttribute('data-cat', item._cat);

    const accent = document.createElement('div');
    accent.className = 'cf-txn-accent';
    accent.style.background = item._color;

    const avatar = document.createElement('div');
    avatar.className = 'cf-txn-avatar';
    const buyerName = item.buyer_name || 'Comprador';
    if (item.buyer_picture) {
        avatar.innerHTML = `<img src="${item.buyer_picture}" alt="${buyerName}">`;
    } else {
        avatar.style.background = _cfAvatarBg(buyerName);
        avatar.style.color = _cfAvatarFg(buyerName);
        avatar.textContent = _cfInitials(buyerName);
    }

    const body = document.createElement('div');
    body.className = 'cf-txn-body';

    const productLine = document.createElement('div');
    productLine.className = 'cf-txn-product';
    const pid = item.product_id ? '#' + item.product_id.slice(0, 5) : '';
    productLine.innerHTML = `${item.product_name || 'Produto'}${pid ? ` <span class="cf-txn-pid">${pid}</span>` : ''}`;

    const metaLine = document.createElement('div');
    metaLine.className = 'cf-txn-meta';
    const methodClass = item.payment_method === 'pix' ? 'pix' : 'card';
    const methodLabel = item.payment_method === 'pix' ? 'PIX' : 'Cartão';
    metaLine.innerHTML = `<span class="cf-txn-method-badge ${methodClass}">${methodLabel}</span><span class="cf-txn-meta-sep">·</span><span>${buyerName}</span>`;

    body.appendChild(productLine);
    body.appendChild(metaLine);

    const right = document.createElement('div');
    right.className = 'cf-txn-right';

    const val = document.createElement('span');
    val.className = 'cf-txn-value';
    val.textContent = formatCentsToBRL(item.amount_cents);
    right.appendChild(val);

    if (item._cat === 'pending_settlement') {
        const badge = document.createElement('span');
        badge.className = 'cf-txn-pending-badge';
        badge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${_cfReleaseLabel(item._cat, item)}`;
        right.appendChild(badge);
    } else {
        const dateLabel = document.createElement('span');
        dateLabel.className = 'cf-txn-date-label';
        dateLabel.textContent = _cfReleaseLabel(item._cat, item);
        right.appendChild(dateLabel);
    }

    wrap.appendChild(accent);
    wrap.appendChild(avatar);
    wrap.appendChild(body);
    wrap.appendChild(right);

    return wrap;
}

// ── Render empty state ──

function _cfRenderEmptyState(container, message) {
    if (!container) return;
    const empty = document.createElement('div');
    empty.className = 'cf-empty';
    empty.innerHTML = `
        <div class="cf-empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/></svg>
        </div>
        <strong style="color:var(--ap-text-secondary);font-size:14px;">${message}</strong>
        <span style="font-size:12px;">As entradas aparecerão aqui quando houver movimentações.</span>`;
    container.appendChild(empty);
}

// ── Render future entries section ──

function _cfRenderFutureSection(container) {
    if (!container || !cfEntriesData) return;
    if (cfEntriesFilter !== 'all' && cfEntriesFilter !== 'pending_settlement' && cfEntriesFilter !== 'installment') return;

    const futureInst = cfEntriesData.future_installments;
    const futurePend = cfEntriesData.future_pending_settlement;
    const hasInst = (cfEntriesFilter === 'all' || cfEntriesFilter === 'installment') && futureInst && futureInst.length > 0;
    const hasPend = (cfEntriesFilter === 'all' || cfEntriesFilter === 'pending_settlement') && futurePend && futurePend.length > 0;
    if (!hasInst && !hasPend) return;

    const section = document.createElement('div');
    section.className = 'cf-future-section';

    const hdr = document.createElement('div');
    hdr.className = 'cf-future-header';
    const badge = document.createElement('span');
    badge.className = 'cf-future-badge';
    badge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Próximas liberações`;
    hdr.appendChild(badge);
    section.appendChild(hdr);

    if (hasInst) {
        _cfRenderFutureSubSection(section, 'Parcelas', futureInst, 'installment');
    }
    if (hasPend) {
        _cfRenderFutureSubSection(section, 'Compensação', futurePend, 'pending_settlement');
    }

    container.appendChild(section);
}

function _cfRenderFutureSubSection(parent, title, items, catKey) {
    const subHeader = document.createElement('div');
    subHeader.className = 'cf-future-sub-header';
    subHeader.innerHTML = `<span class="cf-future-sub-dot" style="background:${CF_CAT_COLORS[catKey]}"></span>${title}`;
    parent.appendChild(subHeader);

    items.forEach(fi => {
        const [y, mo] = fi.month.split('-').map(Number);
        const lbl = `${MONTH_FULL[mo - 1]} ${y}`;
        const countLabel = catKey === 'installment'
            ? `${fi.count} parcela${fi.count > 1 ? 's' : ''}`
            : `${fi.count} compensaç${fi.count > 1 ? 'ões' : 'ão'}`;

        const wrapper = document.createElement('div');
        wrapper.className = 'cf-future-item';

        const row = document.createElement('div');
        row.className = 'cf-future-item-row';
        row.style.cursor = 'pointer';
        row.innerHTML = `
            <div class="cf-txn-accent" style="background:${CF_CAT_COLORS[catKey]}"></div>
            <div class="cf-txn-avatar" style="background:var(--ap-accent-light);color:var(--ap-accent)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="cf-txn-body">
                <div class="cf-txn-product">${lbl}</div>
                <div class="cf-txn-meta">${countLabel}</div>
            </div>
            <div class="cf-txn-right">
                <span class="cf-txn-value">${formatCentsToBRL(fi.estimated_cents)}</span>
                <span class="cf-txn-pending-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Previsão
                </span>
            </div>
            <svg class="cf-future-chevron" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
        wrapper.appendChild(row);

        const detail = document.createElement('div');
        detail.className = 'cf-future-detail';

        (fi.items || []).forEach(item => {
            detail.appendChild(_cfRenderFutureDetailRow(item, catKey));
        });

        wrapper.appendChild(detail);

        row.addEventListener('click', () => {
            wrapper.classList.toggle('open');
        });

        parent.appendChild(wrapper);
    });
}

// ── Render a single detail row inside a future expandable item ──

function _cfRenderFutureDetailRow(item, catKey) {
    const buyerName = item.buyer_name || 'Comprador';
    const pid = item.product_id ? '#' + item.product_id.slice(0, 5) : '';
    const releaseLabel = catKey === 'installment'
        ? `${item.installment || ''}ª de ${item.total_installments || ''} parcelas · Liberação ${_cfFormatDateShort(item.release_date)}`
        : `Liberação ${_cfFormatDateShort(item.release_date)}`;

    const detailRow = document.createElement('div');
    detailRow.className = 'cf-future-detail-row';

    const avatar = document.createElement('div');
    avatar.className = 'cf-future-detail-avatar';
    if (item.buyer_picture) {
        avatar.innerHTML = `<img src="${item.buyer_picture}" alt="${buyerName}">`;
    } else {
        avatar.style.background = _cfAvatarBg(buyerName);
        avatar.style.color = _cfAvatarFg(buyerName);
        avatar.textContent = _cfInitials(buyerName);
    }

    const body = document.createElement('div');
    body.className = 'cf-future-detail-body';
    body.innerHTML = `
        <div class="cf-future-detail-product">${item.product_name || 'Produto'}${pid ? ` <span class="cf-txn-pid">${pid}</span>` : ''}</div>
        <div class="cf-future-detail-meta">${buyerName} · ${releaseLabel}</div>`;

    const val = document.createElement('span');
    val.className = 'cf-future-detail-value';
    val.textContent = formatCentsToBRL(item.amount_cents);

    detailRow.appendChild(avatar);
    detailRow.appendChild(body);
    detailRow.appendChild(val);
    return detailRow;
}

// ── Event listeners ──

document.getElementById('btn-cashflow-entries')?.addEventListener('click', openCashFlowEntriesModal);
document.getElementById('cashFlowEntriesModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCashFlowEntriesModal();
});
document.querySelector('#cashFlowEntriesModal .close-btn')?.addEventListener('click', closeCashFlowEntriesModal);

document.getElementById('btn-cashflow-exits')?.addEventListener('click', openWithdrawalModal);

document.getElementById('cf-entries-prev')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    cfEntriesCurrentMonth = cfPrevMonth(cfEntriesCurrentMonth);
    await loadCashFlowEntriesDetail(cfEntriesCurrentMonth);
});
document.getElementById('cf-entries-next')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (cfIsCurrentMonth(cfEntriesCurrentMonth)) return;
    cfEntriesCurrentMonth = cfNextMonth(cfEntriesCurrentMonth);
    await loadCashFlowEntriesDetail(cfEntriesCurrentMonth);
});

// Tab click → filter
document.querySelectorAll('#cashFlowEntriesModal .cf-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('#cashFlowEntriesModal .cf-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        cfEntriesFilter = tab.dataset.filter;

        document.querySelectorAll('#cashFlowEntriesModal .cf-metric').forEach(m => m.classList.remove('active'));
        if (cfEntriesFilter !== 'all') {
            document.querySelector(`#cashFlowEntriesModal .cf-metric[data-filter="${cfEntriesFilter}"]`)?.classList.add('active');
        }

        _cfRenderList();
    });
});

// Metric card click → filter
document.querySelectorAll('#cashFlowEntriesModal .cf-metric').forEach(card => {
    card.addEventListener('click', () => {
        const filter = card.dataset.filter;

        if (cfEntriesFilter === filter) {
            cfEntriesFilter = 'all';
            document.querySelectorAll('#cashFlowEntriesModal .cf-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.filter === 'all');
            });
            card.classList.remove('active');
        } else {
            cfEntriesFilter = filter;
            document.querySelectorAll('#cashFlowEntriesModal .cf-metric').forEach(m => m.classList.remove('active'));
            card.classList.add('active');
            document.querySelectorAll('#cashFlowEntriesModal .cf-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.filter === filter);
            });
        }
        _cfRenderList();
    });
});

// ============================================================================
// VITRINE PROFILE EDITOR (storefront — display name, bio, contacts, share)
// ============================================================================

let currentVitrine = null;

function vitrinePublicUrl(id) {
    return `${window.location.origin}/pages/vitrine/?loja=${id}`;
}

// Loads (and caches) the seller's own vitrine. The backend lazily creates a
// default one on first access, so this always resolves for a registered seller.
async function ensureVitrineLoaded(force = false) {
    if (currentVitrine && !force) return currentVitrine;
    try {
        const res = await fetchManager.getSellerVitrine();
        if (res.ok && res.result?.vitrine) currentVitrine = res.result.vitrine;
    } catch (err) {
        console.error('[Vitrine] Failed to load vitrine profile:', err);
    }
    return currentVitrine;
}

function populateVitrineModal(v) {
    if (!v) return;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('vt-edit-name', v.display_name);
    set('vt-edit-bio', v.bio);

    // Strip prefixes for display (users see raw values, prefix is in the label)
    const stripPrefix = (val, prefix) => {
        if (!val) return '';
        if (typeof val === 'string' && val.startsWith(prefix)) return val.slice(prefix.length);
        return val;
    };

    // WhatsApp: strip country code if stored with it, then format
    let whatsapp = (v.whatsapp || '').replace(/\D/g, '');
    if (whatsapp.startsWith('55') && whatsapp.length > 10) whatsapp = whatsapp.slice(2);
    set('vt-edit-whatsapp', formatPhoneInput(whatsapp));

    set('vt-edit-telegram', stripPrefix(v.telegram, '@'));
    set('vt-edit-instagram', stripPrefix(v.instagram, '@'));
    set('vt-edit-website', stripPrefix(stripPrefix(v.website, 'https://'), 'http://'));

    const urlEl = document.getElementById('vt-edit-share-url');
    if (urlEl) urlEl.textContent = vitrinePublicUrl(v.id).replace(/^https?:\/\//, '');

    const toggle = document.getElementById('vt-edit-published-toggle');
    if (toggle) toggle.classList.toggle('active', !!Number(v.is_published));

    // Update char counters
    updateCharCounter('vt-edit-name', 'vt-edit-name-counter', 20);
    updateCharCounter('vt-edit-bio', 'vt-edit-bio-counter', 120);
}

// ── Character counter helpers ──
function updateCharCounter(inputId, counterId, max) {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    if (!input || !counter) return;
    const len = input.value.length;
    counter.textContent = `${len} / ${max}`;
    counter.classList.remove('near-limit', 'at-limit');
    if (len >= max) counter.classList.add('at-limit');
    else if (len >= max * 0.85) counter.classList.add('near-limit');
}

// Char counter listeners
document.getElementById('vt-edit-name')?.addEventListener('input', () => updateCharCounter('vt-edit-name', 'vt-edit-name-counter', 20));
document.getElementById('vt-edit-bio')?.addEventListener('input', () => updateCharCounter('vt-edit-bio', 'vt-edit-bio-counter', 120));

// ── Phone mask (WhatsApp) ──
function formatPhoneInput(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

document.getElementById('vt-edit-whatsapp')?.addEventListener('input', function () {
    const pos = this.selectionStart;
    const before = this.value;
    this.value = formatPhoneInput(this.value);
    // Try to restore cursor intelligently
    const diff = this.value.length - before.length;
    this.setSelectionRange(pos + diff, pos + diff);
});

async function copyVitrineLink() {
    const v = await ensureVitrineLoaded();
    if (!v) return false;
    try { await navigator.clipboard.writeText(vitrinePublicUrl(v.id)); } catch (e) { }
    return true;
}

// ── "Editar vitrine" modal (single-pane) ──
async function openManageVitrineModal() {
    const overlay = document.getElementById('manageVitrineModal');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    const v = await ensureVitrineLoaded();
    populateVitrineModal(v);
}

function closeManageVitrineModal() {
    const overlay = document.getElementById('manageVitrineModal');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
}

document.getElementById('btn-manage-vitrine')?.addEventListener('click', openManageVitrineModal);
document.getElementById('mv-close-btn')?.addEventListener('click', closeManageVitrineModal);
document.getElementById('manageVitrineModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeManageVitrineModal();
});

// Copy button inside the modal
document.getElementById('vt-edit-copy-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const original = btn.textContent;
    const ok = await copyVitrineLink();
    btn.textContent = ok ? 'Copiado!' : 'Erro';
    setTimeout(() => { btn.textContent = original; }, 1500);
});

// Published toggle
document.getElementById('vt-edit-published-toggle')?.addEventListener('click', function () {
    this.classList.toggle('active');
});

// Save
document.getElementById('vt-edit-save')?.addEventListener('click', async () => {
    const modal = document.getElementById('manageVitrineModal');
    const buttonContent = modal.querySelector('.buttonContent');
    const val = (id) => (document.getElementById(id)?.value || '').trim();

    const name = val('vt-edit-name');
    if (name.length < 2) {
        utils.setModalError(modal, 'Informe um nome para a vitrine.');
        return;
    }
    utils.clearInputError(modal);
    setElementState(buttonContent, 'loading');

    // Build payload, re-adding prefixes where needed
    const rawWhatsapp = val('vt-edit-whatsapp').replace(/\D/g, '');
    const telegram = val('vt-edit-telegram').replace(/^@/, '');
    const instagram = val('vt-edit-instagram').replace(/^@/, '');
    let website = val('vt-edit-website').replace(/^https?:\/\//, '');

    const payload = {
        display_name: name,
        bio: val('vt-edit-bio'),
        whatsapp: rawWhatsapp ? `55${rawWhatsapp}` : '',
        telegram: telegram ? `@${telegram}` : '',
        instagram: instagram ? `@${instagram}` : '',
        website: website ? `https://${website}` : '',
        is_published: document.getElementById('vt-edit-published-toggle')?.classList.contains('active') ? 1 : 0,
    };

    try {
        const res = await fetchManager.updateSellerVitrine(payload);
        setElementState(buttonContent, 'content');
        if (res.ok && res.result?.vitrine) {
            currentVitrine = res.result.vitrine;
            closeManageVitrineModal();
        } else {
            utils.setModalError(modal, res.result?.error || 'Não foi possível salvar. Tente novamente.');
        }
    } catch (err) {
        console.error('[Vitrine] Save profile error:', err);
        setElementState(buttonContent, 'content');
        utils.setModalError(modal, 'Erro inesperado. Tente novamente.');
    }
});

