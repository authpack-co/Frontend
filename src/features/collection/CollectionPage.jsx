import { useState } from 'react';
import { Navigate } from 'react-router';
import { usePackages } from '../../lib/packages.jsx';
import { CreatePackageModal } from './PackageModals.jsx';

/**
 * /collection sem pacote escolhido.
 *
 * Com pacotes, abre o primeiro — é o que o painel antigo fazia no boot, e
 * agora isso vira uma URL de verdade em vez de um estado invisível.
 */
export default function CollectionPage() {
    const { status, collection } = usePackages();

    if (status === 'loading') return null;

    if (collection.length > 0) {
        return <Navigate to={`/collection/${collection[0].id}`} replace />;
    }

    return <EmptyCollection />;
}

function EmptyCollection() {
    const [creating, setCreating] = useState(false);

    return (
        <div className="main-onboarding" id="main-onboarding">
            <div className="empty-screen" data-empty="collection">
                <div className="empty-screen-visual">
                    <div className="empty-screen-mock" aria-hidden="true">
                        <div className="empty-screen-mock-head">
                            <span className="empty-screen-mock-logo"></span>
                            <div className="empty-screen-mock-lines">
                                <span className="empty-screen-mock-line" style={{ width: '60%' }}></span>
                                <span className="empty-screen-mock-line is-faint" style={{ width: '38%' }}></span>
                            </div>
                        </div>
                        <div className="empty-screen-mock-rows">
                            <span className="empty-screen-mock-row"></span>
                            <span className="empty-screen-mock-row"></span>
                            <span className="empty-screen-mock-row is-faint"></span>
                        </div>
                    </div>
                    <span className="empty-screen-badge" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                        </svg>
                    </span>
                </div>

                <h2 className="empty-screen-title">Seus pacotes aparecem aqui</h2>
                <p className="empty-screen-desc">
                    Crie um pacote para reunir suas sessões de login e compartilhar o acesso com
                    segurança — sem nunca revelar a senha.
                </p>

                <button className="btn btn-primary empty-screen-cta" type="button" onClick={() => setCreating(true)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                    </svg>
                    Criar meu primeiro pacote
                </button>
            </div>

            <CreatePackageModal open={creating} onClose={() => setCreating(false)} />
        </div>
    );
}
