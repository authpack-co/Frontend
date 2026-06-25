/* Admin · Administradores */
(function (AP) {
    'use strict';

    const ACTION_LABELS = {
        'user.suspend': 'Suspendeu usuário',
        'user.unsuspend': 'Reativou usuário',
        'user.role_change': 'Alterou role',
        'seller.create': 'Cadastrou vendedor',
        'seller.remove': 'Removeu vendedor',
        'admin.remove': 'Removeu administrador',
    };

    async function loadAdmins() {
        const box = document.getElementById('admins-list');
        box.innerHTML = AP.loadingHTML;
        const r = await AP.get('/admins');
        if (!r.ok) { box.innerHTML = AP.errorHTML(r.errorMessage); return; }
        if (!r.data.length) { box.innerHTML = AP.emptyHTML('Nenhum administrador.'); return; }

        const rows = r.data.map((a) => `
            <tr>
                <td>
                    <div class="admin-user-cell">
                        ${AP.avatar(a.picture, a.name)}
                        <div><div class="nm">${AP.escapeHtml(a.name)}</div><div class="em">${AP.escapeHtml(a.email)}</div></div>
                    </div>
                </td>
                <td>${AP.fmtDate(a.createdAt)}</td>
                <td style="text-align:right"><button class="admin-btn admin-btn-danger admin-btn-sm" data-id="${AP.escapeHtml(a.id)}">Remover</button></td>
            </tr>`).join('');

        box.innerHTML = `<table class="admin-table"><thead><tr><th>Administrador</th><th>Desde</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;

        box.querySelectorAll('button[data-id]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!confirm('Revogar o acesso de administrador desta pessoa?')) return;
                const r2 = await AP.send('/admins/' + btn.dataset.id, 'DELETE');
                if (!r2.ok) { AP.toast(r2.errorMessage, 'error'); return; }
                AP.toast('Administrador removido.', 'success');
                loadAdmins();
            });
        });
    }

    async function loadAudit() {
        const box = document.getElementById('admins-audit');
        box.innerHTML = AP.loadingHTML;
        const r = await AP.get('/admins/audit?limit=50');
        if (!r.ok) { box.innerHTML = AP.errorHTML(r.errorMessage); return; }
        if (!r.data.length) { box.innerHTML = AP.emptyHTML('Sem ações registradas.'); return; }

        const rows = r.data.map((e) => {
            let meta = '';
            try {
                const m = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata;
                if (m && m.to) meta = ` → ${AP.escapeHtml(m.to)}`;
                else if (m && m.email) meta = ` (${AP.escapeHtml(m.email)})`;
                else if (m && m.reason) meta = ` — ${AP.escapeHtml(m.reason)}`;
            } catch (e) { /* ignore */ }
            return `<tr>
                <td>${AP.escapeHtml(ACTION_LABELS[e.action] || e.action)}${meta}</td>
                <td class="em" style="font-family:var(--ap-font-data);font-size:.75rem;color:var(--ap-text-muted)">${AP.escapeHtml((e.target_user_id || '').slice(0, 8) || '—')}</td>
                <td>${AP.fmtDateTime(e.created_at)}</td>
            </tr>`;
        }).join('');

        box.innerHTML = `<table class="admin-table"><thead><tr><th>Ação</th><th>Alvo</th><th>Quando</th></tr></thead><tbody>${rows}</tbody></table>`;
    }

    function onShow() {
        loadAdmins();
        loadAudit();
    }

    AP.registerView('administradores', { onShow });
})(window.AP);
