import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import ServiceIcon from '../../components/ServiceIcon.jsx';
import { usePackage } from '../../lib/packages.jsx';
import { makeUserLookup, usePackageStats } from '../../lib/packageStats.js';
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

    // Sair do pacote não apaga o que a pessoa usou: o tempo dela continua no
    // gráfico do pacote, então esta tela continua existindo para ex-membros —
    // com o histórico inteiro e um aviso de que o acesso acabou.
    const users = makeUserLookup(pkg, stats?.historyUsers);
    const user = pkg ? users.find(userId) : null;

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

    // Ex-membro só aparece depois do histórico chegar: antes disso "não
    // encontrada" seria um veredito sobre um dado que ainda não veio.
    if (notFound || (pkg && !user && status !== 'loading')) {
        return <UserNotFound packageId={packageId} />;
    }
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
                                    {user.removed && (
                                        <p className="profile-removed-note">
                                            Esta pessoa foi removida do pacote. O uso abaixo é o que
                                            ficou registrado enquanto ela tinha acesso.
                                        </p>
                                    )}
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
                                        sessions={pkg.sessions}
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
