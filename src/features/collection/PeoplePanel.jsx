import { useState } from 'react';
import { Link } from 'react-router';
import { timeAgo } from '../../lib/usage.js';
import { RemoveUserModal } from './SessionModals.jsx';

/**
 * Pessoas com acesso ao pacote.
 *
 * O criador vem sempre no topo: a ordem do JSON_ARRAYAGG do backend não é
 * garantida. "sem acesso" marca quem passou do limite de pessoas do plano.
 */
export default function PeoplePanel({ pkg, suspendedKeys, lastUsageByUser, statsReady }) {
    const users = pkg.users || [];

    if (users.length === 0) {
        return (
            <div className="users-panel-container empty-state">
                <div className="preset-empty">
                    <div className="users-panel">
                        <p className="panel-title">Pessoas com acesso</p>
                        <div className="nothing-here-container" style={{ height: '100%', maxHeight: '100%' }}>
                            <div className="nothing-here-content">
                                <h3 className="nothing-here-title">Compartilhe seu pacote</h3>
                                <p className="nothing-here-text">Compartilhe seu pacote com outras pessoas</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const ordered = [...users].sort((a, b) => (b.isCreator ? 1 : 0) - (a.isCreator ? 1 : 0));

    return (
        <div className="users-panel-container content-state">
            <div className="preset-content">
                <div className="users-panel">
                    <p className="panel-title">Pessoas com acesso</p>
                    <div className="scrollable-list custom-scrollbar">
                        {ordered.map((user) => (
                            <UserRow
                                key={user.id}
                                user={user}
                                pkg={pkg}
                                suspended={suspendedKeys.has(`${pkg.id}:${user.id}`)}
                                lastUsage={lastUsageByUser?.[user.id]}
                                statsReady={statsReady}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function UserRow({ user, pkg, suspended, lastUsage, statsReady }) {
    const [removing, setRemoving] = useState(false);
    const seen = lastUsage ? timeAgo(lastUsage) : null;
    // "agora mesmo" é o que acende a linha como online.
    const online = seen === 'agora mesmo';

    const className = [
        'list-item user',
        suspended ? 'suspended' : '',
        online ? 'online' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={className} data-user-id={user.id}>
            <div className="item-info">
                <div className="profile-picture">
                    {user.picture && <img src={user.picture} alt="" />}
                </div>
                <div className="item-name">{user.name}</div>
                {user.isCreator && <span className="creator-tag">Criador</span>}
                {suspended && <span className="suspended-tag">sem acesso</span>}
            </div>

            <div className="item-actions">
                {/* Quem criou o pacote não pode ser removido dele. */}
                {!user.isCreator && (
                    <div className="management-actions">
                        <button
                            className="remove-user-access-btn actionBtn"
                            type="button"
                            title="Remover"
                            aria-label={`Remover ${user.name}`}
                            onClick={() => setRemoving(true)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="22" x2="16" y1="11" y2="11" />
                            </svg>
                        </button>
                    </div>
                )}

                <Link
                    className="btn btn-small details-btn"
                    to={`/collection/${pkg.id}/user/${user.id}`}
                >
                    Ver detalhes
                </Link>
            </div>

            {removing && (
                <RemoveUserModal pkg={pkg} user={user} open onClose={() => setRemoving(false)} />
            )}

            <div className="item-details">
                {/* Enquanto as estatísticas não chegam, a linha fica sem rótulo:
                    "Nunca usou" seria uma afirmação sobre um dado que ainda não veio. */}
                <span className="last-seen-at">
                    {!statsReady ? '' : (seen || 'Nunca usou')}
                </span>
            </div>
        </div>
    );
}
