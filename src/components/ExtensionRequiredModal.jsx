import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useModalTransition from './useModalTransition.js';
import { isExtensionInstalled, WEBSTORE_URL } from '../lib/extension.js';
import { GoogleIcon } from './BrandIcons.jsx';

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

    const { mounted, visible, overlayRef, requestClose } = useModalTransition(open, onClose);

    useEffect(() => {
        if (!mounted) return undefined;
        const onKeyDown = (event) => { if (event.key === 'Escape') requestClose(); };
        // Captura: o overlay abaixo barra a propagação do keydown.
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [mounted, requestClose]);

    if (!mounted) return null;

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

    // Pelo portal: aberto de dentro de uma lista clicável, o clique dele
    // subiria para a linha.
    return createPortal(
        <div
            ref={overlayRef}
            className={`modal-overlay${visible ? ' show' : ''}`}
            onClick={(event) => {
                // O React propaga pela árvore de componentes mesmo com portal:
                // sem parar aqui, o clique volta para a linha que abriu isto.
                event.stopPropagation();
                if (event.target === event.currentTarget) requestClose();
            }}
            onKeyDown={(event) => event.stopPropagation()}
        >
            <div className="modal ext-card" role="dialog" aria-modal="true" aria-label="Extensão necessária">
                <button className="ext-card-close" type="button" aria-label="Fechar" onClick={requestClose}>
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
                            trabalho é a extensão do Niango.
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
                        <GoogleIcon size={16} />
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
        </div>,
        document.body
    );
}
