import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../lib/auth.jsx';
import { useTheme } from '../../lib/theme.js';
import './admin.css';

/**
 * Casca do painel admin.
 *
 * É outra casca, e não a do app: sidebar própria, sem coleção nem pacotes.
 * Era assim antes, quando o admin era uma página estática separada, e continua
 * sendo — só que agora as três seções são rotas, não `#hash`.
 */
export default function AdminShell() {
    const { pathname } = useLocation();
    const { logout } = useAuth();
    const { toggle } = useTheme();

    // Abaixo de 900px a sidebar sai da tela e volta pelo hambúrguer.
    const [navOpen, setNavOpen] = useState(false);
    useEffect(() => { setNavOpen(false); }, [pathname]);

    return (
        <div className={`admin-shell${navOpen ? ' nav-open' : ''}`}>
            <aside className="admin-sidebar">
                <div className="admin-brand">
                    <span className="admin-brand-mark">A</span>
                    <span className="admin-brand-name">Niango <em>Admin</em></span>
                </div>

                <nav className="admin-nav">
                    <AdminNavLink to="/admin/finance" label="Financeiro">
                        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </AdminNavLink>
                    <AdminNavLink to="/admin/users" label="Usuários">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </AdminNavLink>
                    <AdminNavLink to="/admin/admins" label="Administradores">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </AdminNavLink>
                </nav>

                <div className="admin-sidebar-footer">
                    <button className="admin-nav-item" type="button" onClick={toggle}>
                        <NavIcon>
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </NavIcon>
                        <span>Tema</span>
                    </button>
                    <Link className="admin-nav-item" to="/collection">
                        <NavIcon>
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <path d="M9 22V12h6v10" />
                        </NavIcon>
                        <span>Voltar ao painel</span>
                    </Link>
                    <button
                        className="admin-nav-item admin-nav-item--danger"
                        type="button"
                        onClick={logout}
                    >
                        <NavIcon>
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <path d="M16 17l5-5-5-5M21 12H9" />
                        </NavIcon>
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            <header className="admin-topbar">
                <button
                    className="admin-burger"
                    type="button"
                    aria-label="Menu"
                    aria-expanded={navOpen}
                    onClick={() => setNavOpen((open) => !open)}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <span className="admin-brand-name">Niango <em>Admin</em></span>
            </header>
            <div className="admin-overlay" onClick={() => setNavOpen(false)}></div>

            <main className="admin-main">
                <Outlet />
            </main>
        </div>
    );
}

function NavIcon({ children }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {children}
        </svg>
    );
}

function AdminNavLink({ to, label, children }) {
    return (
        <NavLink
            className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
            to={to}
        >
            <NavIcon>{children}</NavIcon>
            <span>{label}</span>
        </NavLink>
    );
}

/**
 * Cabeçalho de seção. A seção inteira carrega a classe `active` porque o CSS
 * esconde `.admin-view` por padrão — lá as três viviam no mesmo documento e
 * só uma aparecia; aqui o roteador já garante que só uma exista.
 */
export function AdminView({ title, description, children }) {
    return (
        <section className="admin-view active">
            <div className="admin-view-head">
                <h1>{title}</h1>
                <p>{description}</p>
            </div>
            {children}
        </section>
    );
}
