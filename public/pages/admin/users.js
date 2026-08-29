/* Admin · Usuários */
(function (AP) {
    'use strict';

    let wired = false;
    let debounce = null;

    function controls() {
        return {
            q: document.getElementById('users-search').value.trim(),
            role: document.getElementById('users-role-filter').value,
            status: document.getElementById('users-status-filter').value,
        };
    }

    async function loadList() {
        const box = document.getElementById('users-list');
        box.innerHTML = AP.loadingHTML;
        const { q, role, status } = controls();
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (role) params.set('role', role);
        if (status) params.set('status', status);
        const r = await AP.get('/users?' + params.toString());
        if (!r.ok) { box.innerHTML = AP.errorHTML(r.errorMessage); return; }
        if (!r.data.users.length) { box.innerHTML = AP.emptyHTML('Nenhum usuário encontrado.'); return; }

        const rows = r.data.users.map((u) => `
            <tr data-id="${AP.escapeHtml(u.id)}" style="cursor:pointer">
                <td>
                    <div class="admin-user-cell">
                        ${AP.avatar(u.picture, u.name)}
                        <div><div class="nm">${AP.escapeHtml(u.name)}</div><div class="em">${AP.escapeHtml(u.email)}</div></div>
                    </div>
                </td>
                <td>${AP.roleBadge(u.role)}</td>
                <td>${AP.statusBadge(u.status)}</td>
                <td>${u.plan === 'plus' ? '<span class="admin-badge badge-plan-plus">Plus</span>' : '<span class="admin-badge badge-neutral">Free</span>'}</td>
                <td>${AP.fmtDate(u.createdAt)}</td>
            </tr>`).join('');

        box.innerHTML = `<table class="admin-table"><thead><tr><th>Usuário</th><th>Role</th><th>Status</th><th>Plano</th><th>Entrou em</th></tr></thead><tbody>${rows}</tbody></table>
            <div class="admin-card-sub" style="margin-top:8px">${r.data.users.length} de ${r.data.total} usuário(s)</div>`;

        box.querySelectorAll('tr[data-id]').forEach((tr) => {
            tr.addEventListener('click', () => openDetail(tr.dataset.id));
        });
    }

    async function openDetail(id) {
        AP.openDrawer(AP.loadingHTML);
        const r = await AP.get('/users/' + id);
        if (!r.ok) { AP.setDrawer(AP.errorHTML(r.errorMessage)); return; }
        const { user, subscription, stats } = r.data;
        const isAdmin = user.role === 'admin';

        AP.setDrawer(`
            <div class="admin-user-cell" style="gap:14px">
                ${AP.avatar(user.picture, user.name)}
                <div>
                    <h2>${AP.escapeHtml(user.name)}</h2>
                    <div class="em" style="color:var(--ap-text-muted);font-size:.85rem">${AP.escapeHtml(user.email)}</div>
                </div>
            </div>
            <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
                ${AP.roleBadge(user.role)} ${AP.statusBadge(user.status)}
                ${user.plan && user.plan !== 'free' ? `<span class="admin-badge badge-plan-plus">${AP.escapeHtml(user.plan.charAt(0).toUpperCase() + user.plan.slice(1))}</span>` : ''}
            </div>
            ${user.status === 'suspended' && user.suspended_reason ? `<div class="admin-card-sub" style="margin-top:8px">Motivo: ${AP.escapeHtml(user.suspended_reason)}</div>` : ''}

            <div class="admin-detail-grid">
                <div class="admin-detail-item"><div class="k">Pacotes</div><div class="v">${stats.packages_count}</div></div>
                <div class="admin-detail-item"><div class="k">Pessoas</div><div class="v">${stats.shared_people_count}</div></div>
                <div class="admin-detail-item"><div class="k">Faturas pagas</div><div class="v">${stats.invoices_count}</div></div>
                <div class="admin-detail-item"><div class="k">Total pago</div><div class="v">${AP.fmtBRL(stats.paid_total_cents)}</div></div>
            </div>
            ${subscription
                ? `<div class="admin-card-sub">Assinatura: <strong>${AP.escapeHtml(subscription.status)}</strong>${subscription.current_period_end ? ' · válida até ' + AP.fmtDateTime(subscription.current_period_end) : ''}${subscription.cancel_at_period_end ? ' · cancelamento agendado' : ''}</div>`
                : '<div class="admin-card-sub">Sem assinatura.</div>'}

            <div class="admin-drawer-section-title">Ações</div>
            <div class="admin-drawer-actions">
                ${isAdmin ? '<div class="admin-card-sub">Este usuário é administrador. Gerencie em “Administradores”.</div>' : `
                    ${user.status === 'suspended'
                        ? '<button class="admin-btn" data-act="unsuspend">Reativar conta</button>'
                        : '<button class="admin-btn admin-btn-danger" data-act="suspend">Suspender conta</button>'}
                `}
            </div>
        `);

        const act = (sel, fn) => { const b = document.querySelector(`[data-act="${sel}"]`); if (b) b.addEventListener('click', fn); };

        act('unsuspend', async () => {
            const r2 = await AP.send('/users/' + id + '/unsuspend', 'PATCH');
            after(r2, 'Conta reativada.', id);
        });
        act('suspend', async () => {
            const reason = prompt('Motivo da suspensão (opcional):') || '';
            const r2 = await AP.send('/users/' + id + '/suspend', 'PATCH', { reason });
            after(r2, 'Conta suspensa.', id);
        });
    }

    function after(r, okMsg, id) {
        if (!r.ok) { AP.toast(r.errorMessage, 'error'); return; }
        AP.toast(okMsg, 'success');
        openDetail(id);
        loadList();
    }

    function onShow() {
        if (!wired) {
            wired = true;
            document.getElementById('users-search').addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(loadList, 300);
            });
            document.getElementById('users-role-filter').addEventListener('change', loadList);
            document.getElementById('users-status-filter').addEventListener('change', loadList);
        }
        loadList();
    }

    AP.registerView('usuarios', { onShow });
})(window.AP);
