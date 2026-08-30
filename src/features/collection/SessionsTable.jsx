import { useState } from 'react';
import { useNavigate } from 'react-router';
import OptionsMenu from '../../components/OptionsMenu.jsx';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';
import useConnectSession from '../../components/useConnectSession.jsx';
import { paletteFromSession } from '../../lib/palette.js';
import UpdateSessionModal from './capture/UpdateSessionModal.jsx';
import UsingNowModal from './UsingNowModal.jsx';
import { DeleteSessionModal, RenameSessionModal } from './SessionModals.jsx';
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
    // Um portão de extensão para a lista inteira, não um por linha.
    const { connect, gate } = useConnectSession(pkg, { isAcquired: false });
    // A recaptura mora aqui (e não na linha) para o progresso sobreviver a
    // qualquer re-render da lista enquanto as abas abrem.
    const [updating, setUpdating] = useState(null);
    const [usingNow, setUsingNow] = useState(null);

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
                                    onConnect={connect}
                                    onUpdate={setUpdating}
                                    onShowUsingNow={setUsingNow}
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

            {gate}

            {usingNow && (
                <UsingNowModal
                    pkg={pkg}
                    session={usingNow}
                    accessHistory={stats?.accessHistory}
                    onClose={() => setUsingNow(null)}
                />
            )}

            {updating && (
                <UpdateSessionModal
                    pkg={pkg}
                    session={updating}
                    onClose={() => setUpdating(null)}
                />
            )}
        </div>
    );
}

function SessionRow({ session, pkg, stats, statsStatus, onConnect, onUpdate, onShowUsingNow }) {
    const navigate = useNavigate();
    // 'rename' | 'delete' | null
    const [action, setAction] = useState(null);
    const closeAction = () => setAction(null);
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

            <UsingNow
                users={onlineUsers}
                loading={statsStatus === 'loading'}
                onOpen={() => onShowUsingNow(session)}
            />
            <UsageToday
                session={session}
                accessHistory={stats?.accessHistory}
                loading={statsStatus === 'loading'}
            />

            <div className="session-row-actions">
                <OptionsMenu
                    buttonClassName="session-options-btn"
                    menuClassName="session-options"
                    label="Ações da sessão"
                    glyph="⋯"
                    // A lista rola dentro da moldura: o menu é fixo no
                    // viewport para não ser cortado na última linha.
                    anchorTo=".session-row"
                >
                    {(closeMenu) => (
                        <>
                            <button
                                className="connect-session-btn"
                                type="button"
                                disabled={inactive}
                                onClick={() => { closeMenu(); onConnect(session); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
                                </svg>
                                <span>Conectar</span>
                            </button>
                            {/* Recaptura: mesmo motor do "Adicionar sessão",
                                sem etapa de seleção. */}
                            <button
                                className="update-session-btn"
                                type="button"
                                onClick={() => { closeMenu(); onUpdate(session); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                    <path d="M21 3v5h-5" />
                                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                    <path d="M8 16H3v5" />
                                </svg>
                                <span>Atualizar</span>
                            </button>
                            <button
                                className="edit-session-btn"
                                type="button"
                                onClick={() => { closeMenu(); setAction('rename'); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                                </svg>
                                <span>Editar</span>
                            </button>
                            <button
                                className="delete-session-btn"
                                type="button"
                                onClick={() => { closeMenu(); setAction('delete'); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                                <span>Excluir</span>
                            </button>
                        </>
                    )}
                </OptionsMenu>
            </div>

            {action === 'rename' && <RenameSessionModal session={session} open onClose={closeAction} />}
            {action === 'delete' && <DeleteSessionModal session={session} open onClose={closeAction} />}
        </div>
    );
}

function UsingNow({ users, loading, onOpen }) {
    if (loading) {
        return (
            <div className="session-card-members is-empty">
                <div className="sk-line" style={{ '--sk-h': '9px', '--sk-w': '70px' }}></div>
            </div>
        );
    }

    // Com gente online o rodapé abre o card de quem está usando. Sem ninguém
    // não há o que abrir, então nem vira botão.
    const clickable = users.length > 0;

    return (
        <div
            className={`session-card-members${users.length === 0 ? ' is-empty' : ''}${clickable ? ' is-clickable' : ''}`}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-haspopup={clickable ? 'dialog' : undefined}
            title={clickable ? 'Ver quem está usando agora' : undefined}
            onClick={clickable ? (event) => { event.stopPropagation(); onOpen(); } : undefined}
            onKeyDown={clickable ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onOpen();
                }
            } : undefined}
        >
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
