import { Link } from 'react-router';
import ConnectedBadge from '../../components/ConnectedBadge.jsx';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';

/**
 * Card de sessão de quem recebeu o acesso.
 *
 * Deliberadamente mais simples que a linha do dono: o membro quer entrar no
 * serviço. "Usando agora" e a contagem de online são perguntas de quem
 * administra o pacote — aqui só fariam volume. "Ver detalhes" leva ao uso do
 * próprio membro, que é o que ele tem para ver.
 */
export default function AccessSessionCard({
    session, packageId, inactive, connecting, onConnect, connected, disconnecting, onDisconnect,
}) {
    const domain = faviconDomain(session.url) || session.url || '';

    return (
        <div className="session-card access-card" data-session-id={session.id}>
            <div className="access-card-head">
                <ServiceIcon
                    className="session-card-icon"
                    icon={session.icon}
                    url={session.url}
                    name={session.name}
                />
                <div className="session-card-header-text">
                    <h3 className="session-card-name">{session.name}</h3>
                    <p className="session-card-domain">{domain}</p>
                </div>
                {connected && <ConnectedBadge />}
            </div>

            <div className="access-card-actions">
                {/* Conectar não é instantâneo: a extensão ainda vai buscar os
                    dados de autenticação antes de abrir a aba. Sem o spinner o
                    card fica idêntico ao de antes do clique, e a pessoa clica
                    de novo. */}
                {connected ? (
                    // Já conectada neste navegador: conectar de novo só abriria
                    // outra aba da mesma sessão, então a ação vira sair.
                    <button
                        className={`connect-session-btn is-connected${disconnecting ? ' is-connecting' : ''}`}
                        type="button"
                        disabled={disconnecting}
                        aria-busy={disconnecting || undefined}
                        onClick={() => onDisconnect(session)}
                    >
                        <span className="connect-session-label">
                            {disconnecting ? 'Saindo' : 'Sair'}
                        </span>
                        {disconnecting ? (
                            <span className="spinner connect-spinner" aria-hidden="true"></span>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" x2="9" y1="12" y2="12" />
                            </svg>
                        )}
                    </button>
                ) : (
                    <button
                        className={`connect-session-btn${connecting ? ' is-connecting' : ''}`}
                        type="button"
                        disabled={inactive || connecting}
                        aria-busy={connecting || undefined}
                        onClick={() => onConnect(session)}
                    >
                        <span className="connect-session-label">
                            {connecting ? 'Conectando' : 'Conectar'}
                        </span>
                        {connecting ? (
                            <span className="spinner connect-spinner" aria-hidden="true"></span>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h6v6"></path>
                                <path d="M10 14 21 3"></path>
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            </svg>
                        )}
                    </button>
                )}
                <Link
                    className="access-details-btn"
                    to={`/shared/${packageId}/session/${session.id}`}
                >
                    Ver detalhes
                </Link>
            </div>
        </div>
    );
}
