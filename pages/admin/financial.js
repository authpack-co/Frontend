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
        box.innerHTML = `
            <div class="admin-card admin-card--accent">
                <div class="admin-card-label">Receita do AuthPack</div>
                <div class="admin-card-value">${AP.fmtBRL(d.total_revenue_cents)}</div>
                <div class="admin-card-sub">Taxas da Vitrine + assinaturas Plus</div>
            </div>
            <div class="admin-card">
                <div class="admin-card-label">Taxas recebidas (Vitrine)</div>
                <div class="admin-card-value">${AP.fmtBRL(d.marketplace.platform_fees_cents)}</div>
                <div class="admin-card-sub">${d.marketplace.orders} vendas · líquido ${AP.fmtBRL(d.marketplace.net_cents)}</div>
            </div>
            <div class="admin-card">
                <div class="admin-card-label">Assinaturas Plus</div>
                <div class="admin-card-value">${AP.fmtBRL(d.subscriptions.total_cents)}</div>
                <div class="admin-card-sub">${d.subscriptions.invoices} faturas pagas</div>
            </div>
            <div class="admin-card admin-card--warn">
                <div class="admin-card-label">Saques pendentes</div>
                <div class="admin-card-value">${AP.fmtBRL(d.pending_withdrawals.amount_cents)}</div>
                <div class="admin-card-sub">${d.pending_withdrawals.count} solicitação(ões)</div>
            </div>`;
    }

    async function loadChart() {
        const from = document.getElementById('fin-from').value || todayISO(-30);
        const to = document.getElementById('fin-to').value || todayISO(0);
        const granularity = document.getElementById('fin-granularity').value;
        const r = await AP.get(`/financial/by-period?from=${from}&to=${to}&granularity=${granularity}`);
        if (!r.ok) { AP.toast(r.errorMessage, 'error'); return; }

        const labels = [];
        const seen = new Set();
        [...r.data.marketplace, ...r.data.subscriptions].forEach((row) => {
            if (!seen.has(row.bucket)) { seen.add(row.bucket); labels.push(row.bucket); }
        });
        labels.sort();
        const mktMap = Object.fromEntries(r.data.marketplace.map((x) => [x.bucket, Number(x.fees_cents) / 100]));
        const subMap = Object.fromEntries(r.data.subscriptions.map((x) => [x.bucket, Number(x.total_cents) / 100]));

        const css = getComputedStyle(document.documentElement);
        const accent = css.getPropertyValue('--ap-accent-strong').trim() || '#2563eb';
        const muted = css.getPropertyValue('--ap-text-muted').trim() || '#6b7280';

        const ctx = document.getElementById('fin-chart');
        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Taxas Vitrine', data: labels.map((l) => mktMap[l] || 0), backgroundColor: accent, borderRadius: 4 },
                    { label: 'Assinaturas Plus', data: labels.map((l) => subMap[l] || 0), backgroundColor: muted, borderRadius: 4 },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, ticks: { callback: (v) => 'R$ ' + v } },
                },
                plugins: { legend: { position: 'bottom' } },
            },
        });
    }

    async function loadWithdrawals() {
        const box = document.getElementById('fin-withdrawals');
        box.innerHTML = AP.loadingHTML;
        const r = await AP.get('/financial/pending-withdrawals');
        if (!r.ok) { box.innerHTML = AP.errorHTML(r.errorMessage); return; }
        if (!r.data.length) { box.innerHTML = AP.emptyHTML('Nenhum saque pendente.'); return; }
        const rows = r.data.map((w) => `
            <tr>
                <td>
                    <div class="admin-user-cell">
                        <div><div class="nm">${AP.escapeHtml(w.seller_name)}</div><div class="em">${AP.escapeHtml(w.seller_email)}</div></div>
                    </div>
                </td>
                <td class="num">${AP.fmtBRL(w.amount_cents)}</td>
                <td><span class="admin-badge badge-neutral">${AP.escapeHtml(w.status)}</span></td>
                <td>${AP.fmtDateTime(w.created_at)}</td>
            </tr>`).join('');
        box.innerHTML = `<table class="admin-table"><thead><tr><th>Vendedor</th><th class="num">Valor</th><th>Status</th><th>Solicitado em</th></tr></thead><tbody>${rows}</tbody></table>`;
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
        loadWithdrawals();
    }

    AP.registerView('financeiro', { onShow });
})(window.AP);
