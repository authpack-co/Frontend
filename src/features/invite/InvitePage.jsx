import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import ServiceIcon from '../../components/ServiceIcon.jsx';
import { api } from '../../lib/api.js';
import { initials } from '../../lib/format.js';
import './invite.css';

// Quantos ícones de serviço aparecem antes do "+N".
const STACK_PREVIEW = 5;

// Quanto o "você já tem acesso" fica na tela antes de levar ao pacote.
const OWNED_REDIRECT_MS = 2600;

/**
 * Convite de pacote.
 *
 * O link não dá acesso: dá a chance de pedir. Quem abre vê o que tem dentro e
 * manda uma solicitação; o dono aprova no painel dele. A tela cobre os quatro
 * desfechos disso — link quebrado, pedido a fazer, pedido já feito, e acesso
 * que a pessoa já tinha.
 */
export default function InvitePage() {
    const { key } = useParams();
    const navigate = useNavigate();

    const [state, setState] = useState({ status: 'loading' });
    const [sending, setSending] = useState(false);

    useEffect(() => {
        let alive = true;

        async function load() {
            if (!key) {
                setState({ status: 'error', message: 'Link ausente ou inválido.' });
                return;
            }

            try {
                // O preview é público; a situação da pessoa (já é membro? já
                // pediu?) só faz sentido logada. As duas rodam juntas para não
                // somar latência antes do primeiro render.
                const [preview, logged] = await Promise.all([
                    api.getInvitePreview(key),
                    api.getAuthenticatedUser().then(() => true).catch(() => false),
                ]);

                if (!alive) return;

                const { package: pkg, owner } = preview;

                if (logged) {
                    const status = await api.getInviteStatus(key).catch(() => null);
                    if (!alive) return;

                    if (status?.hasAccess) {
                        setState({ status: 'owned', pkg, owner });
                        return;
                    }
                    if (status?.request?.status === 'pending') {
                        setState({ status: 'sent', pkg, owner, alreadyPending: true });
                        return;
                    }
                }

                setState({ status: 'invite', pkg, owner });
            } catch (err) {
                if (alive) {
                    setState({
                        status: 'error',
                        message: err.message || 'Não foi possível carregar este link.',
                    });
                }
            }
        }

        load();
        return () => { alive = false; };
    }, [key]);

    // Já tem acesso: não há o que pedir, o destino é o pacote.
    useEffect(() => {
        if (state.status !== 'owned') return undefined;
        const timer = setTimeout(() => {
            navigate(state.pkg?.id ? `/shared/${state.pkg.id}` : '/shared');
        }, OWNED_REDIRECT_MS);
        return () => clearTimeout(timer);
    }, [state, navigate]);

    async function requestAccess() {
        setSending(true);

        // Sem login não há a quem atribuir o pedido — manda logar e volta.
        try {
            await api.getAuthenticatedUser();
        } catch {
            const here = window.location.pathname + window.location.search;
            window.location.href = `/login?redirect=${encodeURIComponent(here)}`;
            return;
        }

        try {
            const data = await api.requestPackageAccess(key) || {};
            const pkg = data.package || state.pkg;

            // Rede de segurança do preview: quem chegou deslogado e logou no
            // meio do caminho só descobre a posse na resposta do pedido.
            if (data.alreadyOwns) {
                setState((current) => ({ ...current, status: 'owned', pkg }));
                return;
            }

            setState((current) => ({
                ...current,
                status: 'sent',
                pkg,
                owner: data.owner || current.owner,
                alreadyPending: data.alreadyPending,
            }));
        } catch (err) {
            setState({
                status: 'error',
                message: err.message || 'Não foi possível enviar sua solicitação.',
            });
        } finally {
            setSending(false);
        }
    }

    const ownerName = state.owner?.name || 'o dono';

    return (
        <>
            <div className="inv-bg" aria-hidden="true"></div>

            <div className="inv-shell">
                <header className="inv-topbar">
                    <Link className="inv-brand" to="/collection">
                        <img src="/assets/images/favicon-128x128.png" alt="Niango" />
                        <span className="inv-brand-name">Niango</span>
                    </Link>
                </header>

                <main className="inv-main">
                    {state.status === 'loading' && (
                        <article className="inv-card inv-state-loading">
                            <div className="inv-skeleton-hero"></div>
                            <div className="inv-skeleton-line short"></div>
                            <div className="inv-skeleton-line"></div>
                            <div className="inv-skeleton-line"></div>
                            <div className="inv-skeleton-button"></div>
                        </article>
                    )}

                    {state.status === 'error' && (
                        <article className="inv-card inv-state-error">
                            <div className="inv-error-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <h1 className="inv-title">Link inválido</h1>
                            <p className="inv-desc">
                                {state.message || 'Peça um link novo para quem compartilhou o pacote.'}
                            </p>
                            <Cta to="/collection">Ir para o painel</Cta>
                        </article>
                    )}

                    {state.status === 'invite' && (
                        <article className="inv-card inv-state-invite">
                            <div className="inv-inviter">
                                <OwnerAvatar owner={state.owner} />
                                <span className="inv-inviter-text">
                                    <b>{state.owner?.name || 'Alguém'}</b> compartilhou este pacote com você
                                </span>
                                <svg className="inv-verified" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 1l2.4 2.1 3.2-.3 1 3 2.9 1.4-1 3 1 3-2.9 1.4-1 3-3.2-.3L12 23l-2.4-2.1-3.2.3-1-3L2.5 16.8l1-3-1-3 2.9-1.4 1-3 3.2.3L12 1z" fill="currentColor" />
                                    <path d="M16.2 9.2l-5 5-2.4-2.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>

                            <div className="inv-hero-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                    <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
                                </svg>
                            </div>

                            <SessionStack sessions={state.pkg?.sessions} />

                            <h1 className="inv-title">{state.pkg?.name || 'Pacote'}</h1>

                            <div className="inv-gift-pill">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <span>O dono precisa aprovar</span>
                            </div>

                            <p className="inv-desc">Peça acesso a todos os serviços deste pacote.</p>

                            <button
                                className={`inv-cta${sending ? ' loading' : ''}`}
                                type="button"
                                onClick={requestAccess}
                                disabled={sending}
                            >
                                {sending && <span className="inv-spinner"></span>}
                                <span className="inv-cta-label">Solicitar acesso</span>
                                <svg className="inv-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                                </svg>
                            </button>

                            <p className="inv-fineprint">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 6 9 17l-5-5" />
                                </svg>
                                Nenhuma senha passa por você
                            </p>
                        </article>
                    )}

                    {state.status === 'sent' && (
                        <article className="inv-card inv-state-sent" aria-live="polite">
                            <div className="inv-sent-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                                </svg>
                            </div>
                            {/* Um pedido que já estava esperando não é novidade
                                para quem chega: dizer "enviada" de novo soaria
                                como se algo tivesse mudado agora. */}
                            <h1 className="inv-title">
                                {state.alreadyPending ? 'Seu pedido está com o dono' : 'Solicitação enviada'}
                            </h1>
                            <p className="inv-desc">
                                <strong>{ownerName}</strong> precisa aprovar.{' '}
                                <strong>{state.pkg?.name || 'O pacote'}</strong> aparece em{' '}
                                <strong>Meus acessos</strong> quando isso acontecer.
                            </p>
                            <Cta to="/collection">Ir para o painel</Cta>
                        </article>
                    )}

                    {state.status === 'owned' && (
                        <article className="inv-card inv-state-owned" aria-live="polite">
                            <div className="inv-owned-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                    <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
                                </svg>
                            </div>
                            <h1 className="inv-title">Você já tem acesso</h1>
                            <p className="inv-desc">
                                <strong>{state.pkg?.name || 'Este pacote'}</strong> já está na sua conta.
                            </p>
                            <Cta to={state.pkg?.id ? `/shared/${state.pkg.id}` : '/shared'}>
                                Abrir o pacote
                            </Cta>
                            <div className="inv-success-meta">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                                </svg>
                                <span>Abrindo o pacote…</span>
                            </div>
                        </article>
                    )}
                </main>
            </div>
        </>
    );
}

function Cta({ to, children }) {
    return (
        <Link className="inv-cta" to={to}>
            <span className="inv-cta-label">{children}</span>
            <svg className="inv-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
        </Link>
    );
}

function OwnerAvatar({ owner }) {
    const [broken, setBroken] = useState(false);

    return (
        <span className="inv-inviter-avatar">
            {owner?.picture && !broken
                ? <img src={owner.picture} alt={owner.name || ''} onError={() => setBroken(true)} />
                : initials(owner?.name)}
        </span>
    );
}

function SessionStack({ sessions }) {
    const list = sessions || [];
    if (list.length === 0) return <div className="inv-stack" aria-hidden="true"></div>;

    const preview = list.slice(0, STACK_PREVIEW);
    const remaining = list.length - preview.length;

    return (
        <div className="inv-stack" aria-hidden="true">
            {preview.map((session) => (
                <span className="inv-stack-av" key={session.id || session.url}>
                    <ServiceIcon icon={session.icon} url={session.url} name={session.name} />
                </span>
            ))}
            <span className="inv-stack-more">
                {remaining > 0
                    ? `+${remaining} ${remaining === 1 ? 'serviço' : 'serviços'}`
                    : `${list.length} ${list.length === 1 ? 'serviço' : 'serviços'}`}
            </span>
        </div>
    );
}
