import { useMemo, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router';
import { getSuspendedMembershipKeys, usePackage, usePackages } from '../../lib/packages.jsx';
import PeoplePanel from './PeoplePanel.jsx';
import SessionsTable from './SessionsTable.jsx';

/**
 * Tela do pacote na coleção (visão do dono).
 *
 * O que ainda não está aqui, e por quê: o gráfico de uso, o "usando agora" e o
 * tempo de uso por sessão vêm todos do mesmo pipeline de estatísticas
 * (getPackageOverviewStats + o processamento de accessHistory), que é a
 * próxima fatia. Preferi deixar as colunas em "—" a mostrar zero: zero é uma
 * afirmação, e não temos o dado.
 */
export default function PackageDetail() {
    const { packageId } = useParams();
    const { pkg, notFound } = usePackage(packageId);
    const { collection, userInfo } = usePackages();
    const [search, setSearch] = useState('');

    const suspendedKeys = useMemo(
        () => getSuspendedMembershipKeys(collection, userInfo?.peopleLimit),
        [collection, userInfo]
    );

    if (notFound) return <PackageNotFound />;
    if (!pkg) return null;

    const sessions = pkg.sessions || [];
    const inactive = pkg.isActive === false;
    const createdAt = new Date(pkg.createdAt).toLocaleDateString('pt-BR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    return (
        <>
            <div className="dashboard-topbar">
                <div className="topbar-search">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Buscar sessões do pacote..."
                        autoComplete="off"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <section
                id="package-details"
                className={`content-card collection-state expanded${inactive ? ' package-inactive' : ''}`}
                data-package-id={pkg.id}
            >
                <div className={`preset-collection${inactive ? ' package-inactive' : ''}`}>
                    {/* Sem .screens-container: aquele container de 200% existia para
                        deslizar entre o pacote e a sessão com um translateX. Isso
                        agora é troca de rota. */}
                    <div className="screen-section primary content-state">
                        <div className="preset-content">
                            <div className="card-header">
                                <div className="header-top">
                                    <h2>{pkg.name}</h2>
                                    <span className="pkg-sessions-count">
                                        {sessions.length} {sessions.length === 1 ? 'sessão' : 'sessões'}
                                    </span>
                                    <p className="created-date">
                                        <span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M8 2v4" />
                                                <path d="M16 2v4" />
                                                <rect width="18" height="18" x="3" y="4" rx="2" />
                                                <path d="M3 10h18" />
                                            </svg>
                                        </span>
                                        <span className="created-at-label">Criado em {createdAt}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="card-content custom-scrollbar">
                                <div className="collection-content-layout">
                                    <div className="collection-chart-users-row">
                                        {/* A coluna do gráfico volta com o pipeline de
                                            estatísticas; até lá as pessoas ocupam a linha. */}
                                        <div className="collection-users-col">
                                            <PeoplePanel
                                                pkg={pkg}
                                                suspendedKeys={suspendedKeys}
                                            />
                                        </div>
                                    </div>

                                    <SessionsTable
                                        pkg={pkg}
                                        sessions={sessions}
                                        search={search}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Modais com rota própria (compartilhar, pessoas, adicionar sessão). */}
            <Outlet />
        </>
    );
}

function PackageNotFound() {
    return (
        <div className="nothing-here-container">
            <div className="nothing-here-content">
                <h3 className="nothing-here-title">Pacote não encontrado</h3>
                <p className="nothing-here-text">
                    Ele pode ter sido excluído, ou o link aponta para um pacote que não é seu.
                </p>
                <Link className="btn btn-primary" to="/collection" style={{ marginTop: 16 }}>
                    Voltar para a coleção
                </Link>
            </div>
        </div>
    );
}
