/* Admin · Vendedores */
(function (AP) {
    'use strict';

    let wired = false;

    async function loadList() {
        const box = document.getElementById('sellers-list');
        box.innerHTML = AP.loadingHTML;
        const r = await AP.get('/sellers');
        if (!r.ok) { box.innerHTML = AP.errorHTML(r.errorMessage); return; }
        if (!r.data.length) { box.innerHTML = AP.emptyHTML('Nenhum vendedor cadastrado ainda.'); return; }

        const rows = r.data.map((s) => `
            <tr data-id="${AP.escapeHtml(s.id)}" style="cursor:pointer">
                <td>
                    <div class="admin-user-cell">
                        ${AP.avatar(s.picture, s.name)}
                        <div><div class="nm">${AP.escapeHtml(s.name)}</div><div class="em">${AP.escapeHtml(s.email)}</div></div>
                    </div>
                </td>
                <td>${s.recipient_status ? `<span class="admin-badge badge-neutral">${AP.escapeHtml(s.recipient_status)}</span>` : '<span class="admin-badge badge-suspended">sem recebedor</span>'}</td>
                <td class="num">${s.products_count}</td>
                <td class="num">${s.sales_count}</td>
                <td class="num">${AP.fmtBRL(s.gmv_cents)}</td>
                <td class="num">${AP.fmtBRL(s.platform_fees_cents)}</td>
            </tr>`).join('');

        box.innerHTML = `<table class="admin-table"><thead><tr><th>Vendedor</th><th>Recebedor</th><th class="num">Produtos</th><th class="num">Vendas</th><th class="num">GMV</th><th class="num">Taxas geradas</th></tr></thead><tbody>${rows}</tbody></table>`;
        box.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => openDetail(tr.dataset.id)));
    }

    function createSeller() {
        // Full onboarding flow lives in onboarding.js (email lookup → Pagar.me form).
        if (typeof AP.openSellerOnboarding === 'function') {
            AP.openSellerOnboarding(loadList);
        } else {
            AP.toast('Formulário de cadastro indisponível.', 'error');
        }
    }

    async function openDetail(id) {
        AP.openDrawer(AP.loadingHTML);
        const [dossier, products, revenue] = await Promise.all([
            AP.get('/sellers/' + id),
            AP.get('/sellers/' + id + '/products'),
            AP.get('/sellers/' + id + '/revenue'),
        ]);
        if (!dossier.ok) { AP.setDrawer(AP.errorHTML(dossier.errorMessage)); return; }
        const { user, recipient, stats } = dossier.data;

        const productsHTML = (products.ok && products.data.length)
            ? products.data.map((p) => `<tr><td>${AP.escapeHtml(p.name)}</td><td class="num">${AP.fmtBRL(p.price_cents)}</td><td><span class="admin-badge badge-neutral">${AP.escapeHtml(p.status)}</span></td></tr>`).join('')
            : `<tr><td colspan="3" class="admin-card-sub">Nenhum produto.</td></tr>`;

        const orders = (revenue.ok && revenue.data) ? revenue.data.slice(0, 8) : [];
        const ordersHTML = orders.length
            ? orders.map((o) => `<tr><td>${AP.escapeHtml(o.product_name)}</td><td class="num">${AP.fmtBRL(o.total_amount_cents)}</td><td>${AP.fmtDate(o.created_at)}</td></tr>`).join('')
            : `<tr><td colspan="3" class="admin-card-sub">Nenhuma venda concluída.</td></tr>`;

        AP.setDrawer(`
            <div class="admin-user-cell" style="gap:14px">
                ${AP.avatar(user.picture, user.name)}
                <div><h2>${AP.escapeHtml(user.name)}</h2><div class="em" style="color:var(--ap-text-muted);font-size:.85rem">${AP.escapeHtml(user.email)}</div></div>
            </div>
            <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">${AP.roleBadge(user.role)} ${AP.statusBadge(user.status)}</div>

            <div class="admin-detail-grid">
                <div class="admin-detail-item"><div class="k">Vendas</div><div class="v">${stats.sales_count}</div></div>
                <div class="admin-detail-item"><div class="k">Faturamento líquido</div><div class="v">${AP.fmtBRL(stats.sales_net_cents)}</div></div>
                <div class="admin-detail-item"><div class="k">Produtos</div><div class="v">${stats.products_count}</div></div>
                <div class="admin-detail-item"><div class="k">Recebedor</div><div class="v">${recipient ? AP.escapeHtml(recipient.status) : '—'}</div></div>
            </div>

            <div class="admin-drawer-section-title">Produtos</div>
            <table class="admin-table"><thead><tr><th>Nome</th><th class="num">Preço</th><th>Status</th></tr></thead><tbody>${productsHTML}</tbody></table>

            <div class="admin-drawer-section-title">Vendas recentes</div>
            <table class="admin-table"><thead><tr><th>Produto</th><th class="num">Valor</th><th>Data</th></tr></thead><tbody>${ordersHTML}</tbody></table>

            <div class="admin-drawer-section-title">Ações</div>
            <div class="admin-drawer-actions">
                <button class="admin-btn admin-btn-danger" data-act="remove">Remover vendedor</button>
            </div>
        `);

        document.querySelector('[data-act="remove"]')?.addEventListener('click', async () => {
            if (!confirm('Remover o status de vendedor desta pessoa?')) return;
            const r2 = await AP.send('/sellers/' + id, 'DELETE');
            if (!r2.ok) { AP.toast(r2.errorMessage, 'error'); return; }
            AP.toast('Vendedor removido.', 'success');
            AP.closeDrawer();
            loadList();
        });
    }

    function onShow() {
        if (!wired) {
            wired = true;
            document.getElementById('seller-create-btn').addEventListener('click', createSeller);
        }
        loadList();
    }

    AP.registerView('vendedores', { onShow });
})(window.AP);
