import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import PersonAvatar from '../../components/PersonAvatar.jsx';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';
import { formatDate } from '../../lib/format.js';
import { usePackage } from '../../lib/packages.jsx';
import { makeUserLookup, usePackageOnline, usePackageStats } from '../../lib/packageStats.js';
import {
    bySession,
    filterAccessHistory,
    filterByLastDays,
    formatDuration,
    getAccessCount,
    getAverageUsage,
    getDailyUsage,
    getDistinctUsers,
    getSessionHistoryUsage,
    getTotalUsage,
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
    RefreshIcon,
} from './DetailScreen.jsx';
import { PERIOD_DAYS, periodTitle } from './UsagePanel.jsx';
import UsingNowModal from './UsingNowModal.jsx';

const MAX_AVATARS = 3;
const title = periodTitle('da sessão');

/** Tela de uma sessão do pacote: quem a usa, quanto, e o histórico. */
export default function SessionDetail() {
    const { packageId, sessionId } = useParams();
    const { pkg, notFound } = usePackage(packageId);
    const { stats, status } = usePackageStats(pkg ? packageId : null);
    const online = usePackageOnline(pkg ? packageId : null);
    const [showOnline, setShowOnline] = useState(false);

    const session = pkg?.sessions?.find((item) => item.id === sessionId) || null;

    // O período manda na tela inteira, não só no gráfico: os números falam
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
    // números e no gráfico acima, então a linha dela tem que continuar aqui —
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
        .map((row) => users.resolve(row.userId));

    const total = getTotalUsage(scoped);
    const average = getAverageUsage(scoped);
    const domain = faviconDomain(session.url) || session.url;

    // Datas da sessão só aparecem quando a API as manda: um "Criada em" vazio
    // ou chutado diria mais do que se sabe.
    const createdAt = formatDate(session.createdAt || session.created_at);
    const updatedAt = session.updatedAt || session.updated_at;

    const people = onlineUsers.length;

    return (
        <DetailScreen>
            <DetailTopBar
                pkg={pkg}
                subject={session.name}
                backTo={backTo}
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
                    updatedAt && (
                        <>
                            <RefreshIcon />
                            Atualizada <strong>{timeAgo(updatedAt)}</strong>
                        </>
                    ),
                ]}
                presence={(
                    <PresencePill
                        active={people > 0}
                        label={people === 0 ? 'Ninguém usando agora' : `${people} usando agora`}
                        onClick={people > 0 ? () => setShowOnline(true) : undefined}
                        title={people > 0 ? 'Ver quem está usando agora' : undefined}
                        leading={people > 0 && (
                            <span className="dt-presence-avatars">
                                {onlineUsers.slice(0, MAX_AVATARS).map((user) => (
                                    <PersonAvatar
                                        key={user.id}
                                        className="dt-presence-avatar"
                                        name={user.name}
                                        picture={user.picture}
                                    />
                                ))}
                                {people > MAX_AVATARS && (
                                    <span className="dt-presence-avatar dt-presence-more">
                                        +{people - MAX_AVATARS}
                                    </span>
                                )}
                            </span>
                        )}
                    />
                )}
            />

            <DetailUsageCard
                kpis={[
                    { label: 'Usuários conectados', value: getDistinctUsers(scoped) },
                    { label: 'Vezes utilizada', value: getAccessCount(scoped) },
                    { label: 'Tempo de uso no período', value: formatDuration(total.seconds) },
                    { label: 'Tempo médio por uso', value: average == null ? null : formatDuration(average) },
                ]}
                title={title(period)}
                subtitle={days === 0 ? 'Tempo de uso por hora' : 'Horas de uso por dia'}
                status={status}
                period={period}
                dataFor={(_days, isDaily) => (isDaily
                    ? getDailyUsage(history)
                    : getSessionHistoryUsage(scoped))}
            />

            <DetailHistory
                columnLabel="Usuário"
                rows={rows}
                loading={status === 'loading'}
                renderSubject={(user) => (
                    <>
                        <PersonAvatar className="dt-history-avatar" name={user.name} picture={user.picture} />
                        <span className="dt-history-name">{user.name}</span>
                        {user.removed && (
                            <span
                                className="removed-user-tag"
                                title="Esta pessoa não tem mais acesso ao pacote"
                            >
                                removido
                            </span>
                        )}
                    </>
                )}
            />

            {showOnline && (
                <UsingNowModal
                    pkg={pkg}
                    session={session}
                    historyUsers={stats?.historyUsers}
                    online={online}
                    onClose={() => setShowOnline(false)}
                />
            )}
        </DetailScreen>
    );
}

function SessionNotFound({ packageId }) {
    return (
        <div className="nothing-here-container">
            <div className="nothing-here-content">
                <h3 className="nothing-here-title">Sessão não encontrada</h3>
                <p className="nothing-here-text">Ela pode ter sido excluída do pacote.</p>
                <Link className="btn btn-accent-soft" to={`/collection/${packageId}`} style={{ marginTop: 16 }}>
                    Voltar para o pacote
                </Link>
            </div>
        </div>
    );
}
