import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';
import { useAccessStats } from '../../lib/packageStats.js';
import { usePackage } from '../../lib/packages.jsx';
import {
    bySession,
    filterAccessHistory,
    filterByLastDays,
    formatDuration,
    getDailyUsage,
    getTotalUsage,
    getUserHistoryUsage,
    timeAgo,
    toAccessRows,
} from '../../lib/usage.js';
import { DetailHeader, HistoryTable, StatCard } from '../collection/DetailScreen.jsx';
import UsagePanel, { PERIOD_DAYS, periodTitle } from '../collection/UsagePanel.jsx';

const title = periodTitle('da sessão');

/**
 * Tela de uma sessão recebida — o mesmo desenho da tela do dono, com um
 * escopo menor: o uso é só o de quem está olhando.
 *
 * Isso não é uma escolha de interface, é o que existe: /access-overview
 * responde a membro e devolve apenas o histórico do próprio usuário. Não há
 * como um membro ver o uso dos outros, nem aqui nem no servidor.
 *
 * Daí os dois cards e o gráfico falarem de tempo, e não de gente: numa tela
 * sobre uma pessoa só, contar usuários diria "1" em todo ponto.
 */
export default function AccessSessionDetail() {
    const { packageId, sessionId } = useParams();
    const { pkg, notFound } = usePackage(packageId);
    const { accessHistory, status } = useAccessStats(pkg ? packageId : null);

    const session = pkg?.sessions?.find((item) => item.id === sessionId) || null;

    // O período recorta a tela inteira — cards, gráfico e histórico —, como
    // nas telas de detalhe da coleção.
    const [period, setPeriod] = useState('7days');
    const days = PERIOD_DAYS[period];

    const history = useMemo(
        () => filterAccessHistory(accessHistory, bySession(sessionId)),
        [accessHistory, sessionId]
    );

    const scoped = useMemo(() => filterByLastDays(history, days), [history, days]);

    // A coluna do meio é o próprio serviço: a pessoa é sempre a mesma, e
    // repetir o nome dela linha a linha não informaria nada.
    const rows = useMemo(
        () => toAccessRows(scoped, () => session),
        [scoped, session]
    );

    if (notFound || (pkg && !session)) return <AccessSessionNotFound packageId={packageId} />;
    if (!pkg || !session) return null;

    const total = getTotalUsage(scoped);
    const lastAccess = lastAccessAt(history);
    const domain = faviconDomain(session.url) || session.url || '';

    return (
        <section id="package-details" className="content-card access-state expanded">
            <div className="preset-access">
                <div className="screen-section secondary session-overview-state">
                    <div className="preset-session-overview">
                        <DetailHeader pkg={pkg} subject={session.name} backTo={`/shared/${pkg.id}`} />

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
                                                <p className="service-domain">{domain}</p>
                                            </div>
                                        </div>

                                        <div className="service-users-section">
                                            <div className="service-users-label">Compartilhado por</div>
                                            <p className="service-shared-by">{pkg.owner?.name || '—'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overview-stats">
                                    <div className="stats-grid">
                                        <StatCard
                                            label="Seu tempo de uso no período"
                                            value={status === 'ready' ? formatDuration(total.seconds) : '—'}
                                            highlight
                                        />
                                        <StatCard
                                            label="Última vez que você usou"
                                            value={status === 'ready' ? (lastAccess ? timeAgo(lastAccess) : '—') : '—'}
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
                                renderSubject={(item) => (
                                    <div className="service-badge">
                                        <div className="service-icon">
                                            <ServiceIcon icon={item.icon} url={item.url} name={item.name} />
                                        </div>
                                        <span>{item.name}</span>
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

/** Momento do acesso mais recente do histórico inteiro (não do recorte). */
function lastAccessAt(history) {
    let latest = null;

    Object.values(history || {}).flat().forEach((access) => {
        const at = new Date(access.localDateTime);
        if (!latest || at > latest) latest = at;
    });

    return latest;
}

function AccessSessionNotFound({ packageId }) {
    return (
        <div className="nothing-here-container">
            <div className="nothing-here-content">
                <h3 className="nothing-here-title">Sessão não encontrada</h3>
                <p className="nothing-here-text">
                    Ela pode ter sido removida do pacote pelo dono.
                </p>
                <Link className="btn btn-primary" to={`/shared/${packageId}`} style={{ marginTop: 16 }}>
                    Voltar para o pacote
                </Link>
            </div>
        </div>
    );
}
