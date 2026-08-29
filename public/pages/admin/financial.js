/* Admin · Financeiro */
(function (AP) {
    'use strict';

    let wired = false;
    let chart = null;

    function todayISO(offsetDays = 0) {
        const d = new Date(Date.now() + offsetDays * 86400000);
        return d.toISOString().slice(0, 10);
    }

    async function loadSummary() {
        const box = document.getElementById('fin-cards');
        box.innerHTML = AP.loadingHTML;
        const r = await AP.get('/financial/summary');
        if (!r.ok) { box.innerHTML = AP.errorHTML(r.errorMessage); return; }
        const d = r.data;
        const paidPlans = d.plans.plus + d.plans.business + d.plans.enterprise;
        box.innerHTML = `
            <div class="admin-card admin-card--accent">
                <div class="admin-card-label">Receita acumulada</div>
                <div class="admin-card-value">${AP.fmtBRL(d.total_revenue_cents)}</div>
                <div class="admin-card-sub">${d.subscriptions.invoices} faturas pagas · ${d.subscriptions.payers} clientes</div>
            </div>
            <div class="admin-card">
                <div class="admin-card-label">Receita recorrente (MRR)</div>
                <div class="admin-card-value">${AP.fmtBRL(d.recurring.mrr_cents)}</div>
                <div class="admin-card-sub">${d.recurring.active_subscriptions} assinatura(s) ativa(s)</div>
            </div>
            <div class="admin-card">
                <div class="admin-card-label">Contas em plano pago</div>
                <div class="admin-card-value">${paidPlans}</div>
                <div class="admin-card-sub">Plus ${d.plans.plus} · Business ${d.plans.business} · Enterprise ${d.plans.enterprise}</div>
            </div>
            <div class="admin-card">
                <div class="admin-card-label">Contas no Free</div>
                <div class="admin-card-value">${d.plans.free}</div>
                <div class="admin-card-sub">Base elegível para upgrade</div>
            </div>`;
    }

    async function loadChart() {
        const from = document.getElementById('fin-from').value || todayISO(-30);
        const to = document.getElementById('fin-to').value || todayISO(0);
        const granularity = document.getElementById('fin-granularity').value;
        const r = await AP.get(`/financial/by-period?from=${from}&to=${to}&granularity=${granularity}`);
        if (!r.ok) { AP.toast(r.errorMessage, 'error'); return; }

        const rows = r.data.subscriptions || [];
        const labels = rows.map((x) => x.bucket);
        const values = rows.map((x) => Number(x.total_cents) / 100);

        const css = getComputedStyle(document.documentElement);
        const accent = css.getPropertyValue('--ap-accent-strong').trim() || '#2563eb';

        const ctx = document.getElementById('fin-chart');
        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Assinaturas', data: values, backgroundColor: accent, borderRadius: 4 },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false } },
                    y: { ticks: { callback: (v) => 'R$ ' + v } },
                },
                plugins: { legend: { position: 'bottom' } },
            },
        });
    }

    function onShow() {
        if (!wired) {
            wired = true;
            document.getElementById('fin-from').value = todayISO(-30);
            document.getElementById('fin-to').value = todayISO(0);
            document.getElementById('fin-apply').addEventListener('click', loadChart);
        }
        loadSummary();
        loadChart();
    }

    AP.registerView('financeiro', { onShow });
})(window.AP);
