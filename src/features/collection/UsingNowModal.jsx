import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import PersonAvatar from '../../components/PersonAvatar.jsx';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';
import { makeUserLookup } from '../../lib/packageStats.js';

/**
 * "há 15min", "há 1h 20min" — há quanto tempo a conexão está ativa.
 *
 * Arredondado para o minuto de propósito: o card responde "quem está aqui e
 * desde quando, mais ou menos", e segundos contando só chamariam atenção para
 * um número que ninguém veio buscar.
 */
export function activeFor(activeSeconds) {
    const minutes = Math.floor(Math.max(0, activeSeconds) / 60);
    if (minutes < 1) return 'há menos de 1min';
    if (minutes < 60) return `há ${minutes}min`;

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `há ${hours}h ${rest}min` : `há ${hours}h`;
}

/**
 * Casca dos dois cards de "usando agora": um cabeçalho com quem ou o quê, e
 * uma linha por item com o "ativo há".
 *
 * As linhas são uma foto do momento em que o card abre. A carga de "usando
 * agora" se repete sozinha lá fora, mas aqui dentro nada fica mudando
 * enquanto a pessoa lê.
 */
function PresenceModal({ id, media, title, meta, items, emptyText, onClose }) {
    const [snapshot] = useState(items);

    return (
        <Modal
            open
            onClose={onClose}
            id={id}
            className="un-modal"
            headerClassName="un-header"
            bodyClassName="un-body"
            header={(
                <div className="un-service">
                    {media}
                    <div className="un-service-text">
                        <h2 className="modal-title un-service-name">{title}</h2>
                        <p className="un-service-meta">{meta}</p>
                    </div>
                </div>
            )}
        >
            {snapshot.length > 0 ? (
                <ul className="un-list custom-scrollbar">
                    {snapshot.map((item) => (
                        <li className="un-row" key={item.key}>
                            {item.media}
                            <span className="un-row-name">{item.label}</span>
                            <span className="un-row-since">Ativo {activeFor(item.activeSeconds)}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="un-empty">
                    <p className="un-empty-text">{emptyText}</p>
                </div>
            )}
        </Modal>
    );
}

/** Quem está usando a sessão neste momento. */
export default function UsingNowModal({ pkg, session, historyUsers, online, onClose }) {
    const rows = online.bySession[session.id] || [];
    const domain = faviconDomain(session.url) || session.url || '';

    // A pessoa pode ter saído do pacote depois de usar: a linha continua
    // valendo, e o nome e o avatar vêm do histórico, que guarda também quem
    // não é mais membro.
    const userOf = makeUserLookup(pkg, historyUsers).resolve;

    const people = rows.length;
    const peopleLabel = people === 1 ? '1 pessoa usando agora' : `${people} pessoas usando agora`;

    const items = rows.map((row) => {
        const user = userOf(row.userId);
        return {
            key: row.userId,
            label: user.name || 'Usuário',
            activeSeconds: row.activeSeconds,
            media: <PersonAvatar className="un-avatar" name={user.name} picture={user.picture} />,
        };
    });

    return (
        <PresenceModal
            id="usingNowModal"
            media={<ServiceIcon className="un-service-icon" icon={session.icon} url={session.url} name={session.name} />}
            title={session.name}
            meta={people > 0 ? `${domain} · ${peopleLabel}` : domain}
            items={items}
            emptyText="Ninguém está usando esta sessão agora."
            onClose={onClose}
        />
    );
}

/** Em que sessões uma pessoa está neste momento. */
export function UserUsingNowModal({ pkg, user, online, onClose }) {
    const items = (pkg.sessions || []).flatMap((session) => {
        const row = (online.bySession[session.id] || []).find((item) => item.userId === user.id);
        if (!row) return [];
        return [{
            key: session.id,
            label: session.name,
            activeSeconds: row.activeSeconds,
            media: <ServiceIcon className="un-row-service" icon={session.icon} url={session.url} name={session.name} />,
        }];
    });

    // Quem está há mais tempo no topo, como na lista de pessoas.
    items.sort((a, b) => b.activeSeconds - a.activeSeconds);

    const count = items.length;
    const countLabel = count === 1 ? 'Usando 1 sessão agora' : `Usando ${count} sessões agora`;

    return (
        <PresenceModal
            id="userUsingNowModal"
            media={<PersonAvatar className="un-service-icon un-person" name={user.name} picture={user.picture} />}
            title={user.name}
            meta={count > 0 ? countLabel : 'Não está usando nenhuma sessão agora'}
            items={items}
            emptyText="Esta pessoa não está usando nenhuma sessão agora."
            onClose={onClose}
        />
    );
}
