import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import ServiceIcon from '../../components/ServiceIcon.jsx';
import { usePackage } from '../../lib/packages.jsx';
import { usePackageStats } from '../../lib/packageStats.js';
import {
    byUser,
    filterAccessHistory,
    filterByLastDays,
    formatDuration,
    getDailyUsage,
    getTotalUsage,
    getUserHistoryUsage,
    timeAgo,
    toAccessRows,
} from '../../lib/usage.js';
import { DetailHeader, HistoryTable, StatCard } from './DetailScreen.jsx';
import UsagePanel, { PERIOD_DAYS, periodTitle } from './UsagePanel.jsx';

const title = periodTitle('da pessoa');

/** Tela de uma pessoa do pacote: quanto usou, quando, e em quê. */
export default function UserDetail() {
    const { packageId, userId } = useParams();
    const { pkg, notFound } = usePackage(packageId);
    const { stats, status } = usePackageStats(pkg ? packageId : null);

    const user = pkg?.users?.find((item) => item.id === userId) || null;

    // O período recorta a tela inteira, como na tela da sessão.
    const [period, setPeriod] = useState('7days');
    const days = PERIOD_DAYS[period];

    const history = useMemo(
        () => (stats ? filterAccessHistory(stats.accessHistory, byUser(userId)) : {}),
        [stats, userId]
    );

    const scoped = useMemo(() => filterByLastDays(history, days), [history, days]);

    const rows = useMemo(
        () => toAccessRows(scoped, (access) => (pkg?.sessions || []).find((s) => s.id === access.sessionId)),
        [scoped, pkg]
    );

    if (notFound || (pkg && !user)) return <UserNotFound packageId={packageId} />;
    if (!pkg || !user) return null;

    const total = getTotalUsage(scoped);
    const lastUsage = stats?.lastUsageByUser?.[user.id];

    return (
        <section id="package-details" className="content-card collection-state expanded">
            <div className="preset-collection">
                <div className="screen-section secondary user-overview-state">
                    <div className="preset-user-overview">
                        <DetailHeader pkg={pkg} subject={user.name} backTo={`/collection/${pkg.id}`} />

                        <div className="overview-container">
                            <div className="overview-content">
                                <div className="profile-card">
                                    <div className="profile-avatar">
                                        {user.picture && <img src={user.picture} alt={user.name || ''} />}
                                    </div>
                                    <h4 className="profile-title">{user.name}</h4>
                                    <p className="profile-subtitle">{user.email}</p>
                                </div>

                                <div className="overview-stats">
                                    <div className="stats-grid">
                                        <StatCard
                                            label="Tempo total de uso do pacote"
                                            value={status === 'ready' ? formatDuration(total.seconds) : '—'}
                                            highlight
                                        />
                                        <StatCard
                                            label="Última vez que usou o pacote"
                                            value={status === 'ready' ? (lastUsage ? timeAgo(lastUsage) : '—') : '—'}
                                        />
                                    </div>

                                    <UsagePanel
                                        title={title}
                                        subtitle="Tempo de uso por dia"
                                        status={status}
                                        period={period}
                                        onPeriodChange={setPeriod}
                                        dataFor={(_days, isDaily) => (isDaily
                                            ? getDailyUsage(history, new Date(), { countUsers: false })
                                            : getUserHistoryUsage(scoped))}
                                    />
                                </div>
                            </div>

                            <HistoryTable
                                columnLabel="Serviço"
                                rows={rows}
                                loading={status === 'loading'}
                                renderSubject={(session) => (
                                    <div className="service-badge">
                                        <div className="service-icon">
                                            <ServiceIcon
                                                icon={session.icon}
                                                url={session.url}
                                                name={session.name}
                                            />
                                        </div>
                                        <span>{session.name}</span>
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

function UserNotFound({ packageId }) {
    return (
        <div className="nothing-here-container">
            <div className="nothing-here-content">
                <h3 className="nothing-here-title">Pessoa não encontrada</h3>
                <p className="nothing-here-text">Ela pode ter saído do pacote ou perdido o acesso.</p>
                <Link className="btn btn-primary" to={`/collection/${packageId}`} style={{ marginTop: 16 }}>
                    Voltar para o pacote
                </Link>
            </div>
        </div>
    );
}
