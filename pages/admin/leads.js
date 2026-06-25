/* Admin · Leads */
(function (AP) {
    'use strict';

    let wired = false;

    const STATUS_BADGE = {
        new: '<span class="admin-badge badge-active">Novo</span>',
        contacted: '<span class="admin-badge badge-plan-plus">Contatado</span>',
        archived: '<span class="admin-badge badge-neutral">Arquivado</span>',
    };

    async function loadList() {
        const box = document.getElementById('leads-list');
        box.innerHTML = AP.loadingHTML;
        const status = document.getElementById('leads-status-filter').value;
        const r = await AP.get('/leads' + (status ? '?status=' + status : ''));
        if (!r.ok) { box.innerHTML = AP.errorHTML(r.errorMessage); return; }
        if (!r.data.length) { box.innerHTML = AP.emptyHTML('Nenhum lead por aqui ainda.'); return; }

        const rows = r.data.map((l) => `
            <tr data-id="${l.id}">
                <td>
                    <div class="nm" style="font-weight:600">${AP.escapeHtml(l.name)}</div>
                    <div class="em" style="color:var(--ap-text-muted);font-size:.78rem">${AP.escapeHtml(l.email)}</div>
                </td>
                <td>${AP.escapeHtml(l.phone)}</td>
                <td style="max-width:320px;white-space:normal">${AP.escapeHtml(l.what_to_sell)}</td>
                <td>${STATUS_BADGE[l.status] || AP.escapeHtml(l.status)}</td>
                <td>${AP.fmtDate(l.created_at)}</td>
                <td style="text-align:right;white-space:nowrap">
                    ${l.status !== 'contacted' ? `<button class="admin-btn admin-btn-sm" data-act="contacted">Contatado</button>` : ''}
                    ${l.status !== 'archived' ? `<button class="admin-btn admin-btn-sm" data-act="archived">Arquivar</button>` : ''}
                    <button class="admin-btn admin-btn-danger admin-btn-sm" data-act="delete">Excluir</button>
                </td>
            </tr>`).join('');

        box.innerHTML = `<table class="admin-table"><thead><tr>
            <th>Pessoa</th><th>Telefone</th><th>O que quer vender</th><th>Status</th><th>Enviado</th><th></th>
            </tr></thead><tbody>${rows}</tbody></table>`;

        box.querySelectorAll('tr[data-id]').forEach((tr) => {
            const id = tr.dataset.id;
            tr.querySelectorAll('button[data-act]').forEach((btn) => {
                btn.addEventListener('click', () => act(id, btn.dataset.act));
            });
        });
    }

    async function act(id, action) {
        let r;
        if (action === 'delete') {
            if (!confirm('Excluir este lead?')) return;
            r = await AP.send('/leads/' + id, 'DELETE');
        } else {
            r = await AP.send('/leads/' + id + '/status', 'PATCH', { status: action });
        }
        if (!r.ok) { AP.toast(r.errorMessage, 'error'); return; }
        AP.toast(action === 'delete' ? 'Lead excluído.' : 'Lead atualizado.', 'success');
        loadList();
    }

    function onShow() {
        if (!wired) {
            wired = true;
            document.getElementById('leads-status-filter').addEventListener('change', loadList);
        }
        loadList();
    }

    AP.registerView('leads', { onShow });
})(window.AP);
