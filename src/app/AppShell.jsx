import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useMatch } from 'react-router';
import OptionsMenu from '../components/OptionsMenu.jsx';
import {
    AbortAccessModal,
    CreatePackageModal,
    DeletePackageModal,
    RenamePackageModal,
} from '../features/collection/PackageModals.jsx';
import SharedPeopleModal from '../features/collection/SharedPeopleModal.jsx';
import UpdatePackageModal from '../features/collection/capture/UpdatePackageModal.jsx';
import PlansModal from '../features/plans/PlansModal.jsx';
import useCheckoutReturn from '../features/plans/useCheckoutReturn.js';
import useUpgradeParam from '../features/plans/useUpgradeParam.js';
import SettingsModal from '../features/settings/SettingsModal.jsx';
import ActivateAccessModal from '../features/shared/ActivateAccessModal.jsx';
import { useAuth } from '../lib/auth.jsx';
import { PackagesProvider, usePackages } from '../lib/packages.jsx';
import { useTheme } from '../lib/theme.js';
import './dashboard.css';

// Papéis com benefício ilimitado (espelha PLUS_BENEFIT_ROLES no backend).
const PLUS_BENEFIT_ROLES = ['admin'];

const UPGRADE_COLLAPSED_KEY = 'niango-upgrade-collapsed';

function readUpgradeCollapsed() {
    try {
        return localStorage.getItem(UPGRADE_COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
}

/**
 * Casca do app: sidebar fixa + área de conteúdo.
 *
 * As classes são as do CSS em dashboard.css: é o que mantém o desenho de pé.
 */
export default function AppShell() {
    // O retorno do Checkout cai em qualquer rota do app, não só nos planos.
    useCheckoutReturn();

    return (
        <PackagesProvider>
            <Sidebar />
            <div className="page-content">
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </PackagesProvider>
    );
}

function Sidebar() {
    const { pathname } = useLocation();
    const isAccess = pathname === '/shared' || pathname.startsWith('/shared/');
    // Dois nomes para a mesma seção, e eles não coincidem: o CSS herdado chama
    // a seção de acessos de "access" (.preset-access, .preset-empty-access),
    // enquanto a URL dela é /shared. Usar um no lugar do outro produzia links
    // para /access/<id>, rota que não existe.
    const section = isAccess ? 'access' : 'collection';
    const routeBase = isAccess ? 'shared' : 'collection';

    const { status, collection, access, userInfo } = usePackages();
    const packages = isAccess ? access : collection;

    // Abaixo de 1199px a sidebar sai da tela e volta pelo hambúrguer.
    const [menuOpen, setMenuOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [activating, setActivating] = useState(false);
    // Configurações e planos abrem por cima da tela, sem trocar de rota.
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [plansOpen, setPlansOpen] = useState(false);
    const [peopleOpen, setPeopleOpen] = useState(false);

    // Chegando pelo upsell da página de preços, os planos já abrem.
    useUpgradeParam(() => setPlansOpen(true));

    // Navegar fecha o menu: no celular a sidebar cobre o conteúdo que a pessoa
    // acabou de pedir.
    useEffect(() => { setMenuOpen(false); }, [pathname]);

    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuOpen]);

    // A visibilidade de vários controles da top bar é decidida no CSS por
    // body[data-dash-section]; mantê-lo é o que preserva aquelas regras.
    useEffect(() => {
        document.body.dataset.dashSection = section;
        return () => { delete document.body.dataset.dashSection; };
    }, [section]);

    const listState = status === 'loading'
        ? 'loading'
        : (packages.length === 0 ? `empty-${section}` : section);

    return (
        <>
            <button
                className={`hamburger-btn${menuOpen ? ' active' : ''}`}
                type="button"
                aria-label="Menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
            >
                <div className="hamburger-icon"><span></span><span></span><span></span></div>
            </button>
            <div
                className={`sidebar-overlay${menuOpen ? ' active' : ''}`}
                onClick={() => setMenuOpen(false)}
            ></div>

        <aside className={`navigation-sidebar${menuOpen ? ' active' : ''}`}>
            <div className="sidebar-brand">
                <img src="/assets/images/favicon-128x128.png" alt="Niango" />
                <span className="sidebar-brand-name">Niango</span>
            </div>

            <nav className="sidebar-nav">
                {userInfo?.role === 'admin' && (
                    <div className="sidebar-role-nav">
                        <Link className="nav-item sidebar-admin-link" to="/admin">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            Painel admin
                        </Link>
                    </div>
                )}

                {/* As duas seções são rotas: a lista abaixo reflete a da URL. */}
                <div className="sidebar-sections">
                    <NavLink className="sidebar-section-toggle collection-tab" to="/collection">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                        </svg>
                        <span>Minha coleção</span>
                    </NavLink>
                    <NavLink className="sidebar-section-toggle access-tab" to="/shared">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z" />
                            <path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
                        </svg>
                        <span>Meus acessos</span>
                    </NavLink>
                </div>

                <div className="sidebar-packages-head">
                    <span className="sidebar-packages-heading">Pacotes</span>
                    {/* Cada seção tem o seu jeito de ganhar um pacote: na
                        coleção se cria, nos acessos se ativa uma chave. */}
                    {isAccess ? (
                        <button
                            className="sidebar-add-pkg"
                            type="button"
                            title="Ativar pacote por chave"
                            aria-label="Ativar pacote por chave"
                            onClick={() => setActivating(true)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="7.5" cy="15.5" r="5.5" />
                                <path d="m21 2-9.6 9.6" />
                                <path d="m15.5 7.5 3 3L22 7l-3-3" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            className="sidebar-add-pkg"
                            type="button"
                            title="Novo pacote"
                            aria-label="Novo pacote"
                            onClick={() => setCreating(true)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14" />
                                <path d="M5 12h14" />
                            </svg>
                        </button>
                    )}
                </div>

                <div id="packages-list" className={`${listState}-state custom-scrollbar`}>
                    {status === 'loading' && (
                        <div className="preset-loading">
                            <div className="sidebar-pkg-list">
                                <div className="skeleton sidebar-pkg-skeleton"></div>
                                <div className="skeleton sidebar-pkg-skeleton"></div>
                                <div className="skeleton sidebar-pkg-skeleton"></div>
                                <div className="skeleton sidebar-pkg-skeleton"></div>
                            </div>
                        </div>
                    )}

                    {status !== 'loading' && packages.length > 0 && (
                        <div className={`preset-${section}`}>
                            <div className="access-grid sidebar-pkg-list">
                                {packages.map((pkg) => (
                                    <SidebarPackage
                                        key={pkg.id}
                                        pkg={pkg}
                                        routeBase={routeBase}
                                        isAccess={isAccess}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {status !== 'loading' && packages.length === 0 && (
                        <div className={`preset-empty-${section}`}>
                            <p className="sidebar-pkg-empty">
                                {isAccess ? 'Nenhum acesso ainda.' : 'Você ainda não tem pacotes.'}
                            </p>
                        </div>
                    )}
                </div>
            </nav>

            <SidebarFooter
                userInfo={userInfo}
                loading={status === 'loading'}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenPlans={() => setPlansOpen(true)}
                onOpenPeople={() => setPeopleOpen(true)}
            />
        </aside>

            <CreatePackageModal open={creating} onClose={() => setCreating(false)} />
            <ActivateAccessModal open={activating} onClose={() => setActivating(false)} />

            <SettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                // "Ver benefícios Plus" troca de modal: configurações sai da
                // frente e os planos entram, como no painel antigo.
                onOpenPlans={() => { setSettingsOpen(false); setPlansOpen(true); }}
            />
            <PlansModal open={plansOpen} onClose={() => setPlansOpen(false)} />

            <SharedPeopleModal
                open={peopleOpen}
                onClose={() => setPeopleOpen(false)}
                userInfo={userInfo}
                // Mesma troca de modal das configurações: a lista sai, os
                // planos entram.
                onOpenPlans={() => { setPeopleOpen(false); setPlansOpen(true); }}
            />
        </>
    );
}

function SidebarPackage({ pkg, routeBase, isAccess }) {
    const inactive = pkg.isActive === false;
    // Solicitação esperando resposta — só na coleção, onde há o que aprovar.
    const pending = !isAccess && Number(pkg.pendingRequests || 0) > 0;

    // 'update' | 'rename' | 'delete' | 'abort' | null
    const [action, setAction] = useState(null);
    const close = () => setAction(null);

    // O item deixou de ser um link inteiro: ele hospeda o menu de ações e os
    // modais, e nada disso pode viver dentro de uma <a>. O link é a área
    // principal; a seleção é calculada aqui em vez de vir do NavLink.
    const selected = useMatch({ path: `/${routeBase}/${pkg.id}`, end: false });

    return (
        <div
            className={[
                'access-item sidebar-pkg-item',
                pending ? 'has-pending' : '',
                selected ? 'selected' : '',
            ].filter(Boolean).join(' ')}
            title={pending ? 'Alguém pediu acesso' : undefined}
        >
            <Link className="sidebar-pkg-main" to={`/${routeBase}/${pkg.id}`}>
                <div className="access-title">{pkg.name}</div>
            </Link>

            {/* A lista de pacotes rola: o menu é fixo no viewport para não
                ser cortado no último item. */}
            <OptionsMenu label="Ações do pacote" anchorTo=".sidebar-pkg-item">
                {(closeMenu) => (isAccess ? (
                    <button
                        className="abort-package-access-btn"
                        type="button"
                        onClick={() => { closeMenu(); setAction('abort'); }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                        <span>Encerrar</span>
                    </button>
                ) : (
                    <>
                        {/* Recaptura o pacote inteiro: mesmo motor do "Adicionar
                            sessão", com uma etapa a mais para escolher quais
                            sessões entram no lote. */}
                        <button className="update-package-btn" type="button" onClick={() => { closeMenu(); setAction('update'); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                <path d="M8 16H3v5" />
                            </svg>
                            <span>Atualizar</span>
                        </button>
                        <Link className="share-package-btn" to={`/collection/${pkg.id}/share`} onClick={closeMenu}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v13" />
                                <path d="m16 6-4-4-4 4" />
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                            </svg>
                            <span>Compartilhar</span>
                        </Link>
                        <button className="edit-package-btn" type="button" onClick={() => { closeMenu(); setAction('rename'); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                            </svg>
                            <span>Editar</span>
                        </button>
                        <button className="delete-package-btn" type="button" onClick={() => { closeMenu(); setAction('delete'); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                            <span>Excluir</span>
                        </button>
                    </>
                ))}
            </OptionsMenu>

            {action === 'update' && <UpdatePackageModal pkg={pkg} onClose={close} />}
            {action === 'rename' && <RenamePackageModal pkg={pkg} open onClose={close} />}
            {action === 'delete' && <DeletePackageModal pkg={pkg} open onClose={close} />}
            {action === 'abort' && <AbortAccessModal pkg={pkg} open onClose={close} />}

            {inactive && (
                <div className="inactive-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                    </svg>
                </div>
            )}
        </div>
    );
}

function SidebarFooter({ userInfo, loading, onOpenSettings, onOpenPlans, onOpenPeople }) {
    const hasPlusBenefits = PLUS_BENEFIT_ROLES.includes(userInfo?.role)
        || (userInfo?.plan && userInfo.plan !== 'free');

    // Quem minimizou o banner não quer vê-lo aberto de novo a cada visita.
    const [collapsed, setCollapsed] = useState(readUpgradeCollapsed);
    useEffect(() => {
        try {
            localStorage.setItem(UPGRADE_COLLAPSED_KEY, collapsed ? '1' : '0');
        } catch {
            // Navegador sem storage (aba anônima, cookies bloqueados): o estado
            // vale só para esta sessão, e o banner segue funcionando.
        }
    }, [collapsed]);

    return (
        <div className="sidebar-footer">
            {!loading && !hasPlusBenefits && (
                <div className={`sidebar-upgrade-card${collapsed ? ' is-collapsed' : ''}`}>
                    {/* O corpo empilha quando aberto e vira uma linha só quando
                        minimizado; o botão é irmão dele para ficar sempre na
                        ponta direita, nos dois estados. */}
                    <div className="sidebar-upgrade-body">
                        <div className="sidebar-upgrade-title">Niango <span>Planos</span></div>
                        <p className="sidebar-upgrade-desc">Compartilhe com muito mais pessoas.</p>
                        <button className="plus-subscribe-btn sidebar-upgrade-link" type="button" onClick={onOpenPlans}>
                            Fazer upgrade<span className="sidebar-upgrade-arrow"> &rarr;</span>
                        </button>
                    </div>
                    <button
                        className="sidebar-upgrade-toggle"
                        type="button"
                        aria-expanded={!collapsed}
                        title={collapsed ? 'Expandir' : 'Minimizar'}
                        aria-label={collapsed ? 'Expandir Niango Planos' : 'Minimizar Niango Planos'}
                        onClick={() => setCollapsed((value) => !value)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </button>
                </div>
            )}

            {loading
                ? <div className="sk-block sk-plan-people"></div>
                : <PeopleCounter userInfo={userInfo} onOpen={onOpenPeople} />}

            <ProfileMenu
                userInfo={userInfo}
                loading={loading}
                hasPlusBenefits={hasPlusBenefits}
                onOpenSettings={onOpenSettings}
            />
        </div>
    );
}

/**
 * Pessoas com quem o usuário compartilha, contra o limite do plano — o único
 * limitador: pacotes e sessões são ilimitados.
 *
 * O pill é clicável: o número diz que o limite está perto, a lista diz quem
 * está ocupando as vagas.
 */
function PeopleCounter({ userInfo, onOpen }) {
    const used = Math.max(0, Number(userInfo?.peopleUsed || 0));
    const limit = userInfo?.peopleLimit; // null/undefined = ilimitado
    const unlimited = limit == null;

    const className = [
        'people-counter',
        !unlimited && used > limit ? 'over-limit' : '',
        !unlimited && used === limit ? 'at-limit' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="sidebar-plan-people">
            <span
                className={className}
                role="button"
                tabIndex={0}
                onClick={onOpen}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpen();
                    }
                }}
            >
                <svg className="people-counter__icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="people-counter__text">
                    <strong>{used}</strong>{unlimited ? ' pessoas' : ` / ${limit} pessoas`}
                </span>
                <span className="people-counter__info" tabIndex={0} role="img" aria-label="Sobre o limite de pessoas">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                    </svg>
                    <span className="people-counter__tip">
                        Pessoas com quem você compartilha acesso nos seus pacotes. Esse é o limite
                        do seu plano — pacotes e sessões são ilimitados. Clique para ver a lista.
                    </span>
                </span>
            </span>
        </div>
    );
}

function ProfileMenu({ userInfo, loading, hasPlusBenefits, onOpenSettings }) {
    const [open, setOpen] = useState(false);
    const { logout } = useAuth();
    const { theme, toggle } = useTheme();
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;

        function handleOutside(event) {
            if (!wrapperRef.current?.contains(event.target)) setOpen(false);
        }
        function handleEscape(event) {
            if (event.key === 'Escape') setOpen(false);
        }

        document.addEventListener('click', handleOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('click', handleOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    if (loading) {
        return (
            <div className="sidebar-profile-wrapper">
                <div className="boot-skeleton--flex sk-profile" style={{ display: 'flex' }}>
                    <div className="sk-circle" style={{ '--sk-size': '35px' }}></div>
                    <div className="sk-profile-lines">
                        <div className="sk-line" style={{ '--sk-h': '11px', '--sk-w': '72%' }}></div>
                        <div className="sk-line" style={{ '--sk-h': '9px', '--sk-w': '88%' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    // Admin tem prioridade sobre o plano no badge; usuário comum não recebe um.
    let badge = null;
    if (userInfo?.role === 'admin') badge = 'Admin';
    else if (userInfo?.plan && userInfo.plan !== 'free') {
        badge = userInfo.plan.charAt(0).toUpperCase() + userInfo.plan.slice(1);
    }

    return (
        <div className="sidebar-profile-wrapper" ref={wrapperRef}>
            <div
                className={`profile${open ? ' menu-open' : ''}`}
                id="sidebar-profile"
                role="button"
                tabIndex={0}
                onClick={() => setOpen((value) => !value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v); }}
            >
                <span className={`profile-picture${hasPlusBenefits ? ' plus-avatar' : ''}`}>
                    {userInfo?.picture && <img src={userInfo.picture} alt="" />}
                </span>
                <div className="sidebar-profile-info">
                    <span className="profile-name">{userInfo?.name}</span>
                    <span className="sidebar-profile-email">{userInfo?.email}</span>
                </div>
                {badge && <span className="plus-badge">{badge}</span>}
                <svg className="sidebar-profile-chevron" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m18 15-6-6-6 6" />
                </svg>
            </div>

            <div className={`sidebar-profile-menu${open ? ' open' : ''}`}>
                <button
                    className="sidebar-profile-menu-item"
                    type="button"
                    onClick={() => { setOpen(false); onOpenSettings(); }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    Configurações
                </button>

                <button className="sidebar-profile-menu-item" type="button" onClick={toggle}>
                    {theme === 'dark' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="4" />
                            <path d="M12 2v2" /><path d="M12 20v2" />
                            <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
                            <path d="M2 12h2" /><path d="M20 12h2" />
                            <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                        </svg>
                    )}
                    <span className="theme-toggle-label">
                        {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
                    </span>
                </button>

                <div className="sidebar-profile-menu-divider"></div>

                <button
                    className="sidebar-profile-menu-item sidebar-profile-menu-item--danger"
                    type="button"
                    onClick={logout}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sair
                </button>
            </div>
        </div>
    );
}
