import { Link } from 'react-router';

/**
 * Pessoas com acesso ao pacote.
 *
 * O criador vem sempre no topo: a ordem do JSON_ARRAYAGG do backend não é
 * garantida. "sem acesso" marca quem passou do limite de pessoas do plano.
 */
export default function PeoplePanel({ pkg, suspendedKeys }) {
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
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function UserRow({ user, pkg, suspended }) {
    return (
        <div className={`list-item user${suspended ? ' suspended' : ''}`} data-user-id={user.id}>
            <div className="item-info">
                <div className="profile-picture">
                    {user.picture && <img src={user.picture} alt="" />}
                </div>
                <div className="item-name">{user.name}</div>
                {user.isCreator && <span className="creator-tag">Criador</span>}
                {suspended && <span className="suspended-tag">sem acesso</span>}
            </div>

            <div className="item-actions">
                <Link
                    className="btn btn-small details-btn"
                    to={`/collection/${pkg.id}/user/${user.id}`}
                >
                    Ver detalhes
                </Link>
            </div>

            {/* O "visto por último" vem das estatísticas do pacote, ainda não migradas. */}
            <div className="item-details"></div>
        </div>
    );
}
