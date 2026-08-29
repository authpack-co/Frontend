import { NavLink, Outlet } from 'react-router';
import './settings.css';

/**
 * Configurações deixou de ser modal e virou rota: /settings/account e
 * /settings/billing. O desenho é o mesmo; o que muda é que agora dá para
 * recarregar a página na aba de cobrança e continuar nela.
 */
export default function SettingsPage() {
    return (
        <div className="settings-page">
            <aside className="settings-sidebar">
                <div className="settings-sidebar-header">
                    <span className="settings-sidebar-title">Configurações</span>
                </div>
                <nav className="settings-nav">
                    <NavLink className="settings-nav-item" to="/settings/account">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                        Conta
                    </NavLink>
                    <NavLink className="settings-nav-item" to="/settings/billing">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                        Cobrança
                    </NavLink>
                </nav>
            </aside>

            <div className="settings-content">
                <Outlet />
            </div>
        </div>
    );
}
