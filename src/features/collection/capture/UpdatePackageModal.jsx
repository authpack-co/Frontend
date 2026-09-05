import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ExtensionRequiredModal from '../../../components/ExtensionRequiredModal.jsx';
import ServiceIcon, { faviconDomain } from '../../../components/ServiceIcon.jsx';
import useModalTransition from '../../../components/useModalTransition.js';
import { isExtensionInstalled } from '../../../lib/extension.js';
import { usePackages } from '../../../lib/packages.jsx';
import CaptureProgress, { progressFooterStatus } from './CaptureProgress.jsx';
import useCapture from './useCapture.js';

/** Nome legível de uma sessão — cai no host quando ela não tem nome. */
function sessionLabel(session) {
    return session.name || faviconDomain(session.url) || session.url || '';
}

/**
 * Atualizar o pacote: recaptura várias sessões de uma vez.
 *
 * Mesmo motor do "Adicionar sessão" e da recaptura de uma sessão só; o que
 * muda é a primeira fase, que aqui é escolher quais das sessões que já existem
 * entram no lote. Todas vêm marcadas: atualizar o pacote inteiro é o caso
 * comum, e desmarcar é a exceção.
 */
export default function UpdatePackageModal({ pkg, onClose }) {
    const { reload } = usePackages();

    const sessions = useMemo(
        () => (pkg.sessions || []).filter((session) => session && session.id && session.url),
        [pkg]
    );

    const [selected, setSelected] = useState(() => new Set(sessions.map((s) => String(s.id))));
    const [gateOpen, setGateOpen] = useState(false);

    const capture = useCapture({ packageId: pkg.id, mode: 'update', onFinished: reload });

    const { visible, overlayRef, requestClose } = useModalTransition(true, onClose);

    function toggle(id) {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleAll() {
        setSelected((current) => (current.size === sessions.length
            ? new Set()
            : new Set(sessions.map((s) => String(s.id)))));
    }

    function handleConfirm() {
        if (selected.size === 0) return;

        // Sem extensão não há captura: é ela quem abre as abas e lê a sessão.
        if (!isExtensionInstalled()) {
            setGateOpen(true);
            return;
        }

        // O ref é o id, nunca a URL: duas contas do mesmo serviço no mesmo
        // pacote compartilham a URL e se cruzariam no progresso.
        capture.start(sessions
            .filter((session) => selected.has(String(session.id)))
            .map((session) => ({
                ref: String(session.id),
                id: session.id,
                name: sessionLabel(session),
                url: session.url,
                icon: session.icon,
            })));
    }

    return createPortal(
        <div
            ref={overlayRef}
            className={`modal-overlay${visible ? ' show' : ''}`}
            id="addSessionModal"
            data-mode="update"
            data-phase={capture.started ? 'progress' : 'select'}
            data-result={capture.result || undefined}
            onClick={(event) => {
                event.stopPropagation();
                // Durante a captura o clique fora não fecha: as abas estão
                // abrindo, e sair no meio deixa o lote órfão.
                if (!capture.started && event.target === event.currentTarget) requestClose();
            }}
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
                            <h2 className="modal-title">Atualizar sessões</h2>
                            <div className="share-head-meta">
                                <span className="share-pkg-name as-pkg-name">{pkg.name}</span>
                            </div>
                        </div>
                    </div>
                    {!capture.started && (
                        <button className="close-btn" type="button" aria-label="Fechar" onClick={requestClose}>×</button>
                    )}
                </div>

                {capture.started ? (
                    <CaptureProgress
                        mode="update"
                        rows={capture.rows}
                        batchDone={capture.batchDone}
                        summary={capture.summary}
                        onRetry={capture.retry}
                    />
                ) : (
                    <div className="modal-body as-update-body">
                        <div className="as-hero-texts">
                            <h3>Quais sessões você quer atualizar?</h3>
                            <p>
                                As abas abrem e fecham sozinhas — cada serviço é recapturado no
                                estado em que está agora no seu navegador.
                            </p>
                        </div>

                        <div className="us-toolbar">
                            <span className="us-count">
                                {selected.size} de {sessions.length} selecionada
                                {sessions.length === 1 ? '' : 's'}
                            </span>
                            <button type="button" className="us-toggle-all" onClick={toggleAll}>
                                {selected.size === sessions.length ? 'Desmarcar todas' : 'Selecionar todas'}
                            </button>
                        </div>

                        <ul className="us-list custom-scrollbar">
                            {sessions.map((session) => {
                                const id = String(session.id);
                                const isOn = selected.has(id);

                                return (
                                    <li
                                        key={id}
                                        className={`us-item${isOn ? ' is-selected' : ''}`}
                                        role="checkbox"
                                        aria-checked={isOn}
                                        tabIndex={0}
                                        onClick={() => toggle(id)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                toggle(id);
                                            }
                                        }}
                                    >
                                        <ServiceIcon
                                            className="us-item-icon"
                                            icon={session.icon}
                                            url={session.url}
                                            name={sessionLabel(session)}
                                        />
                                        <div className="us-item-info">
                                            <span className="us-item-name">{sessionLabel(session)}</span>
                                            <span className="us-item-host">
                                                {faviconDomain(session.url) || session.url}
                                            </span>
                                        </div>
                                        <span className="us-item-check">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20 6 9 17l-5-5" />
                                            </svg>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                <div className="modal-footer as-footer">
                    {capture.started
                        ? <ProgressFooter capture={capture} onClose={requestClose} />
                        : (
                            <SelectFooter
                                count={selected.size}
                                onCancel={requestClose}
                                onConfirm={handleConfirm}
                            />
                        )}
                </div>
            </div>

            <ExtensionRequiredModal
                open={gateOpen}
                onClose={() => setGateOpen(false)}
                onReady={() => { setGateOpen(false); handleConfirm(); }}
            />
        </div>,
        document.body
    );
}

function SelectFooter({ count, onCancel, onConfirm }) {
    return (
        <>
            <div className={`as-footer-status-wrapper${count > 0 ? ' is-active' : ''}`}>
                <span className="as-footer-status-text">
                    {count === 0
                        ? 'Nenhuma sessão selecionada'
                        : `${count} ${count === 1 ? 'sessão será atualizada' : 'sessões serão atualizadas'}`}
                </span>
            </div>
            <div className="as-footer-actions">
                <button className="btn btn-secondary as-cancel" type="button" onClick={onCancel}>
                    Cancelar
                </button>
                <button
                    className="btn btn-primary as-confirm"
                    type="button"
                    disabled={count === 0}
                    onClick={onConfirm}
                >
                    Atualizar
                </button>
            </div>
        </>
    );
}

function ProgressFooter({ capture, onClose }) {
    const status = progressFooterStatus({
        mode: 'update',
        batchDone: capture.batchDone,
        summary: capture.summary,
    });

    return (
        <>
            <div className={`as-footer-status-wrapper${status.kind === 'ok' ? ' is-active' : ''}`}>
                <span className="as-footer-status-icon">
                    {status.kind === 'running' && <span className="spinner"></span>}
                    {status.kind === 'ok' && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                        </svg>
                    )}
                    {status.kind === 'alert' && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" x2="12" y1="8" y2="12" />
                            <line x1="12" x2="12.01" y1="16" y2="16" />
                        </svg>
                    )}
                </span>
                <span className="as-footer-status-text">{status.text}</span>
            </div>
            <div className="as-footer-actions">
                {/* Fechar só depois que o lote termina: sair no meio deixaria
                    abas abrindo sem ninguém acompanhando o resultado. */}
                <button
                    className="btn btn-secondary as-close"
                    type="button"
                    disabled={!capture.batchDone}
                    onClick={onClose}
                >
                    Fechar
                </button>
            </div>
        </>
    );
}
