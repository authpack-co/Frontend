import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import PersonAvatar from '../../components/PersonAvatar.jsx';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';
import { formatDate, parseApiDate } from '../../lib/format.js';
import { useAccessStats } from '../../lib/packageStats.js';
import { usePackage } from '../../lib/packages.jsx';
import {
    bySession,
    filterAccessHistory,
    filterByLastDays,
    formatDuration,
    getAccessCount,
    getAverageUsage,
    getDailyUsage,
    getTotalUsage,
    getUserHistoryUsage,
    timeAgo,
    toAccessRows,
} from '../../lib/usage.js';
import {
    CalendarIcon,
    DetailHero,
    DetailHistory,
    DetailScreen,
    DetailTopBar,
    DetailUsageCard,
    RefreshIcon,
} from '../collection/DetailScreen.jsx';
import { PERIOD_DAYS, periodTitle } from '../collection/UsagePanel.jsx';

const title = periodTitle('da sessão');

/**
 * Tela de uma sessão recebida — a mesma estrutura da tela do dono, com um
 * escopo menor: o uso é só o de quem está olhando.
 *
 * Isso não é uma escolha de interface, é o que existe: /access-overview
 * responde a membro e devolve apenas o histórico do próprio usuário. Não há
 * como um membro ver o uso dos outros, nem aqui nem no servidor.
 *
 * Daí os números e o gráfico falarem de tempo, e não de gente: numa tela
 * sobre uma pessoa só, contar usuários diria "1" em todo ponto. E no lugar de
 * "usando agora", que o membro não vê, o selo diz de quem é a sessão.
 */
export default function AccessSessionDetail() {
    const { packageId, sessionId } = useParams();
    const { pkg, notFound } = usePackage(packageId);
    const { accessHistory, status } = useAccessStats(pkg ? packageId : null);

    const session = pkg?.sessions?.find((item) => item.id === sessionId) || null;

    // O período recorta a tela inteira — números, gráfico e histórico —, como
    // nas telas de detalhe da coleção.
    const [period, setPeriod] = useState('7days');
    const days = PERIOD_DAYS[period];

    const history = useMemo(
        () => filterAccessHistory(accessHistory, bySession(sessionId)),
        [accessHistory, sessionId]
    );

    const scoped = useMemo(() => filterByLastDays(history, days), [history, days]);

    const rows = useMemo(
        () => toAccessRows(scoped, () => session),
        [scoped, session]
    );

    if (notFound || (pkg && !session)) return <AccessSessionNotFound packageId={packageId} />;
    if (!pkg || !session) return null;

    const total = getTotalUsage(scoped);
    const average = getAverageUsage(scoped);
    const lastAccess = lastAccessAt(history);
    const domain = faviconDomain(session.url) || session.url || '';
    const owner = pkg.owner || {};

    const createdAt = formatDate(session.createdAt);
    const refreshedAt = parseApiDate(session.refreshedAt);

    return (
        <DetailScreen>
            <DetailTopBar
                pkg={pkg}
                subject={session.name}
                backTo={`/shared/${pkg.id}`}
                period={period}
                onPeriodChange={setPeriod}
            />

            <DetailHero
                media={(
                    <span className="dt-hero-icon">
                        <ServiceIcon icon={session.icon} url={session.url} name={session.name} />
                    </span>
                )}
                title={session.name}
                subtitle={domain}
                meta={[
                    createdAt && (
                        <>
                            <CalendarIcon />
                            Criada em <strong>{createdAt}</strong>
                        </>
                    ),
                    refreshedAt && (
                        <>
                            <RefreshIcon />
                            Atualizada <strong>{timeAgo(refreshedAt)}</strong>
                        </>
                    ),
                ]}
                presence={owner.name && (
                    <div className="dt-presence">
                        <PersonAvatar className="dt-presence-avatar dt-owner-avatar" name={owner.name} picture={owner.picture} />
                        <span className="dt-presence-label">
                            <span className="dt-presence-muted">Compartilhado por</span> {owner.name}
                        </span>
                    </div>
                )}
            />

            <DetailUsageCard
                kpis={[
                    { label: 'Seu tempo de uso no período', value: formatDuration(total.seconds) },
                    { label: 'Vezes que você usou', value: getAccessCount(scoped) },
                    { label: 'Tempo médio por uso', value: average == null ? null : formatDuration(average) },
                    { label: 'Última vez que você usou', value: lastAccess ? timeAgo(lastAccess) : '—' },
                ]}
                title={title(period)}
                subtitle={days === 0 ? 'Tempo de uso por hora' : 'Tempo de uso por dia'}
                status={status}
                period={period}
                dataFor={(_days, isDaily) => (isDaily
                    ? getDailyUsage(history, new Date(), { countUsers: false })
                    : getUserHistoryUsage(scoped))}
            />

            <DetailHistory rows={rows} loading={status === 'loading'} />
        </DetailScreen>
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
                <Link className="btn btn-accent-soft" to={`/shared/${packageId}`} style={{ marginTop: 16 }}>
                    Voltar para o pacote
                </Link>
            </div>
        </div>
    );
}
