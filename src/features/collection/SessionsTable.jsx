import { useNavigate } from 'react-router';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';
import { paletteFromSession } from '../../lib/palette.js';
import {
    formatDuration,
    getSessionUsageComparison,
    usageComparisonBadge,
    usageComparisonTitle,
} from '../../lib/usage.js';

/** Domínio exibido embaixo do nome do serviço. URL inválida cai na própria URL. */
function sessionDomain(session) {
    return faviconDomain(session.url) || session.url || '';
}

export default function SessionsTable({ pkg, sessions, search, stats, statsStatus }) {
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
                                <SessionRow
                                    key={session.id}
                                    session={session}
                                    pkg={pkg}
                                    stats={stats}
                                    statsStatus={statsStatus}
                                />
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

function SessionRow({ session, pkg, stats, statsStatus }) {
    const navigate = useNavigate();
    const inactive = pkg.isActive === false;
    const target = `/collection/${pkg.id}/session/${session.id}`;
    const palette = paletteFromSession(session);

    // Quem está online nesta sessão agora, com os dados de quem é.
    const onlineIds = stats?.onlineBySession?.[session.id] || [];
    const onlineUsers = onlineIds
        .map((id) => (pkg.users || []).find((user) => user.id === id))
        .filter(Boolean);

    return (
        <div
            className="session-card session-row"
            data-session-id={session.id}
            role="button"
            tabIndex={0}
            title="Ver detalhes da sessão"
            style={{ '--card-accent': palette.c1, '--card-accent-2': palette.c2 }}
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

            <UsingNow users={onlineUsers} loading={statsStatus === 'loading'} />
            <UsageToday
                session={session}
                accessHistory={stats?.accessHistory}
                loading={statsStatus === 'loading'}
            />

            <div className="session-row-actions"></div>
        </div>
    );
}

function UsingNow({ users, loading }) {
    if (loading) {
        return (
            <div className="session-card-members is-empty">
                <div className="sk-line" style={{ '--sk-h': '9px', '--sk-w': '70px' }}></div>
            </div>
        );
    }

    return (
        <div className={`session-card-members${users.length === 0 ? ' is-empty' : ''}`}>
            <div className="session-card-avatars">
                {users.slice(0, 4).map((user) => (
                    <img
                        key={user.id}
                        className="session-card-avatar"
                        alt={user.name || ''}
                        src={user.picture || undefined}
                        onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                    />
                ))}
            </div>
            <span className="session-card-members-label">
                {users.length > 0 ? 'usando agora' : 'ninguém usando agora'}
            </span>
        </div>
    );
}

/**
 * Tempo de hoje mais o quanto isso foge do costume da própria sessão.
 *
 * Não segue o seletor de período do gráfico: é sempre "hoje vs. os últimos 30
 * dias". O período escolhido lá em cima vale só para o gráfico.
 */
function UsageToday({ session, accessHistory, loading }) {
    if (loading) {
        return (
            <div className="session-card-usage">
                <div className="sk-line" style={{ '--sk-h': '11px', '--sk-w': '56px' }}></div>
            </div>
        );
    }

    if (!accessHistory) {
        return (
            <div className="session-card-usage" title="Uso indisponível: as estatísticas não carregaram">
                <span className="usage-time-text">—</span>
            </div>
        );
    }

    const comparison = getSessionUsageComparison(session.id, accessHistory);
    const badge = usageComparisonBadge(comparison);

    const badgeClass = [
        'session-card-usage-ratio',
        comparison.state === 'above' ? 'is-above-average' : '',
        comparison.state === 'idle' || comparison.state === 'first-day' ? 'is-muted' : '',
        comparison.state === 'unused' ? 'is-hidden' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="session-card-usage" title={usageComparisonTitle(comparison)}>
            <span className="usage-time-text">{formatDuration(comparison.value)}</span>
            <span className={badgeClass}>{badge}</span>
        </div>
    );
}
