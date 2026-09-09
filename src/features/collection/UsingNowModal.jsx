import { useEffect } from 'react';
import Modal from '../../components/Modal.jsx';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';
import { makeUserLookup } from '../../lib/packageStats.js';
import { formatDuration } from '../../lib/usage.js';

/** "14:32" — a hora em que a pessoa conectou, contada de trás para frente. */
function connectedAt(activeSeconds) {
    return new Date(Date.now() - activeSeconds * 1000)
        .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Quem está usando a sessão neste momento.
 *
 * O rodapé da linha diz QUANTOS estão online; este card diz QUEM são, desde
 * que horas e há quanto tempo.
 *
 * Os dados vêm da carga de "usando agora", que se repete sozinha, e o card
 * pede uma volta dela ao abrir. Antes tudo isto saía do histórico de 30 dias,
 * carregado uma vez: passado um minuto — que é a janela do heartbeat —, abrir
 * o card dizia que ninguém estava usando, enquanto a linha atrás dele ainda
 * dizia que sim. Os dados eram os mesmos dos dois lados; só o relógio com que
 * o card os lia tinha andado.
 */
export default function UsingNowModal({ pkg, session, historyUsers, online, onClose }) {
    const { refresh } = online;

    useEffect(() => { refresh(); }, [refresh]);

    const rows = online.bySession[session.id] || [];
    const domain = faviconDomain(session.url) || session.url || '';

    const people = rows.length;
    const peopleLabel = people === 0
        ? 'ninguém usando agora'
        : (people === 1 ? '1 pessoa usando agora' : `${people} pessoas usando agora`);

    // A pessoa pode ter saído do pacote depois de usar: a linha continua
    // valendo, e o nome e o avatar vêm do histórico, que guarda também quem
    // não é mais membro.
    const userOf = makeUserLookup(pkg, historyUsers).resolve;

    return (
        <Modal
            open
            onClose={onClose}
            id="usingNowModal"
            className="un-modal"
            headerClassName="un-header"
            bodyClassName="un-body"
            // O cabeçalho é o serviço inteiro: ícone, nome e o resumo de quem
            // está usando. O nome é o próprio título do modal.
            header={(
                <div className="un-service">
                    <ServiceIcon className="un-service-icon" icon={session.icon} url={session.url} name={session.name} />
                    <div className="un-service-text">
                        <h2 className="modal-title un-service-name">{session.name}</h2>
                        <p className="un-service-meta">{domain} · {peopleLabel}</p>
                    </div>
                </div>
            )}
        >
            {people > 0 ? (
                <ul className="un-list custom-scrollbar">
                    {rows.map((row) => {
                        const user = userOf(row.userId);

                        return (
                            <li className="un-row" key={row.userId}>
                                <Avatar user={user} />

                                <div className="un-row-text">
                                    <span className="un-row-name">{user.name || 'Usuário'}</span>
                                    <span className="un-row-since">
                                        Conectou às {connectedAt(row.activeSeconds)}
                                        {/* Mesma pessoa com dois acessos vivos: uma
                                            linha só, com a contagem aqui. */}
                                        {row.devices > 1 && ` · ${row.devices} acessos`}
                                    </span>
                                </div>

                                <span className="un-row-time" title="Tempo de atividade">
                                    <span className="un-live-dot" aria-hidden="true"></span>
                                    {formatDuration(row.activeSeconds)}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="un-empty">
                    <h3 className="un-empty-title">Ninguém está usando agora</h3>
                    <p className="un-empty-text">Quem estava conectado saiu nos últimos instantes.</p>
                </div>
            )}
        </Modal>
    );
}

function Avatar({ user }) {
    return (
        <span className="un-avatar">
            {user.picture
                ? <img src={user.picture} alt={user.name || ''} />
                : (
                    <span className="un-avatar-fallback">
                        {(user.name || '?').trim().charAt(0).toUpperCase()}
                    </span>
                )}
        </span>
    );
}
