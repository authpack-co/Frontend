import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';
import { buildUsingNowData, formatDuration } from '../../lib/usage.js';

/**
 * Quem está usando a sessão neste momento.
 *
 * O rodapé da linha diz QUANTOS estão online; este card diz QUEM são, há
 * quanto tempo cada um está conectado e quanto já usou hoje nesta sessão.
 * Tudo sai do histórico que o pacote já carregou.
 *
 * O tempo corre sozinho: "ativo há" conta desde a conexão, então o card
 * recalcula a cada segundo em vez de congelar no instante em que abriu.
 */
export default function UsingNowModal({ pkg, session, accessHistory, onClose }) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const data = buildUsingNowData(session.id, accessHistory, now);
    const domain = faviconDomain(session.url) || session.url || '';

    const people = data.online.length;
    const peopleLabel = people === 0
        ? 'ninguém usando agora'
        : (people === 1 ? '1 pessoa usando agora' : `${people} pessoas usando agora`);

    // A pessoa pode ter saído do pacote depois de usar: a linha continua
    // valendo, só perde nome e avatar.
    const userOf = (userId) => (pkg.users || []).find((user) => user.id === userId)
        || { id: userId, name: 'Usuário removido', email: '', picture: '' };

    return (
        <Modal
            open
            onClose={onClose}
            className="un-modal"
            title={session.name}
            footer={(
                <span className="un-total-label">
                    Hoje nesta sessão · <strong className="un-total">{formatDuration(data.todayTotalSeconds)}</strong>
                </span>
            )}
        >
            <div className="un-service">
                <ServiceIcon className="un-service-icon" icon={session.icon} url={session.url} name={session.name} />
                <div className="un-service-text">
                    <p className="un-service-meta">{domain} · {peopleLabel}</p>
                </div>
            </div>

            <div className="un-body">
                {people > 0 ? (
                    <div className="data-table un-table">
                        <div className="table-header">
                            <div className="table-col">Usuário</div>
                            <div className="table-col">Ativo há</div>
                            <div className="table-col">Hoje</div>
                        </div>
                        <div className="table-body un-list custom-scrollbar">
                            {data.online.map((row) => {
                                const user = userOf(row.userId);
                                return (
                                    <div className="table-row un-row" key={row.userId}>
                                        <div className="table-col un-user">
                                            <Avatar user={user} />
                                            <div className="un-user-text">
                                                <span className="un-user-name">{user.name || 'Usuário'}</span>
                                                {user.email && <span className="un-user-email">{user.email}</span>}
                                            </div>
                                            {/* Mesma pessoa com dois acessos vivos: uma linha
                                                só, com a contagem ao lado do nome. */}
                                            {row.devices > 1 && (
                                                <span className="un-connections" title={`${row.devices} acessos simultâneos`}>
                                                    ×{row.devices}
                                                </span>
                                            )}
                                        </div>
                                        <div className="table-col un-active">{formatDuration(row.activeSeconds)}</div>
                                        <div className="table-col un-today">{formatDuration(row.todaySeconds)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="un-empty">
                        <h3 className="un-empty-title">Ninguém está usando agora</h3>
                        <p className="un-empty-text">Quem estava conectado saiu nos últimos instantes.</p>
                    </div>
                )}

                {data.past.length > 0 && (
                    <div className="un-past">
                        <div className="un-past-title">Usaram hoje e já saíram</div>
                        <div className="un-past-list">
                            {data.past.map((row) => {
                                const user = userOf(row.userId);
                                const left = row.leftAt
                                    ? `Saiu às ${row.leftAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                    : undefined;

                                return (
                                    <div className="un-chip" key={row.userId} title={left}>
                                        <Avatar user={user} className="un-avatar un-avatar-sm" />
                                        <span className="un-chip-name">{user.name || 'Usuário'}</span>
                                        <span className="un-chip-time">{formatDuration(row.todaySeconds)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

function Avatar({ user, className = 'un-avatar' }) {
    return (
        <span className={className}>
            {user.picture
                ? <img src={user.picture} alt={user.name || ''} />
                : (user.name || '?').trim().charAt(0).toUpperCase()}
        </span>
    );
}
