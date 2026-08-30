import { useState } from 'react';
import { Link, useParams } from 'react-router';
import PersonAvatar from '../../components/PersonAvatar.jsx';
import ServiceIcon, { faviconDomain } from '../../components/ServiceIcon.jsx';
import useConnectSession from '../../components/useConnectSession.jsx';
import { useAccessStats } from '../../lib/packageStats.js';
import { usePackage } from '../../lib/packages.jsx';
import AccessSessionCard from './AccessSessionCard.jsx';

// Quantos ícones de serviço entram na pilha de identidade do header.
const IDENTITY_ICONS = 3;

/**
 * Tela de um pacote recebido.
 *
 * A visão do membro é outra coisa que a do dono: nada de gráfico, pessoas ou
 * gestão — só qual é o pacote, quem compartilhou, e as sessões para abrir.
 */
export default function AccessDetail() {
    const { packageId } = useParams();
    const { pkg, notFound } = usePackage(packageId);
    const { connect, gate } = useConnectSession(pkg, { isAcquired: true });

    const [search, setSearch] = useState('');
    const { joinedAt } = useAccessStats(pkg ? packageId : null);

    if (notFound) return <AccessNotFound />;
    if (!pkg) return null;

    const sessions = pkg.sessions || [];
    const inactive = pkg.isActive === false;
    const query = search.trim().toLowerCase();

    const visible = sessions.filter((session) => {
        if (!query) return true;
        const name = (session.name || '').toLowerCase();
        const domain = (faviconDomain(session.url) || '').toLowerCase();
        return name.includes(query) || domain.includes(query);
    });

    return (
        <>
            <section
                id="package-details"
                className="content-card access-state expanded"
                data-package-id={pkg.id}
            >
                <div className={`preset-access${inactive ? ' package-inactive' : ''}`}>
                    <AccessHeader pkg={pkg} sessions={sessions} joinedAt={joinedAt} />

                    {inactive && (
                        <div className="inactive-alert-note">
                            <div className="inactive-alert-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 9v4" />
                                    <path d="M12 17h.01" />
                                </svg>
                            </div>
                            <span>
                                Este pacote está <strong>inativo</strong>. Você continua vendo as
                                sessões, mas não consegue conectar até que {pkg.owner?.name || 'o dono'} reative
                                o pacote.
                            </span>
                        </div>
                    )}

                    <div className="card-content">
                        {sessions.length === 0 ? (
                            <div className="sessions-panel-container empty-state">
                                <div className="preset-empty">
                                    <div className="sessions-panel">
                                        <p className="panel-title">Minhas sessões</p>
                                        <div className="nothing-here-container">
                                            <div className="nothing-here-content">
                                                <h3 className="nothing-here-title">Nada por aqui</h3>
                                                <p className="nothing-here-text">
                                                    Este pacote ainda não possui nenhuma sessão
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="sessions-panel-container content-state">
                                <div className="preset-content">
                                    <div className="sessions-panel">
                                        <div className="sessions-panel-head">
                                            <p className="panel-title">Minhas sessões</p>
                                            <div className="access-search">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="11" cy="11" r="8" />
                                                    <path d="m21 21-4.3-4.3" />
                                                </svg>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar sessões..."
                                                    autoComplete="off"
                                                    value={search}
                                                    onChange={(event) => setSearch(event.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="sessions-grid">
                                            {visible.map((session) => (
                                                <AccessSessionCard
                                                    key={session.id}
                                                    session={session}
                                                    packageId={pkg.id}
                                                    inactive={inactive}
                                                    onConnect={connect}
                                                />
                                            ))}
                                        </div>
                                        {visible.length === 0 && (
                                            <div className="sessions-search-empty">
                                                <div className="sessions-search-empty-title">Nenhuma sessão encontrada</div>
                                                <div className="sessions-search-empty-text">Tente outro termo de busca.</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {gate}
        </>
    );
}

/** Identidade do pacote e nada além dela: o membro não administra nada aqui. */
function AccessHeader({ pkg, sessions, joinedAt }) {
    const owner = pkg.owner || {};
    const count = sessions.length;
    const rest = count - IDENTITY_ICONS;

    return (
        <div className="package-info-header">
            <h1 className="ph-title">{pkg.name}</h1>
            <div className="ph-meta">
                <span className="ph-meta-item">{count} {count === 1 ? 'sessão' : 'sessões'}</span>
                <span className="ph-meta-sep" aria-hidden="true">·</span>
                <span className="ph-meta-item ph-shared-by">
                    Compartilhado por{' '}
                    <span className="ph-shared-who">
                        <PersonAvatar name={owner.name} picture={owner.picture} className="ph-shared-avatar" />
                        <strong>{owner.name || '—'}</strong>
                    </span>
                </span>
                <span className="ph-meta-sep" aria-hidden="true">·</span>
                <span className="ph-meta-item">
                    Entrou em <strong className="joined-at-value">
                        {joinedAt
                            ? new Date(joinedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
                            : '—'}
                    </strong>
                </span>
            </div>
            <div className="ph-identity">
                {/* z-index decrescente: o primeiro ícone fica por cima da pilha. */}
                {sessions.slice(0, IDENTITY_ICONS).map((session, index) => (
                    <ServiceIcon
                        key={session.id}
                        className="ph-identity-icon"
                        icon={session.icon}
                        url={session.url}
                        name={session.name}
                        style={{ zIndex: sessions.length - index }}
                    />
                ))}
                {rest > 0 && <span className="ph-identity-rest">+{rest}</span>}
            </div>
        </div>
    );
}

function AccessNotFound() {
    return (
        <div className="nothing-here-container">
            <div className="nothing-here-content">
                <h3 className="nothing-here-title">Acesso não encontrado</h3>
                <p className="nothing-here-text">
                    O acesso pode ter sido encerrado, ou o link aponta para um pacote que não é seu.
                </p>
                <Link className="btn btn-primary" to="/shared" style={{ marginTop: 16 }}>
                    Voltar para meus acessos
                </Link>
            </div>
        </div>
    );
}
