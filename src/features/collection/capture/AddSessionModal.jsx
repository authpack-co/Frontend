import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router';
import ExtensionRequiredModal from '../../../components/ExtensionRequiredModal.jsx';
import useAutoFocusField from '../../../components/useAutoFocusField.js';
import useModalTransition from '../../../components/useModalTransition.js';
import { isExtensionInstalled } from '../../../lib/extension.js';
import { usePackage, usePackages } from '../../../lib/packages.jsx';
import { CATALOG, keyOf, normalizeServiceInput } from './catalog.js';
import CaptureProgress, { progressFooterStatus } from './CaptureProgress.jsx';
import SelectServices from './SelectServices.jsx';
import useCapture from './useCapture.js';

/**
 * Adicionar sessões ao pacote.
 *
 * Duas fases: escolher os serviços e acompanhar a captura. Quem captura é a
 * extensão — ela abre cada serviço numa aba, espera assentar e devolve a
 * sessão. Por isso a tela exige extensão antes de qualquer coisa.
 *
 * O id e o data-phase não são decoração: o CSS deste modal é todo escopado em
 * #addSessionModal, e é o data-phase que decide qual corpo aparece.
 */
export default function AddSessionModal() {
    const { packageId } = useParams();
    const { pkg } = usePackage(packageId);
    const { reload } = usePackages();
    const navigate = useNavigate();

    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState('');
    const [viewAll, setViewAll] = useState(false);
    const [gateOpen, setGateOpen] = useState(false);

    const capture = useCapture({
        packageId,
        mode: 'create',
        // A lista de pacotes é quem sabe as sessões: sem recarregar, o pacote
        // continuaria mostrando a lista de antes da captura.
        onFinished: reload,
    });

    // Quem já estava no pacote quando o modal abriu. A lista é alfabética, e
    // uma sessão nova pode nascer no meio dela — comparar antes e depois é o
    // que diz qual foi, para a tela rolar até ela.
    const knownIds = useRef(null);
    const sessionsRef = useRef([]);
    sessionsRef.current = pkg?.sessions || [];

    useEffect(() => {
        if (pkg && !knownIds.current) {
            knownIds.current = new Set((pkg.sessions || []).map((session) => session.id));
        }
    }, [pkg]);

    const { visible, overlayRef, requestClose } = useModalTransition(true, () => {
        const known = knownIds.current || new Set();
        const added = sessionsRef.current
            .filter((session) => !known.has(session.id))
            .map((session) => session.id);

        navigate(`/collection/${packageId}`, {
            state: added.length ? { focusSessions: added } : null,
        });
    });
    const close = requestClose;
    // Este modal não usa a casca <Modal>, então pede o foco por conta: o
    // campo de busca é a primeira coisa que a pessoa vai usar aqui. O `pkg`
    // entra na conta porque sem ele o corpo do modal ainda nem existe.
    const boxRef = useAutoFocusField(visible && !!pkg);

    const suggestions = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return [];

        // Uma URL colada que não está no catálogo é a única opção — foi ela
        // que a pessoa digitou.
        const custom = normalizeServiceInput(search);
        if (custom && !CATALOG.some((service) => keyOf(service.url) === keyOf(custom.url))) {
            return [custom];
        }

        return CATALOG.filter((service) => service.name.toLowerCase().includes(query)
            || service.url.toLowerCase().includes(query));
    }, [search]);

    if (!pkg) return null;

    const isSelected = (service) => selected.some((item) => keyOf(item.url) === keyOf(service.url));

    function toggle(service) {
        setSelected((current) => (isSelected(service)
            ? current.filter((item) => keyOf(item.url) !== keyOf(service.url))
            : [...current, { name: service.name, url: service.url }]));
    }

    function handleConfirm() {
        if (selected.length === 0) return;

        // Sem extensão não há captura: é ela quem abre as abas e lê a sessão.
        if (!isExtensionInstalled()) {
            setGateOpen(true);
            return;
        }

        // O ref casa progresso com linha. Aqui é a URL normalizada, porque a
        // sessão ainda não existe e não tem id.
        capture.start(selected.map((service) => ({
            ref: keyOf(service.url),
            name: service.name,
            url: service.url,
        })));
    }

    return createPortal(
        <div
            ref={overlayRef}
            className={`modal-overlay${visible ? ' show' : ''}`}
            id="addSessionModal"
            data-mode="create"
            data-phase={capture.started ? 'progress' : 'select'}
            onClick={(event) => {
                event.stopPropagation();
                // Durante a captura o clique fora não fecha: as abas estão
                // abrindo, e sair no meio deixa o lote órfão.
                if (!capture.started && event.target === event.currentTarget) close();
            }}
            onKeyDown={(event) => event.stopPropagation()}
        >
            <div ref={boxRef} className="modal as-modal" role="dialog" aria-modal="true">
                <div className="modal-header">
                    <div className="up-head">
                        <span className="up-head-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14" />
                                <path d="M5 12h14" />
                            </svg>
                        </span>
                        <div className="up-head-text">
                            <h2 className="modal-title">Adicionar sessão</h2>
                            <div className="share-head-meta">
                                <span className="share-pkg-name as-pkg-name">{pkg.name}</span>
                            </div>
                        </div>
                    </div>
                    {!capture.started && (
                        <button className="close-btn" type="button" aria-label="Fechar" onClick={close}>×</button>
                    )}
                </div>

                {capture.started ? (
                    <CaptureProgress
                        mode="create"
                        rows={capture.rows}
                        batchDone={capture.batchDone}
                        summary={capture.summary}
                        onRetry={capture.retry}
                    />
                ) : (
                    <SelectServices
                        search={search}
                        onSearch={setSearch}
                        suggestions={suggestions}
                        selected={selected}
                        isSelected={isSelected}
                        onToggle={toggle}
                        viewAll={viewAll}
                        onViewAll={() => setViewAll(true)}
                    />
                )}

                <div className="modal-footer as-footer">
                    {capture.started
                        ? <ProgressFooter capture={capture} onClose={close} />
                        : <SelectFooter count={selected.length} onCancel={close} onConfirm={handleConfirm} />}
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
            <div className="as-footer-status-wrapper">
                <span className="as-footer-status-text">
                    {count === 0
                        ? 'Nenhum serviço adicionado'
                        : `${count} ${count === 1 ? 'serviço' : 'serviços'} para adicionar`}
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
                    Adicionar
                </button>
            </div>
        </>
    );
}

function ProgressFooter({ capture, onClose }) {
    const status = progressFooterStatus({
        mode: 'create',
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
