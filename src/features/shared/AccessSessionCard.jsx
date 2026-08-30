import { Link } from 'react-router';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';
import { paletteFromSession } from '../../lib/palette.js';

/**
 * Card de sessão de quem recebeu o acesso.
 *
 * Deliberadamente mais simples que a linha do dono: o membro quer entrar no
 * serviço. "Usando agora" e a contagem de online são perguntas de quem
 * administra o pacote — aqui só fariam volume. "Ver detalhes" leva ao uso do
 * próprio membro, que é o que ele tem para ver.
 */
export default function AccessSessionCard({ session, packageId, inactive, onConnect }) {
    const palette = paletteFromSession(session);
    const domain = faviconDomain(session.url) || session.url || '';

    return (
        <div className="session-card access-card" data-session-id={session.id}>
            <div className="access-card-head">
                <ServiceIcon
                    className="session-card-icon"
                    icon={session.icon}
                    url={session.url}
                    name={session.name}
                    // backgroundColor, e não o atalho background: o atalho
                    // zeraria o background-image do placeholder do favicon.
                    style={{ backgroundColor: palette.glow(0.1), borderColor: palette.glow(0.3) }}
                />
                <div className="session-card-header-text">
                    <h3 className="session-card-name">{session.name}</h3>
                    <p className="session-card-domain">{domain}</p>
                </div>
            </div>

            <div className="access-card-actions">
                <button
                    className="connect-session-btn"
                    type="button"
                    disabled={inactive}
                    onClick={() => onConnect(session)}
                >
                    <span>Conectar</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6"></path>
                        <path d="M10 14 21 3"></path>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    </svg>
                </button>
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
