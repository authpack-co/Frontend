import { useNavigate } from 'react-router';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';

/** Domínio exibido embaixo do nome do serviço. URL inválida cai na própria URL. */
function sessionDomain(session) {
    return faviconDomain(session.url) || session.url || '';
}

export default function SessionsTable({ pkg, sessions, search }) {
    const query = (search || '').trim().toLowerCase();

    const visible = sessions.filter((session) => {
        if (!query) return true;
        const name = (session.name || '').toLowerCase();
        return name.includes(query) || sessionDomain(session).toLowerCase().includes(query);
    });

    if (sessions.length === 0) {
        return (
            <div className="sessions-panel-container empty-state">
                <div className="preset-empty">
                    <div className="sessions-panel">
                        <p className="panel-title">Minhas sessões</p>
                        <div className="nothing-here-container">
                            <div className="nothing-here-content">
                                <h3 className="nothing-here-title">Crie sua primeira sessão</h3>
                                <p className="nothing-here-text">Suas sessões criadas aparecerão aqui</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="sessions-panel-container content-state">
            <div className="preset-content">
                <div className="sessions-panel">
                    <p className="panel-title">Minhas sessões</p>
                    <div className="sessions-table">
                        <div className="sessions-table-head">
                            <span>Serviço</span>
                            <span>Status</span>
                            <span>Usando agora</span>
                            <span>Tempo de uso hoje</span>
                            <span aria-hidden="true"></span>
                        </div>
                        <div className="sessions-list">
                            {visible.map((session) => (
                                <SessionRow key={session.id} session={session} pkg={pkg} />
                            ))}

                            {visible.length === 0 && (
                                <div className="sessions-search-empty">
                                    <div className="sessions-search-empty-title">Nenhuma sessão encontrada</div>
                                    <div className="sessions-search-empty-text">Tente outro termo de busca.</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SessionRow({ session, pkg }) {
    const navigate = useNavigate();
    const inactive = pkg.isActive === false;
    const target = `/collection/${pkg.id}/session/${session.id}`;

    return (
        <div
            className="session-card session-row"
            data-session-id={session.id}
            role="button"
            tabIndex={0}
            title="Ver detalhes da sessão"
            onClick={() => navigate(target)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(target);
                }
            }}
        >
            <div className="session-row-service">
                <ServiceIcon
                    className="session-card-icon"
                    icon={session.icon}
                    url={session.url}
                    name={session.name}
                />
                <div className="session-card-header-text">
                    <p className="session-card-name">{session.name}</p>
                    <p className="session-card-domain">{sessionDomain(session)}</p>
                </div>
            </div>

            <div className={`session-card-status${inactive ? ' is-inactive' : ''}`}>
                <span className="session-card-status-dot"></span>
                <span className="session-card-status-text">{inactive ? 'Pausada' : 'Ativa'}</span>
            </div>

            {/* As duas colunas abaixo são alimentadas pelas estatísticas do
                pacote, que ainda não foram migradas. */}
            <div className="session-card-members is-empty">
                <span className="session-card-members-label">—</span>
            </div>

            <div className="session-card-usage">
                <span className="usage-time-text">—</span>
            </div>

            <div className="session-row-actions"></div>
        </div>
    );
}
