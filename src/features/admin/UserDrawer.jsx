import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from '../../components/Modal.jsx';
import { useNotify } from '../../components/Notifications.jsx';
import { api } from '../../lib/api.js';
import {
    Avatar,
    ErrorState,
    Loading,
    PlanBadge,
    RoleBadge,
    StatusBadge,
    fmtBRL,
    fmtDateTime,
} from './pieces.jsx';

/**
 * Ficha de um usuário, na gaveta lateral.
 *
 * Suspender e reativar são as únicas ações daqui. Promover ou rebaixar um
 * administrador vive em "Administradores": o servidor recusa suspender quem
 * é admin, e misturar as duas coisas na mesma tela convidaria ao erro.
 */
export default function UserDrawer({ userId, onClose, onChanged }) {
    const notify = useNotify();

    const [state, setState] = useState({ status: 'loading', data: null, error: null });
    const [suspending, setSuspending] = useState(false);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        let alive = true;
        setState({ status: 'loading', data: null, error: null });

        api.admin.getUser(userId)
            .then((data) => { if (alive) setState({ status: 'ready', data, error: null }); })
            .catch((err) => {
                console.error('[Admin] getUser error:', err);
                if (alive) setState({ status: 'error', data: null, error: err.message });
            });

        return () => { alive = false; };
    }, [userId]);

    useEffect(load, [load]);

    useEffect(() => {
        const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [onClose]);

    async function run(action, okMessage) {
        setBusy(true);
        try {
            await action();
            notify('success', okMessage);
            setSuspending(false);
            setReason('');
            load();
            onChanged();
        } catch (err) {
            console.error('[Admin] user action error:', err);
            notify('error', err.message || 'Não foi possível concluir a ação.');
        } finally {
            setBusy(false);
        }
    }

    const user = state.data?.user;

    return createPortal(
        <>
            <div
                className="admin-drawer-overlay open"
                onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
            >
                <div className="admin-drawer" role="dialog" aria-modal="true">
                    <button className="admin-drawer-close" type="button" aria-label="Fechar" onClick={onClose}>
                        ×
                    </button>

                    <div className="admin-drawer-body">
                        {state.status === 'loading' && <Loading />}
                        {state.status === 'error' && <ErrorState>{state.error}</ErrorState>}
                        {state.status === 'ready' && (
                            <Detail
                                detail={state.data}
                                busy={busy}
                                onSuspend={() => setSuspending(true)}
                                onUnsuspend={() => run(
                                    () => api.admin.unsuspendUser(userId),
                                    'Conta reativada.'
                                )}
                            />
                        )}
                    </div>
                </div>
            </div>

            <Modal
                open={suspending}
                onClose={() => { setSuspending(false); setReason(''); }}
                title="Suspender conta"
                closable={!busy}
                footer={(requestClose) => (
                    <>
                        <button className="btn btn-secondary" type="button" onClick={requestClose} disabled={busy}>
                            Cancelar
                        </button>
                        <button
                            className="btn btn-danger"
                            type="button"
                            disabled={busy}
                            onClick={() => run(
                                () => api.admin.suspendUser(userId, reason.trim()),
                                'Conta suspensa.'
                            )}
                        >
                            {busy ? <div className="spinner"></div> : 'Suspender'}
                        </button>
                    </>
                )}
            >
                <p className="form-text">
                    <strong>{user?.name}</strong> perde o acesso até ser reativado.
                </p>
                <div className="input-actions" style={{ marginTop: 12 }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Motivo (opcional)"
                        maxLength={255}
                        value={reason}
                        autoFocus
                        onChange={(event) => setReason(event.target.value)}
                    />
                </div>
            </Modal>
        </>,
        document.body
    );
}

function Detail({ detail, busy, onSuspend, onUnsuspend }) {
    const { user, subscription, stats } = detail;
    const isAdmin = user.role === 'admin';

    return (
        <>
            <div className="admin-user-cell" style={{ gap: 14 }}>
                <Avatar picture={user.picture} name={user.name} />
                <div>
                    <h2>{user.name}</h2>
                    <div className="em admin-drawer-email">{user.email}</div>
                </div>
            </div>

            <div className="admin-drawer-badges">
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
                {user.plan && user.plan !== 'free' && <PlanBadge plan={user.plan} />}
            </div>

            {user.status === 'suspended' && user.suspended_reason && (
                <div className="admin-card-sub" style={{ marginTop: 8 }}>
                    Motivo: {user.suspended_reason}
                </div>
            )}

            <div className="admin-detail-grid">
                <DetailItem label="Pacotes" value={stats.packages_count} />
                <DetailItem label="Pessoas" value={stats.shared_people_count} />
                <DetailItem label="Faturas pagas" value={stats.invoices_count} />
                <DetailItem label="Total pago" value={fmtBRL(stats.paid_total_cents)} />
            </div>

            <div className="admin-card-sub">
                {subscription ? (
                    <>
                        Assinatura: <strong>{subscription.status}</strong>
                        {subscription.current_period_end && ` · válida até ${fmtDateTime(subscription.current_period_end)}`}
                        {subscription.cancel_at_period_end && ' · cancelamento agendado'}
                    </>
                ) : 'Sem assinatura.'}
            </div>

            <div className="admin-drawer-section-title">Ações</div>
            <div className="admin-drawer-actions">
                {isAdmin ? (
                    <div className="admin-card-sub">
                        Este usuário é administrador. Gerencie em “Administradores”.
                    </div>
                ) : user.status === 'suspended' ? (
                    <button className="admin-btn" type="button" disabled={busy} onClick={onUnsuspend}>
                        Reativar conta
                    </button>
                ) : (
                    <button className="admin-btn admin-btn-danger" type="button" disabled={busy} onClick={onSuspend}>
                        Suspender conta
                    </button>
                )}
            </div>
        </>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="admin-detail-item">
            <div className="k">{label}</div>
            <div className="v">{value}</div>
        </div>
    );
}
