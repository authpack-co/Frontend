import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import ServiceIcon from '../../components/ServiceIcon.jsx';
import { NiangoWordmark } from '../../components/BrandLogo.jsx';
import { api } from '../../lib/api.js';
import { initials } from '../../lib/format.js';
import './invite.css';

// Quantos ícones cabem na fileira de serviços. Com mais serviços que isso, o
// último lugar mostra quantos ficaram de fora ("+N").
const SERVICE_SLOTS = 6;

// Quanto o "você já tem acesso" fica na tela antes de levar ao pacote.
const OWNED_REDIRECT_MS = 2600;

// De quanto em quanto tempo o pedido pendente pergunta se o dono já decidiu.
const APPROVAL_POLL_MS = 4000;

/**
 * Convite de pacote.
 *
 * O link não dá acesso: dá a chance de pedir. Quem abre vê o que tem dentro e
 * manda uma solicitação; o dono aprova no painel dele. A tela cobre os
 * desfechos disso — link quebrado, pedido a fazer, e acesso que a pessoa já
 * tinha. É um cartão só: o pacote em cima (nome, quem compartilhou, serviços)
 * fica parado, e só o botão e a linha de baixo acompanham o pedido.
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
                        setState({ status: 'owned', pkg, owner, isOwner: !!status.isOwner });
                        return;
                    }
                    if (status?.request?.status === 'pending') {
                        setState({ status: 'invite', pkg, owner, request: 'pending' });
                        return;
                    }
                }

                setState({ status: 'invite', pkg, owner, request: null });
            } catch (err) {
                if (alive) {
                    // O 404 responde "Link inválido", que já é o título: aí
                    // vale a orientação padrão de pedir um link novo.
                    setState({
                        status: 'error',
                        message: err.status === 404
                            ? null
                            : err.message || 'Não foi possível carregar este link.',
                    });
                }
            }
        }

        load();
        return () => { alive = false; };
    }, [key]);

    // Já tem acesso: não há o que pedir, o destino é o pacote. Qual tela é o
    // pacote depende de quem está olhando — o que a pessoa criou mora na
    // coleção, o que recebeu mora em "meus acessos". O dono abrindo o próprio
    // link fica no convite: é o link que ele compartilha, e ver o que o
    // convidado vê é o motivo de abrir.
    const redirectTarget = state.status === 'owned' && !state.isOwner ? packageHome(state) : null;

    useEffect(() => {
        if (!redirectTarget) return undefined;
        const timer = setTimeout(() => navigate(redirectTarget), OWNED_REDIRECT_MS);
        return () => clearTimeout(timer);
    }, [redirectTarget, navigate]);

    // Pedido pendente: enquanto a tela estiver aberta, pergunta se o dono já
    // decidiu. Com a aba escondida não pergunta — e confere na hora em que a
    // pessoa volta, que é quando a resposta importa.
    const waiting = state.status === 'invite' && state.request === 'pending';

    useEffect(() => {
        if (!waiting) return undefined;
        let alive = true;
        let busy = false;

        async function check() {
            if (busy || document.hidden) return;
            busy = true;
            try {
                const status = await api.getInviteStatus(key);
                if (!alive) return;
                if (status?.hasAccess) {
                    setState((current) => ({
                        ...current, request: 'approved', isOwner: !!status.isOwner,
                    }));
                } else if (status?.request?.status === 'rejected') {
                    setState((current) => ({ ...current, request: 'rejected' }));
                }
            } catch {
                // Falha de rede numa volta do polling não muda nada: a próxima tenta de novo.
            } finally {
                busy = false;
            }
        }

        const timer = setInterval(check, APPROVAL_POLL_MS);
        const onVisibility = () => { if (!document.hidden) check(); };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            alive = false;
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [waiting, key]);

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
                setState((current) => ({
                    ...current, status: 'owned', pkg: { ...current.pkg, ...pkg }, isOwner: !!data.isOwner,
                }));
                return;
            }

            // A resposta traz o pacote sem os serviços: mistura com o do
            // preview para a fileira de ícones não sumir.
            setState((current) => ({
                ...current,
                pkg: { ...current.pkg, ...data.package },
                owner: data.owner || current.owner,
                request: 'pending',
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

    const showPackage = state.status === 'invite' || state.status === 'owned';

    return (
        <div className="inv-shell">
            <header className="inv-topbar">
                <Link className="inv-brand" to="/collection">
                    <NiangoWordmark height={26} />
                </Link>
            </header>

            <main className="inv-main">
                {state.status === 'loading' && (
                    <article className="inv-card" aria-busy="true">
                        <div className="inv-skeleton" aria-hidden="true">
                            <div className="inv-sk inv-sk-mark"></div>
                            <div className="inv-sk inv-sk-title"></div>
                            <div className="inv-sk inv-sk-line"></div>
                            <div className="inv-sk-tiles">
                                {Array.from({ length: 5 }, (_, i) => <div className="inv-sk inv-sk-tile" key={i}></div>)}
                            </div>
                            <div className="inv-sk inv-sk-button"></div>
                            <div className="inv-sk inv-sk-note"></div>
                        </div>
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
                        <Link className="inv-btn inv-btn-secondary" to="/collection">Ir para o painel</Link>
                    </article>
                )}

                {showPackage && (
                    <article className="inv-card">
                        <div className="inv-mark" aria-hidden="true">{initials(state.pkg?.name)}</div>
                        <h1 className="inv-title">{state.pkg?.name || 'Pacote'}</h1>

                        <div className="inv-inviter">
                            <OwnerAvatar owner={state.owner} />
                            {state.status === 'owned' && state.isOwner ? (
                                <span><b>Você</b> compartilha este pacote</span>
                            ) : (
                                <span><b>{state.owner?.name || 'Alguém'}</b> compartilhou com você</span>
                            )}
                        </div>

                        <ServiceRow sessions={state.pkg?.sessions} />

                        <div className="inv-action">
                            <InviteAction
                                state={state}
                                sending={sending}
                                openTarget={packageHome(state)}
                                onRequest={requestAccess}
                            />
                        </div>

                        <div className="inv-fineprint" aria-live="polite">
                            <InviteFineprint state={state} />
                        </div>
                    </article>
                )}
            </main>
        </div>
    );
}

/** Onde este pacote mora para quem está olhando. */
function packageHome({ pkg, isOwner }) {
    if (!pkg?.id) return isOwner ? '/collection' : '/shared';
    return isOwner ? `/collection/${pkg.id}` : `/shared/${pkg.id}`;
}

/** O botão é a parte do cartão que acompanha o pedido. */
function InviteAction({ state, sending, openTarget, onRequest }) {
    if (state.status === 'owned' || state.request === 'approved') {
        return (
            <Link className="inv-btn inv-btn-primary inv-btn-open" to={openTarget}>
                <span>Abrir o pacote</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
            </Link>
        );
    }

    if (state.request === 'pending') {
        return (
            <div className="inv-waiting" role="status">
                <span className="inv-wait-dot"></span>
                <span>Aguardando aprovação</span>
            </div>
        );
    }

    if (sending) {
        return (
            <button className="inv-btn inv-btn-primary" type="button" disabled aria-busy="true">
                <span className="inv-spinner"></span>
                <span className="inv-sr-only">Enviando pedido</span>
            </button>
        );
    }

    return (
        <button className="inv-btn inv-btn-primary" type="button" onClick={onRequest}>
            Solicitar acesso
        </button>
    );
}

/** A linha de baixo do botão: o que falta, o que o dono decidiu, ou por que não há o que pedir. */
function InviteFineprint({ state }) {
    if (state.status === 'owned') {
        return state.isOwner
            ? <span>Este pacote é seu. Este é o link que você compartilha.</span>
            : <span>Você já tem acesso · Abrindo o pacote…</span>;
    }

    const ownerName = state.owner?.name || 'o dono';
    // Sem nome, o "o dono" abre a frase nos desfechos.
    const Owner = ownerName.charAt(0).toUpperCase() + ownerName.slice(1);

    if (state.request === 'pending') {
        return (
            <>
                <span>Pedido enviado para <b>{ownerName}</b></span>
                <span className="inv-fineprint-note">
                    Se fechar a tela, o pacote aparece em Meus acessos quando for aprovado
                </span>
            </>
        );
    }

    if (state.request === 'approved') {
        return (
            <span className="inv-fineprint-approved">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                </svg>
                {Owner} aprovou seu acesso
            </span>
        );
    }

    if (state.request === 'rejected') {
        return <span>{Owner} recusou o pedido. Você pode pedir de novo.</span>;
    }

    return (
        <span className="inv-fineprint-row">
            <span>O dono precisa aprovar</span>
            <span>Nenhuma senha passa por você</span>
        </span>
    );
}

function OwnerAvatar({ owner }) {
    const [broken, setBroken] = useState(false);

    return (
        <span className="inv-inviter-avatar" aria-hidden="true">
            {owner?.picture && !broken
                ? <img src={owner.picture} alt="" onError={() => setBroken(true)} />
                : initials(owner?.name)}
        </span>
    );
}

/**
 * Os serviços do pacote numa fileira: até SERVICE_SLOTS ícones; com mais que
 * isso, o último lugar vira o "+N".
 */
function ServiceRow({ sessions }) {
    const list = sessions || [];
    if (!list.length) return null;

    const shown = list.length > SERVICE_SLOTS ? list.slice(0, SERVICE_SLOTS - 1) : list;
    const remaining = list.length - shown.length;

    return (
        <ul className="inv-services" aria-label="Serviços do pacote">
            {shown.map((session) => (
                <li className="inv-service" key={session.id || session.url} title={session.name}>
                    <ServiceIcon icon={session.icon} url={session.url} name={session.name} />
                </li>
            ))}
            {remaining > 0 && (
                <li className="inv-service inv-service-more" title={`Mais ${remaining} serviços`}>
                    +{remaining}
                </li>
            )}
        </ul>
    );
}
