import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';
import { makeUserLookup } from '../../lib/packageStats.js';
import { formatDuration, getUsingNow } from '../../lib/usage.js';

/** "14:32" — a hora em que a pessoa conectou. */
function clock(date) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Quem está usando a sessão neste momento.
 *
 * O rodapé da linha diz QUANTOS estão online; este card diz QUEM são, desde
 * que horas e há quanto tempo. Nada além disso: quem usou hoje e já saiu é
 * pergunta do histórico, e estava aqui só engordando o card.
 *
 * Os tempos são lidos uma vez, quando o card abre. A versão anterior recontava
 * tudo a cada segundo, e o resultado era um painel inteiro piscando para
 * mostrar que "12min" virou "12min".
 */
export default function UsingNowModal({ pkg, session, accessHistory, historyUsers, onClose }) {
    const [openedAt] = useState(() => new Date());

    const rows = getUsingNow(session.id, accessHistory, openedAt);
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
                                        Conectou às {clock(row.since)}
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
