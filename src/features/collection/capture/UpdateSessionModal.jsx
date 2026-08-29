import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePackages } from '../../../lib/packages.jsx';
import CaptureProgress, { progressFooterStatus } from './CaptureProgress.jsx';
import useCapture from './useCapture.js';

/**
 * Recaptura uma sessão: abre o serviço numa aba, espera assentar e sobrescreve
 * a sessão guardada.
 *
 * Mesmo motor do "Adicionar sessão", só que sem fase de seleção — o alvo já é
 * conhecido, então entra direto no progresso. O ref aqui é o id da sessão, e
 * nunca a URL: duas contas do mesmo serviço no mesmo pacote compartilham a URL
 * e se cruzariam.
 */
export default function UpdateSessionModal({ pkg, session, onClose }) {
    const { reload } = usePackages();
    const capture = useCapture({ packageId: pkg.id, mode: 'update', onFinished: reload });

    // Disparo idempotente: em desenvolvimento o StrictMode monta o efeito duas
    // vezes, e sem esta trava a extensão abriria duas abas do mesmo serviço.
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        capture.start([{
            ref: String(session.id),
            id: session.id,
            name: session.name,
            url: session.url,
            icon: session.icon,
        }]);
        // Uma vez só, na abertura: começar de novo a cada render reabriria abas.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const status = progressFooterStatus({
        mode: 'update',
        batchDone: capture.batchDone,
        summary: capture.summary,
    });

    return createPortal(
        <div
            className="modal-overlay show"
            id="addSessionModal"
            data-mode="update"
            data-phase="progress"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
        >
            <div className="modal as-modal" role="dialog" aria-modal="true">
                <div className="modal-header">
                    <div className="up-head">
                        <span className="up-head-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                <path d="M8 16H3v5" />
                            </svg>
                        </span>
                        <div className="up-head-text">
                            <h2 className="modal-title">Atualizar sessão</h2>
                            <div className="share-head-meta">
                                <span className="share-pkg-name as-pkg-name">{pkg.name}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <CaptureProgress
                    mode="update"
                    rows={capture.rows}
                    batchDone={capture.batchDone}
                    summary={capture.summary}
                    onRetry={capture.retry}
                />

                <div className="modal-footer as-footer">
                    <div className={`as-footer-status-wrapper${status.kind === 'ok' ? ' is-active' : ''}`}>
                        <span className="as-footer-status-icon">
                            {status.kind === 'running' && <span className="spinner"></span>}
                        </span>
                        <span className="as-footer-status-text">{status.text}</span>
                    </div>
                    <div className="as-footer-actions">
                        <button
                            className="btn btn-secondary as-close"
                            type="button"
                            disabled={!capture.batchDone}
                            onClick={onClose}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
