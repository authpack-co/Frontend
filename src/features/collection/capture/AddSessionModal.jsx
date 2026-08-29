import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router';
import ServiceIcon from '../../../components/ServiceIcon.jsx';
import { isExtensionInstalled } from '../../../lib/extension.js';
import ExtensionRequiredModal from '../../../components/ExtensionRequiredModal.jsx';
import { usePackage, usePackages } from '../../../lib/packages.jsx';
import { CATALOG, CATEGORIES, keyOf, normalizeServiceInput, POPULAR_COUNT } from './catalog.js';
import CaptureProgress, { progressFooterStatus } from './CaptureProgress.jsx';
import useCapture from './useCapture.js';

/**
 * Adicionar sessões ao pacote.
 *
 * Duas fases: escolher os serviços e acompanhar a captura. Quem captura é a
 * extensão — ela abre cada serviço numa aba, espera assentar e devolve a
 * sessão. Por isso a tela exige extensão antes de qualquer coisa.
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

    const close = () => navigate(`/collection/${packageId}`);

    const suggestions = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return [];

        const matches = CATALOG.filter((service) => service.name.toLowerCase().includes(query)
            || service.url.toLowerCase().includes(query));

        // Uma URL colada que não está no catálogo vira a primeira opção.
        const custom = normalizeServiceInput(search);
        if (custom && !CATALOG.some((service) => keyOf(service.url) === keyOf(custom.url))) {
            return [{ ...custom, custom: true }, ...matches];
        }

        return matches;
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

    const footer = capture.started
        ? <ProgressFooter capture={capture} onClose={close} />
        : <SelectFooter count={selected.length} onCancel={close} onConfirm={handleConfirm} />;

    return createPortal(
        <div
            className="modal-overlay show"
            onClick={(event) => {
                event.stopPropagation();
                // Durante a captura o clique fora não fecha: as abas estão
                // abrindo, e sair no meio deixa o lote órfão.
                if (!capture.started && event.target === event.currentTarget) close();
            }}
            onKeyDown={(event) => event.stopPropagation()}
        >
            <div className="modal as-modal" role="dialog" aria-modal="true">
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
                    <SelectPhase
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

                <div className="modal-footer as-footer">{footer}</div>
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

function SelectPhase({ search, onSearch, suggestions, selected, isSelected, onToggle, viewAll, onViewAll }) {
    const popular = CATALOG.slice(0, POPULAR_COUNT);

    return (
        <div className="modal-body as-select-body">
            <div className="as-hero-texts">
                <h3>Qual serviço você quer adicionar?</h3>
                <p>Busque pelo nome do serviço ou cole a URL para começar.</p>
            </div>

            <div className="as-search-container">
                <div className="as-search-row">
                    <span className="as-search-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.3-4.3"></path>
                        </svg>
                    </span>
                    <input
                        type="text"
                        className="form-input as-search"
                        placeholder="Buscar serviço ou colar URL (ex.: https://app.exemplo.com)…"
                        autoComplete="off"
                        value={search}
                        onChange={(event) => onSearch(event.target.value)}
                    />
                </div>

                {suggestions.length > 0 && (
                    <div className="as-search-dropdown">
                        <ul className="as-dropdown-list">
                            {suggestions.map((service) => (
                                <li key={keyOf(service.url)}>
                                    <button
                                        type="button"
                                        onClick={() => { onToggle(service); onSearch(''); }}
                                    >
                                        <ServiceIcon url={service.url} name={service.name} />
                                        <span>{service.name}</span>
                                        {service.custom && <em>URL personalizada</em>}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <p className="as-search-hint">
                    <svg className="as-search-hint-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                    </svg>
                    Esteja logado no serviço para funcionar corretamente.
                </p>
            </div>

            {selected.length > 0 && (
                <div className="as-selected-section">
                    {selected.map((service) => (
                        <span className="as-chip" key={keyOf(service.url)}>
                            <ServiceIcon url={service.url} name={service.name} />
                            <span>{service.name}</span>
                            <button
                                type="button"
                                aria-label={`Remover ${service.name}`}
                                onClick={() => onToggle(service)}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {viewAll ? (
                <div className="as-view-all-sections">
                    {CATEGORIES.map((category) => (
                        <section key={category.id}>
                            <div className="as-divider"><span>{category.label}</span></div>
                            <div className="as-popular-grid">
                                {CATALOG.filter((service) => service.cat === category.id).map((service) => (
                                    <ServiceCard
                                        key={keyOf(service.url)}
                                        service={service}
                                        selected={isSelected(service)}
                                        onToggle={onToggle}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            ) : (
                <div className="as-view-popular">
                    <div className="as-divider"><span>Serviços populares</span></div>
                    <div className="as-popular-grid">
                        {popular.map((service) => (
                            <ServiceCard
                                key={keyOf(service.url)}
                                service={service}
                                selected={isSelected(service)}
                                onToggle={onToggle}
                            />
                        ))}
                    </div>
                    <div className="as-view-all-wrapper">
                        <button className="btn btn-outline as-view-all-btn" type="button" onClick={onViewAll}>
                            Ver todos os serviços &rarr;
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ServiceCard({ service, selected, onToggle }) {
    return (
        <button
            type="button"
            className={`as-service-card${selected ? ' is-selected' : ''}`}
            onClick={() => onToggle(service)}
            aria-pressed={selected}
        >
            <ServiceIcon url={service.url} name={service.name} />
            <span>{service.name}</span>
        </button>
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
