import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useExtensionStatus } from '../../lib/extension.js';
import { formatDate } from '../../lib/format.js';
import { GoogleIcon, PuzzleIcon, StarIcon } from './icons.jsx';

// Papéis que já têm o benefício sem assinar.
const PLUS_BENEFIT_ROLES = ['admin'];

export default function AccountView({ onOpenPlans }) {
    const { user, reload, logout } = useAuth();

    return (
        <div className="settings-view active" id="settings-view-conta">
            <div className="settings-view-header">
                <h2>Conta</h2>
                <p>Gerencie sua conta Google e a extensão deste navegador.</p>
            </div>

            <div className="settings-top-row">
                <GoogleAccountCard user={user} onDisconnect={logout} />
                <PlanCard user={user} onChange={reload} onOpenPlans={onOpenPlans} />
            </div>

            <ExtensionCard />
        </div>
    );
}

function GoogleAccountCard({ user, onDisconnect }) {
    const [leaving, setLeaving] = useState(false);

    async function handleDisconnect() {
        if (!window.confirm('Tem certeza que deseja desconectar sua conta Google?')) return;
        setLeaving(true);
        try {
            await onDisconnect();
        } catch (err) {
            console.error('[Settings] disconnect error:', err);
            setLeaving(false);
        }
    }

    return (
        <div className="settings-card">
            <div className="settings-card-header">
                <div className="settings-card-icon settings-card-icon--google"><GoogleIcon /></div>
                <span className="settings-card-title">Conta Google</span>
            </div>
            <div className="settings-card-body sc-profile-body">
                <div className="sc-google-row">
                    <div className="sc-google-avatar">
                        {/* Sem foto, o círculo do CSS fica sozinho: um <img src="">
                            faz o navegador rebaixar a própria página. */}
                        {user?.picture && <img src={user.picture} alt="" />}
                    </div>
                    <div className="sc-google-info">
                        <div className="sc-google-name">{user?.name || '—'}</div>
                        <div className="sc-google-email">{user?.email || '—'}</div>
                    </div>
                </div>
                <button className="sc-full-btn btn-danger" onClick={handleDisconnect} disabled={leaving}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    {leaving ? 'Saindo…' : 'Desconectar'}
                </button>
            </div>
        </div>
    );
}

function PlanCard({ user, onChange, onOpenPlans }) {
    const [canceling, setCanceling] = useState(false);

    async function handleCancel() {
        const confirmed = window.confirm(
            'Cancelar sua assinatura Plus?\n\nVocê mantém o acesso até o fim do período pago.'
        );
        if (!confirmed) return;

        setCanceling(true);
        try {
            await api.cancelBilling();
            // Recarrega do servidor em vez de adivinhar o novo estado aqui: a
            // data de expiração e o status vêm dele.
            await onChange();
        } catch (err) {
            console.error('[Settings] cancelBilling error:', err);
            window.alert('Não foi possível cancelar a assinatura. Tente novamente.');
        } finally {
            setCanceling(false);
        }
    }

    return (
        <div className="settings-card">
            <div className="settings-card-header">
                <div className="settings-card-icon settings-card-icon--star"><StarIcon /></div>
                <span className="settings-card-title">Plano</span>
            </div>
            <div className="settings-card-body sc-plan-body">
                <PlanState user={user} canceling={canceling} onCancel={handleCancel} onOpenPlans={onOpenPlans} />
            </div>
        </div>
    );
}

function PlanState({ user, canceling, onCancel, onOpenPlans }) {
    const plan = user?.plan;
    const status = user?.plan_status;
    const expiresAt = user?.plan_expires_at;
    const isPaid = !!plan && plan !== 'free';

    if (PLUS_BENEFIT_ROLES.includes(user?.role)) {
        return (
            <div className="sc-plan-state">
                <p className="sc-plan-text">Seu papel: <strong>Administrador</strong></p>
                <p className="sc-plan-sub">
                    Todos os benefícios do Plus estão inclusos. Não é necessário assinar.
                </p>
            </div>
        );
    }

    if (isPaid && status === 'canceled') {
        return (
            <div className="sc-plan-state">
                <p className="sc-plan-canceled-title">Assinatura cancelada</p>
                <p className="sc-plan-sub">
                    {expiresAt && `Você continua no plano até: ${formatDate(expiresAt)}`}
                </p>
                <p className="sc-plan-note">
                    Seu acesso Plus permanece ativo até o fim do período pago. Após o vencimento,
                    você pode assinar novamente.
                </p>
            </div>
        );
    }

    if (isPaid && status === 'active') {
        return (
            <div className="sc-plan-state">
                <p className="sc-plan-text">Você está no plano <strong>Plus</strong>.</p>
                <p className="sc-plan-sub">{expiresAt && `Renova em: ${formatDate(expiresAt)}`}</p>
                <button
                    className="sc-full-btn btn-danger"
                    style={{ marginTop: 'auto' }}
                    onClick={onCancel}
                    disabled={canceling}
                >
                    {canceling ? 'Cancelando…' : 'Cancelar assinatura'}
                </button>
            </div>
        );
    }

    return (
        <div className="sc-plan-state">
            <p className="sc-plan-text">Você está no plano <strong>Free</strong>.</p>
            <p className="sc-plan-sub">Acesso básico à plataforma.</p>
            <button
                className="sc-full-btn btn-primary"
                type="button"
                style={{ marginTop: 'auto' }}
                onClick={onOpenPlans}
            >
                Ver benefícios Plus
            </button>
        </div>
    );
}

const EXTENSION_COPY = {
    ready: {
        title: 'Extensão instalada',
        status: 'Este navegador pode abrir as sessões da sua conta.',
    },
    missing: {
        title: 'Extensão não instalada',
        status: 'Instale a extensão do AuthPack para conectar às suas sessões.',
    },
    checking: {
        title: 'Verificando extensão…',
        status: 'Conferindo se ela está instalada neste navegador.',
    },
};

function ExtensionCard() {
    const status = useExtensionStatus();
    // O CSS herdado usa 'synced' para o estado bom.
    const state = status === 'ready' ? 'synced' : status;
    const copy = EXTENSION_COPY[status] || EXTENSION_COPY.checking;

    return (
        <div className="settings-card">
            <div className="settings-card-header">
                <div className="settings-card-icon"><PuzzleIcon /></div>
                <span className="settings-card-title">Extensão</span>
            </div>

            <div className="sc-sync" data-state={state}>
                <div className="sc-sync-glyph">
                    <svg className="sc-glyph sc-glyph--ok" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <polyline points="8.5 12.2 11 14.7 15.5 9.7" />
                    </svg>
                    <svg className="sc-glyph sc-glyph--warn" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v4.5" />
                        <path d="M12 16h.01" />
                    </svg>
                    <span className="sc-glyph sc-glyph--checking"><span className="spinner"></span></span>
                </div>
                <div className="sc-sync-info">
                    <div className="sc-sync-title">{copy.title}</div>
                    <div className="sc-sync-status">{copy.status}</div>
                </div>
            </div>
        </div>
    );
}
