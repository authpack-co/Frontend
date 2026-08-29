import ServiceIcon from '../../../components/ServiceIcon.jsx';
import { CATALOG, CATEGORIES, keyOf, POPULAR_NAMES } from './catalog.js';

/**
 * Fase de seleção do "Adicionar sessão".
 *
 * As classes são as mesmas do painel antigo (as-popular-card, as-service,
 * as-dropdown-item, as-selected-chip): é por elas que o CSS do modal existe.
 */
export default function SelectServices({
    search, onSearch, suggestions, selected, isSelected, onToggle, viewAll, onViewAll,
}) {
    const popular = POPULAR_NAMES
        .map((name) => CATALOG.find((service) => service.name === name))
        .filter(Boolean);

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

                {search.trim() && (
                    <div className="as-search-dropdown">
                        <ul className="as-dropdown-list">
                            {suggestions.length === 0 ? (
                                <li style={{ padding: 12, textAlign: 'center', color: 'var(--ap-text-secondary)', fontSize: 13 }}>
                                    Nenhum serviço encontrado.
                                </li>
                            ) : suggestions.map((service) => {
                                const already = isSelected(service);

                                return (
                                    <li
                                        className={`as-dropdown-item${already ? ' is-selected' : ''}`}
                                        key={keyOf(service.url)}
                                        onClick={() => {
                                            if (already) return;
                                            onToggle(service);
                                            onSearch('');
                                        }}
                                    >
                                        <ServiceIcon className="as-dropdown-icon" url={service.url} name={service.name} />
                                        <span className="as-dropdown-name">{service.name}</span>
                                        <button className="as-dropdown-btn" type="button">
                                            {already ? 'Adicionado' : 'Adicionar'}
                                        </button>
                                    </li>
                                );
                            })}
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
                    <div className="as-selected-grid">
                        {selected.map((service) => (
                            <div className="as-selected-chip" key={keyOf(service.url)}>
                                <ServiceIcon className="as-selected-chip-icon" url={service.url} name={service.name} />
                                <span className="as-selected-chip-name">{service.name}</span>
                                <span
                                    className="as-selected-chip-remove"
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Remover ${service.name}`}
                                    onClick={() => onToggle(service)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') onToggle(service);
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 6 6 18" />
                                        <path d="m6 6 12 12" />
                                    </svg>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewAll ? (
                <div className="as-view-all-sections">
                    {CATEGORIES.map((category) => {
                        const services = CATALOG.filter((service) => service.cat === category.id);
                        if (services.length === 0) return null;

                        return (
                            <div key={category.id}>
                                <p className="as-section-label">{category.label}</p>
                                <div className="as-services custom-scrollbar">
                                    {services.map((service) => (
                                        <button
                                            type="button"
                                            className={`as-service${isSelected(service) ? ' is-selected' : ''}`}
                                            key={keyOf(service.url)}
                                            onClick={() => onToggle(service)}
                                        >
                                            <ServiceIcon className="as-service-icon" url={service.url} name={service.name} />
                                            <span className="as-service-name">{service.name}</span>
                                            <span className="as-service-check">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 6 9 17l-5-5"></path>
                                                </svg>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="as-view-popular">
                    <div className="as-divider"><span>Serviços populares</span></div>

                    <div className="as-popular-grid">
                        {popular.map((service) => (
                            <div
                                className={`as-popular-card${isSelected(service) ? ' is-selected' : ''}`}
                                key={keyOf(service.url)}
                                role="button"
                                tabIndex={0}
                                onClick={() => onToggle(service)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onToggle(service);
                                    }
                                }}
                            >
                                <ServiceIcon className="as-service-icon" url={service.url} name={service.name} />
                                <span className="as-service-name">{service.name}</span>
                            </div>
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
