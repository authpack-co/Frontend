import { useState } from 'react';
import { Navigate } from 'react-router';
import { useNotify } from '../../components/Notifications.jsx';
import { api, ApiError } from '../../lib/api.js';
import { usePackages } from '../../lib/packages.jsx';

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

// A chave é um UUID v4 — validar aqui evita uma ida ao servidor para um
// código obviamente colado errado.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function EmptyAccess() {
    const notify = useNotify();
    const { reload } = usePackages();

    const [key, setKey] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);

    async function handleActivate() {
        const trimmed = key.trim();

        if (!trimmed) return setError('A chave não pode estar vazia.');
        if (!UUID_V4.test(trimmed)) return setError('Chave inválida.');
        if (sending) return undefined;

        setError('');
        setSending(true);

        try {
            const data = await api.usePackageKey(trimmed) || {};
            const packageName = data.package?.name || 'pacote';
            const ownerName = data.owner?.name || 'o dono';

            // O pacote não entra em "Meus acessos" agora — só quando o dono
            // aprovar. Por isso a mensagem fala de espera, não de acesso pronto.
            notify('success', data.alreadyPending
                ? `Seu pedido para "${packageName}" continua com ${ownerName}.`
                : `Pedido enviado. ${ownerName} precisa aprovar para você usar "${packageName}".`);

            setKey('');
            reload();
        } catch (err) {
            notify('error', err instanceof ApiError
                ? err.message
                : 'Não foi possível solicitar o acesso.');
        } finally {
            setSending(false);
        }

        return undefined;
    }

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
                            onChange={(event) => { setKey(event.target.value); setError(''); }}
                            onKeyDown={(event) => { if (event.key === 'Enter') handleActivate(); }}
                        />
                        <button
                            className="btn btn-primary activate-access-btn confirm-btn"
                            type="button"
                            onClick={handleActivate}
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
