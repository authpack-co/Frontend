import { Navigate } from 'react-router';
import { usePackages } from '../../lib/packages.jsx';
import useActivateAccess from './useActivateAccess.js';

/**
 * /shared sem pacote escolhido: abre o primeiro acesso, ou mostra a porta de
 * entrada para quem ainda não recebeu nenhum.
 */
export default function SharedPage() {
    const { status, access } = usePackages();

    if (status === 'loading') return null;
    if (access.length > 0) return <Navigate to={`/shared/${access[0].id}`} replace />;

    return <EmptyAccess />;
}

function EmptyAccess() {
    const { key, changeKey, error, sending, activate } = useActivateAccess();

    return (
        <div className="main-onboarding" id="main-onboarding">
            <div className="empty-screen" data-empty="access">
                <div className="empty-screen-visual">
                    <div className="empty-screen-mock" aria-hidden="true">
                        <div className="empty-screen-mock-head">
                            <span className="empty-screen-mock-logo"></span>
                            <div className="empty-screen-mock-lines">
                                <span className="empty-screen-mock-line" style={{ width: '55%' }}></span>
                                <span className="empty-screen-mock-line is-faint" style={{ width: '34%' }}></span>
                            </div>
                        </div>
                        <div className="empty-screen-mock-rows">
                            <span className="empty-screen-mock-row"></span>
                            <span className="empty-screen-mock-row"></span>
                            <span className="empty-screen-mock-row is-faint"></span>
                        </div>
                    </div>
                    <span className="empty-screen-badge empty-screen-badge--key" aria-hidden="true">
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="7.5" cy="15.5" r="5.5" />
                            <path d="m21 2-9.6 9.6" />
                            <path d="m15.5 7.5 3 3L22 7l-3-3" />
                        </svg>
                    </span>
                </div>

                <h2 className="empty-screen-title">Seus acessos aparecem aqui</h2>
                <p className="empty-screen-desc">
                    Recebeu uma chave de acesso? Ative-a para desbloquear as sessões que
                    compartilharam com você.
                </p>

                <div className="activation-input empty-screen-activate">
                    <div>
                        <input
                            type="text"
                            placeholder="Cole sua chave de acesso"
                            value={key}
                            onChange={(event) => changeKey(event.target.value)}
                            onKeyDown={(event) => { if (event.key === 'Enter') activate(); }}
                        />
                        <button
                            className="btn btn-primary activate-access-btn confirm-btn"
                            type="button"
                            onClick={activate}
                            disabled={sending}
                        >
                            {sending ? <div className="spinner"></div> : 'Ativar acesso'}
                        </button>
                    </div>
                    {error && <span className="error-message">{error}</span>}
                </div>
            </div>
        </div>
    );
}
