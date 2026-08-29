import { useEffect, useState } from 'react';
import { isExtensionInstalled, WEBSTORE_URL } from '../lib/extension.js';

/**
 * Portão de conectar: sem a extensão instalada neste navegador não há como
 * abrir uma sessão, porque quem escreve os cookies na aba é ela.
 *
 * "Já instalei" reconfere na hora — instalar não recarrega a página, então
 * sem esse botão a pessoa ficaria olhando para um card que já não vale.
 */
export default function ExtensionRequiredModal({ open, onClose, onReady }) {
    const [checking, setChecking] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!open) { setFailed(false); setChecking(false); }
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    function handleRecheck() {
        setChecking(true);
        setFailed(false);

        // Um instante de espera para a extensão recém-instalada marcar a
        // página; sem isso o "Já instalei" responde antes dela.
        setTimeout(() => {
            setChecking(false);
            if (isExtensionInstalled()) onReady();
            else setFailed(true);
        }, 400);
    }

    return (
        <div
            className="modal-overlay show"
            onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
            <div className="modal ext-card" role="dialog" aria-modal="true" aria-label="Extensão necessária">
                <button className="ext-card-close" type="button" aria-label="Fechar" onClick={onClose}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18" />
                        <path d="M6 6l12 12" />
                    </svg>
                </button>

                <div className="ext-card-head">
                    <div className="ext-card-badge ext-card-badge--accent">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15.5 3.5a2.5 2.5 0 0 0-5 0V6H7a1 1 0 0 0-1 1v3.5H3.5a2.5 2.5 0 0 0 0 5H6V19a1 1 0 0 0 1 1h3.5v-2.5a2.5 2.5 0 0 1 5 0V20H19a1 1 0 0 0 1-1v-3.5h-2.5a2.5 2.5 0 0 1 0-5H20V7a1 1 0 0 0-1-1h-3.5Z" />
                        </svg>
                    </div>
                    <div className="ext-card-heading">
                        <h3 className="ext-card-title">Extensão necessária</h3>
                        <p className="ext-card-subtitle">
                            Conectar a uma sessão acontece dentro do navegador — quem faz esse
                            trabalho é a extensão do AuthPack.
                        </p>
                    </div>
                </div>

                <ol className="ext-steps">
                    <li className="ext-step">
                        <span className="ext-step-num">1</span>
                        <div className="ext-step-text">
                            <strong>Instale a extensão</strong>
                            <span>Leva alguns segundos na Chrome Web Store.</span>
                        </div>
                    </li>
                    <li className="ext-step">
                        <span className="ext-step-num">2</span>
                        <div className="ext-step-text">
                            <strong>Confirme sua conta</strong>
                            <span>A ativação abre sozinha logo após a instalação.</span>
                        </div>
                    </li>
                    <li className="ext-step">
                        <span className="ext-step-num">3</span>
                        <div className="ext-step-text">
                            <strong>Volte e conecte</strong>
                            <span>Suas sessões passam a abrir com um clique.</span>
                        </div>
                    </li>
                </ol>

                <div className="ext-card-foot">
                    <button
                        type="button"
                        className={`ext-btn ext-btn--ghost${checking ? ' is-loading' : ''}`}
                        onClick={handleRecheck}
                        disabled={checking}
                    >
                        <span className="ext-btn-label">Já instalei</span>
                        <span className="ext-btn-spinner"><span className="spinner"></span></span>
                    </button>
                    <a className="ext-btn ext-btn--primary" href={WEBSTORE_URL}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Instalar extensão
                    </a>
                </div>

                {failed && (
                    <p className="ext-card-note">
                        Ainda não detectamos a extensão neste navegador. Se você acabou de
                        instalar, recarregue a página.
                    </p>
                )}
            </div>
        </div>
    );
}
