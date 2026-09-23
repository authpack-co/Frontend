import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import PersonAvatar from '../../components/PersonAvatar.jsx';
import ServiceIcon from '../../components/ServiceIcon.jsx';
import { formatDate } from '../../lib/format.js';
import { usePackage } from '../../lib/packages.jsx';
import { makeUserLookup, usePackageOnline, usePackageStats } from '../../lib/packageStats.js';
import {
    byUser,
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
    PresencePill,
} from './DetailScreen.jsx';
import { PERIOD_DAYS, periodTitle } from './UsagePanel.jsx';

const title = periodTitle('da pessoa');

/** Tela de uma pessoa do pacote: quanto usou, quando, e em quê. */
export default function UserDetail() {
    const { packageId, userId } = useParams();
    const { pkg, notFound } = usePackage(packageId);
    const { stats, status } = usePackageStats(pkg ? packageId : null);
    const online = usePackageOnline(pkg ? packageId : null);

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
    const average = getAverageUsage(scoped);
    const lastUsage = stats?.lastUsageByUser?.[user.id];

    // "Última vez" não é do período: é quando a pessoa usou por último, e
    // dizer "—" só porque foi antes do recorte esconderia a resposta.
    const lastUsageLabel = lastUsage ? timeAgo(lastUsage) : '—';

    // Em que sessões a pessoa está agora — normalmente uma.
    const usingNow = (pkg.sessions || []).filter((session) => (
        (online.bySession[session.id] || []).some((row) => row.userId === user.id)
    ));

    const joinedAt = formatDate(user.connectedAt);

    return (
        <DetailScreen>
            <DetailTopBar
                pkg={pkg}
                subject={user.name}
                backTo={`/collection/${pkg.id}`}
                period={period}
                onPeriodChange={setPeriod}
            />

            <DetailHero
                media={<PersonAvatar className="dt-hero-avatar" name={user.name} picture={user.picture} />}
                title={user.name}
                subtitle={user.email}
                meta={[
                    user.isCreator && (
                        <>
                            <CalendarIcon />
                            Dono do pacote
                        </>
                    ),
                    !user.isCreator && !user.removed && joinedAt && (
                        <>
                            <CalendarIcon />
                            No pacote desde <strong>{joinedAt}</strong>
                        </>
                    ),
                    user.removed && (
                        <span
                            className="dt-hero-removed"
                            title="O uso abaixo é o que ficou registrado enquanto ela tinha acesso."
                        >
                            <span className="removed-user-tag">removido</span>
                            Não tem mais acesso ao pacote
                        </span>
                    ),
                ]}
                presence={!user.removed && (
                    <PresencePill
                        active={usingNow.length > 0}
                        label={presenceLabel(usingNow)}
                        leading={usingNow.length > 0 && (
                            <ServiceIcon
                                className="dt-presence-service"
                                icon={usingNow[0].icon}
                                url={usingNow[0].url}
                                name={usingNow[0].name}
                            />
                        )}
                    />
                )}
            />

            <DetailUsageCard
                kpis={[
                    { label: 'Tempo de uso no período', value: formatDuration(total.seconds) },
                    { label: 'Vezes que usou', value: getAccessCount(scoped) },
                    { label: 'Tempo médio por uso', value: average == null ? null : formatDuration(average) },
                    { label: 'Última vez que usou', value: lastUsageLabel },
                ]}
                title={title(period)}
                subtitle={days === 0 ? 'Tempo de uso por hora' : 'Tempo de uso por dia'}
                status={status}
                period={period}
                sessions={pkg.sessions}
                dataFor={(_days, isDaily) => (isDaily
                    ? getDailyUsage(history, new Date(), { countUsers: false })
                    : getUserHistoryUsage(scoped))}
            />

            <DetailHistory
                columnLabel="Serviço"
                rows={rows}
                loading={status === 'loading'}
                renderSubject={(session) => (
                    <>
                        <ServiceIcon
                            className="dt-history-service"
                            icon={session.icon}
                            url={session.url}
                            name={session.name}
                        />
                        <span className="dt-history-name">{session.name}</span>
                    </>
                )}
            />
        </DetailScreen>
    );
}

function presenceLabel(sessions) {
    if (sessions.length === 0) return 'Não está usando agora';
    if (sessions.length === 1) return `Usando ${sessions[0].name} agora`;
    return `Usando ${sessions[0].name} e mais ${sessions.length - 1} agora`;
}

function UserNotFound({ packageId }) {
    return (
        <div className="nothing-here-container">
            <div className="nothing-here-content">
                <h3 className="nothing-here-title">Pessoa não encontrada</h3>
                <p className="nothing-here-text">Ela pode ter saído do pacote ou perdido o acesso.</p>
                <Link className="btn btn-accent-soft" to={`/collection/${packageId}`} style={{ marginTop: 16 }}>
                    Voltar para o pacote
                </Link>
            </div>
        </div>
    );
}
