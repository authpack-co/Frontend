import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Modal, { FormNote } from '../../components/Modal.jsx';
import { useNotify } from '../../components/Notifications.jsx';
import { api } from '../../lib/api.js';
import { usePackage, usePackages } from '../../lib/packages.jsx';

/** Link de convite: a chave é o próprio endereço. */
function inviteUrl(key) {
    if (!key) return '';
    return `${window.location.origin}/invite/${encodeURIComponent(key)}`;
}

/**
 * Compartilhar um pacote: uma ação só, copiar o link.
 *
 * Quem recebe não entra — pede acesso, e o dono decide na aba de solicitações.
 * Por isso aqui não há lista nem estado.
 */
export default function ShareModal() {
    const { packageId } = useParams();
    const { pkg } = usePackage(packageId);
    const { reload } = usePackages();
    const notify = useNotify();
    const navigate = useNavigate();

    const [copied, setCopied] = useState(null);
    const [rotating, setRotating] = useState(false);
    const [spins, setSpins] = useState(0);

    useEffect(() => {
        if (!copied) return undefined;
        const timer = setTimeout(() => setCopied(null), 1500);
        return () => clearTimeout(timer);
    }, [copied]);

    if (!pkg) return null;

    const close = () => navigate(`/collection/${packageId}`);
    const url = inviteUrl(pkg.key);

    async function copy(value, which, errorMessage) {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(which);
        } catch (err) {
            console.error('[Share] copy error:', err);
            notify('error', errorMessage);
        }
    }

    async function handleRotate() {
        if (rotating) return;

        // A volta completa da seta é o retorno visual da troca.
        setSpins((value) => value + 1);
        setRotating(true);

        try {
            await api.renewPackageKey(pkg.id);
            await reload();
            notify('success', 'Link novo gerado. O anterior parou de valer.');
        } catch (err) {
            console.error('[Share] rotate key error:', err);
            notify('error', 'Não foi possível gerar um link novo.');
        } finally {
            setRotating(false);
        }
    }

    return (
        <Modal
            open
            onClose={close}
            title="Compartilhar pacote"
            id="sharePackageModal"
            className="share-modal"
            bodyClassName="share-body"
            footerClassName="share-footer"
            footer={(
                <>
                    <span className="share-code-label">Ou use o código</span>
                    <button
                        className="share-code"
                        type="button"
                        title="Copiar código"
                        onClick={() => copy(pkg.key, 'code', 'Não foi possível copiar o código.')}
                    >
                        {copied === 'code' ? 'Copiado!' : (pkg.key || '—')}
                    </button>
                </>
            )}
        >
        <div className="share-field">
                <span className="share-field-label">Link do pacote</span>

                <div className="share-link-row">
                    <span className="share-link-url" title={url}>{url || '—'}</span>
                    <button
                        className="btn btn-primary share-copy-btn"
                        type="button"
                        onClick={() => copy(url, 'link', 'Não foi possível copiar o link.')}
                    >
                        {copied === 'link' ? 'Copiado!' : 'Copiar'}
                    </button>
                    {/* Trocar a chave derruba link e código anteriores de uma
                        vez. Quem já entrou não é afetado — a chave só serve
                        para pedir acesso. */}
                    <button
                        className="share-rotate-btn"
                        type="button"
                        title="Gerar um link novo e derrubar o anterior"
                        aria-label="Gerar link novo"
                        onClick={handleRotate}
                        disabled={rotating}
                    >
                        <svg
                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transform: `rotate(${spins * 360}deg)`, transition: 'transform 0.6s ease' }}
                        >
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                            <path d="M21 3v5h-5" />
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                            <path d="M8 16H3v5" />
                        </svg>
                    </button>
                </div>

                <FormNote>
                    Compartilhe com quem precisa entrar. Você aprova cada pedido.
                </FormNote>
            </div>
        </Modal>
    );
}
