import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { AdminView } from './AdminShell.jsx';
import { ListState, PlanBadge, RoleBadge, StatusBadge, TableWrap, UserCell, fmtDate } from './pieces.jsx';
import UserDrawer from './UserDrawer.jsx';

// A busca espera a digitação parar: cada tecla seria uma consulta.
const SEARCH_DEBOUNCE_MS = 300;

export default function UsersPage() {
    const [filters, setFilters] = useState({ q: '', role: '', status: '' });
    const [query, setQuery] = useState('');
    const [state, setState] = useState({ status: 'loading', users: [], total: 0, error: null });
    const [openUser, setOpenUser] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => setFilters((f) => ({ ...f, q: query })), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query]);

    const load = useCallback(() => {
        let alive = true;
        setState((current) => ({ ...current, status: 'loading' }));

        api.admin.listUsers(filters)
            .then((data) => {
                if (!alive) return;
                setState({
                    status: 'ready',
                    users: data?.users || [],
                    total: data?.total || 0,
                    error: null,
                });
            })
            .catch((err) => {
                console.error('[Admin] listUsers error:', err);
                if (alive) setState({ status: 'error', users: [], total: 0, error: err.message });
            });

        return () => { alive = false; };
    }, [filters]);

    useEffect(load, [load]);

    return (
        <AdminView title="Usuários" description="Busque, inspecione e gerencie contas.">
            <div className="admin-toolbar">
                <input
                    type="search"
                    className="admin-input admin-input-grow"
                    placeholder="Buscar por nome ou email…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
                <select
                    className="admin-input"
                    value={filters.role}
                    onChange={(event) => setFilters({ ...filters, role: event.target.value })}
                >
                    <option value="">Todas as roles</option>
                    <option value="user">Usuário</option>
                    <option value="admin">Admin</option>
                </select>
                <select
                    className="admin-input"
                    value={filters.status}
                    onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                >
                    <option value="">Todos os status</option>
                    <option value="active">Ativo</option>
                    <option value="suspended">Suspenso</option>
                </select>
            </div>

            <ListState
                status={state.status}
                error={state.error}
                isEmpty={state.users.length === 0}
                empty="Nenhum usuário encontrado."
            >
                <TableWrap>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Usuário</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Plano</th>
                            <th>Entrou em</th>
                        </tr>
                    </thead>
                    <tbody>
                        {state.users.map((user) => (
                            <tr
                                key={user.id}
                                className="admin-row-clickable"
                                role="button"
                                tabIndex={0}
                                onClick={() => setOpenUser(user.id)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        setOpenUser(user.id);
                                    }
                                }}
                            >
                                <td><UserCell user={user} /></td>
                                <td><RoleBadge role={user.role} /></td>
                                <td><StatusBadge status={user.status} /></td>
                                <td><PlanBadge plan={user.plan} /></td>
                                <td>{fmtDate(user.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </TableWrap>
            </ListState>

            {state.status === 'ready' && state.users.length > 0 && (
                <div className="admin-card-sub" style={{ marginTop: 8 }}>
                    {state.users.length} de {state.total} usuário(s)
                </div>
            )}

            {openUser && (
                <UserDrawer
                    userId={openUser}
                    onClose={() => setOpenUser(null)}
                    onChanged={load}
                />
            )}
        </AdminView>
    );
}
