import { useCallback, useEffect, useState } from 'react';
import { ConfirmModal } from '../../components/Modal.jsx';
import { useNotify } from '../../components/Notifications.jsx';
import { api } from '../../lib/api.js';
import { AdminView } from './AdminShell.jsx';
import { ListState, TableWrap, UserCell, fmtDate, fmtDateTime } from './pieces.jsx';

const ACTION_LABELS = {
    'user.suspend': 'Suspendeu usuário',
    'user.unsuspend': 'Reativou usuário',
    'user.role_change': 'Alterou role',
    'admin.remove': 'Removeu administrador',
};

/** O que o registro guardou além da ação, quando guardou alguma coisa. */
function auditDetail(entry) {
    let metadata = entry.metadata;
    if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } catch { return ''; }
    }
    if (!metadata) return '';

    if (metadata.to) return ` → ${metadata.to}`;
    if (metadata.email) return ` (${metadata.email})`;
    if (metadata.reason) return ` — ${metadata.reason}`;
    return '';
}

export default function AdminsPage() {
    const notify = useNotify();

    const [admins, setAdmins] = useState({ status: 'loading', rows: [], error: null });
    const [audit, setAudit] = useState({ status: 'loading', rows: [], error: null });
    const [removing, setRemoving] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        let alive = true;
        setAdmins((c) => ({ ...c, status: 'loading' }));
        setAudit((c) => ({ ...c, status: 'loading' }));

        api.admin.listAdmins()
            .then((rows) => { if (alive) setAdmins({ status: 'ready', rows: rows || [], error: null }); })
            .catch((err) => {
                console.error('[Admin] listAdmins error:', err);
                if (alive) setAdmins({ status: 'error', rows: [], error: err.message });
            });

        api.admin.listAudit(50)
            .then((rows) => { if (alive) setAudit({ status: 'ready', rows: rows || [], error: null }); })
            .catch((err) => {
                console.error('[Admin] listAudit error:', err);
                if (alive) setAudit({ status: 'error', rows: [], error: err.message });
            });

        return () => { alive = false; };
    }, []);

    useEffect(load, [load]);

    async function handleRemove() {
        setBusy(true);
        try {
            await api.admin.removeAdmin(removing.id);
            notify('success', 'Administrador removido.');
            setRemoving(null);
            load();
        } catch (err) {
            console.error('[Admin] removeAdmin error:', err);
            // O servidor recusa remover a si mesmo e o último admin — a
            // mensagem dele diz qual dos dois foi.
            notify('error', err.message || 'Não foi possível remover o administrador.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <AdminView title="Administradores" description="Quem tem acesso a este painel.">
            <ListState
                status={admins.status}
                error={admins.error}
                isEmpty={admins.rows.length === 0}
                empty="Nenhum administrador."
            >
                <TableWrap><table className="admin-table">
                    <thead>
                        <tr>
                            <th>Administrador</th>
                            <th>Desde</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {admins.rows.map((person) => (
                            <tr key={person.id}>
                                <td><UserCell user={person} /></td>
                                <td>{fmtDate(person.createdAt)}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button
                                        className="admin-btn admin-btn-danger admin-btn-sm"
                                        type="button"
                                        onClick={() => setRemoving(person)}
                                    >
                                        Remover
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table></TableWrap>
            </ListState>

            <div className="admin-panel">
                <div className="admin-panel-head"><h2>Histórico de ações</h2></div>

                <ListState
                    status={audit.status}
                    error={audit.error}
                    isEmpty={audit.rows.length === 0}
                    empty="Sem ações registradas."
                >
                    <TableWrap><table className="admin-table">
                        <thead>
                            <tr>
                                <th>Ação</th>
                                <th>Alvo</th>
                                <th>Quando</th>
                            </tr>
                        </thead>
                        <tbody>
                            {audit.rows.map((entry, index) => (
                                <tr key={`${entry.action}-${entry.created_at}-${index}`}>
                                    <td>{(ACTION_LABELS[entry.action] || entry.action) + auditDetail(entry)}</td>
                                    <td className="admin-audit-target">
                                        {(entry.target_user_id || '').slice(0, 8) || '—'}
                                    </td>
                                    <td>{fmtDateTime(entry.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table></TableWrap>
                </ListState>
            </div>

            <ConfirmModal
                open={Boolean(removing)}
                onClose={() => setRemoving(null)}
                title="Remover administrador"
                confirmLabel="Remover"
                busy={busy}
                onConfirm={handleRemove}
            >
                Revogar o acesso de administrador de <strong>{removing?.name}</strong>?
                A conta continua existindo como usuário comum.
            </ConfirmModal>
        </AdminView>
    );
}
