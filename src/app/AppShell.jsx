import { NavLink, Outlet } from 'react-router';

/**
 * Casca do app: o que sobrevive a qualquer troca de rota.
 *
 * Por enquanto só a navegação de seções — a sidebar de verdade (lista de
 * pacotes, rodapé de plano, perfil) entra quando a tela de coleção migrar.
 */
export default function AppShell() {
    return (
        <div className="ap-shell">
            <aside className="ap-shell-nav">
                <div className="ap-shell-brand">
                    <img src="/assets/images/favicon-128x128.png" alt="" width="24" height="24" />
                    <span>AuthPack</span>
                </div>
                <nav>
                    <NavLink to="/collection">Minha coleção</NavLink>
                    <NavLink to="/shared">Meus acessos</NavLink>
                    <NavLink to="/settings">Configurações</NavLink>
                    <NavLink to="/upgrade">Planos</NavLink>
                </nav>
            </aside>
            <main className="ap-shell-main">
                <Outlet />
            </main>
        </div>
    );
}
