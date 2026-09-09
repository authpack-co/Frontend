import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';
import { usePackage } from '../../lib/packages.jsx';
import { makeUserLookup, usePackageOnline, usePackageStats } from '../../lib/packageStats.js';
import {
    bySession,
    filterAccessHistory,
    filterByLastDays,
    formatDuration,
    getDailyUsage,
    getDistinctUsers,
    getSessionHistoryUsage,
    getTotalUsage,
    toAccessRows,
} from '../../lib/usage.js';
import { DetailHeader, HistoryTable, StatCard } from './DetailScreen.jsx';
import UsagePanel, { PERIOD_DAYS, periodTitle } from './UsagePanel.jsx';

const MAX_AVATARS = 5;
const title = periodTitle('da sessão');

/** Tela de uma sessão do pacote: quem a usa, quanto, e o histórico. */
export default function SessionDetail() {
    const { packageId, sessionId } = useParams();
    const { pkg, notFound } = usePackage(packageId);
    const { stats, status } = usePackageStats(pkg ? packageId : null);
    const online = usePackageOnline(pkg ? packageId : null);

    const session = pkg?.sessions?.find((item) => item.id === sessionId) || null;

    // O período manda na tela inteira, não só no gráfico: os dois cards falam
    // em "no período", e o histórico abaixo mostra o mesmo recorte.
    const [period, setPeriod] = useState('7days');
    const days = PERIOD_DAYS[period];

    // O recorte da sessão sai do histórico do pacote que já está carregado.
    const history = useMemo(
        () => (stats ? filterAccessHistory(stats.accessHistory, bySession(sessionId)) : {}),
        [stats, sessionId]
    );

    const scoped = useMemo(() => filterByLastDays(history, days), [history, days]);

    // Inclusive quem já saiu do pacote: o tempo dessa pessoa continua nos
    // cards e no gráfico acima, então a linha dela tem que continuar aqui —
    // senão o total não bate com o histórico que o explica.
    const users = makeUserLookup(pkg, stats?.historyUsers);

    const rows = useMemo(
        () => toAccessRows(scoped, (access) => users.resolve(access.userId)),
        // `users` é recriado a cada render; o que muda o resultado é o pacote
        // e o histórico que vieram com ele.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [scoped, pkg, stats?.historyUsers]
    );

    if (notFound || (pkg && !session)) return <SessionNotFound packageId={packageId} />;
    if (!pkg || !session) return null;

    const backTo = `/collection/${pkg.id}`;
    const onlineUsers = (online.bySession[session.id] || [])
        .map((row) => (pkg.users || []).find((user) => user.id === row.userId))
        .filter(Boolean);

    const total = getTotalUsage(scoped);
    const distinctUsers = getDistinctUsers(scoped);

    return (
        <section id="package-details" className="content-card collection-state expanded">
            <div className="preset-collection">
                <div className="screen-section secondary session-overview-state">
                    <div className="preset-session-overview">
                        <DetailHeader pkg={pkg} subject={session.name} backTo={backTo} />

                        <div className="overview-container">
                            <div className="overview-content">
                                <div className="service-card">
                                    <div className="service-card-content">
                                        <div className="service-header">
                                            <ServiceIcon
                                                className="service-card-icon"
                                                icon={session.icon}
                                                url={session.url}
                                                name={session.name}
                                            />
                                            <div className="service-header-text">
                                                <h2 className="service-name">{session.name}</h2>
                                                <p className="service-domain">
                                                    {faviconDomain(session.url) || session.url}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="service-users-section">
                                            <div className="service-users-label">
                                                {onlineUsers.length > 0 ? 'Usando agora' : 'Ninguém usando agora'}
                                            </div>
                                            <div className={`service-users-list${onlineUsers.length === 0 ? ' is-empty' : ''}`}>
                                                {onlineUsers.slice(0, MAX_AVATARS).map((user) => (
                                                    <img
                                                        key={user.id}
                                                        className="service-user-avatar"
                                                        alt={user.name || ''}
                                                        src={user.picture || undefined}
                                                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                                    />
                                                ))}
                                                {onlineUsers.length > MAX_AVATARS && (
                                                    <div className="service-add-user">
                                                        +{onlineUsers.length - MAX_AVATARS}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="overview-stats">
                                    <div className="stats-grid">
                                        <StatCard
                                            label="Usuários conectados"
                                            value={status === 'ready' ? distinctUsers : '—'}
                                            highlight
                                        />
                                        <StatCard
                                            label="Tempo de uso no período"
                                            value={status === 'ready' ? formatDuration(total.seconds) : '—'}
                                            highlight
                                        />
                                    </div>

                                    <UsagePanel
                                        title={title}
                                        subtitle="Horas de uso por dia"
                                        status={status}
                                        period={period}
                                        onPeriodChange={setPeriod}
                                        dataFor={(_days, isDaily) => (isDaily
                                            ? getDailyUsage(history)
                                            : getSessionHistoryUsage(scoped))}
                                    />
                                </div>
                            </div>

                            <HistoryTable
                                columnLabel="Usuário"
                                rows={rows}
                                loading={status === 'loading'}
                                renderSubject={(user) => (
                                    <div className="service-badge">
                                        <div className="service-icon">
                                            {user.picture && <img src={user.picture} alt="" />}
                                        </div>
                                        <span>{user.name}</span>
                                        {user.removed && (
                                            <span
                                                className="removed-user-tag"
                                                title="Esta pessoa não tem mais acesso ao pacote"
                                            >
                                                removido
                                            </span>
                                        )}
                                    </div>
                                )}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function SessionNotFound({ packageId }) {
    return (
        <div className="nothing-here-container">
            <div className="nothing-here-content">
                <h3 className="nothing-here-title">Sessão não encontrada</h3>
                <p className="nothing-here-text">Ela pode ter sido excluída do pacote.</p>
                <Link className="btn btn-primary" to={`/collection/${packageId}`} style={{ marginTop: 16 }}>
                    Voltar para o pacote
                </Link>
            </div>
        </div>
    );
}
