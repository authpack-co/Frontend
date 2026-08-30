import { Link } from 'react-router';

/**
 * Casca das telas de detalhe (sessão e pessoa).
 *
 * O "Voltar" era o gatilho de um translateX entre duas metades da mesma tela;
 * agora é um link para a rota do pacote — o botão do navegador faz a mesma
 * coisa, que é o ponto de tudo isto.
 */
export function DetailHeader({ pkg, subject, backTo }) {
    return (
        <div className="card-header">
            <div className="header-top">
                <h2>
                    <span className="header-title">{pkg.name}</span>
                    <span className="breadcrumb-sep" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m9 18 6-6-6-6" />
                        </svg>
                    </span>
                    <span className="header-subtitle">{subject}</span>
                </h2>
                <Link className="btn btn-small back-btn" to={backTo}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                    Voltar
                </Link>
            </div>
        </div>
    );
}

export function StatCard({ label, value, highlight = false }) {
    return (
        <div className="stat-card">
            <p className="stat-label">{label}</p>
            <div className="stat-value">
                <span className={highlight ? 'stat-highlight' : undefined}>{value}</span>
            </div>
        </div>
    );
}

/**
 * Histórico de uso. A coluna do meio muda de tela para tela — a sessão na
 * tela de uma pessoa, a pessoa na tela de uma sessão —, então quem monta o
 * crachá é quem chama.
 */
export function HistoryTable({ columnLabel, rows, renderSubject, loading }) {
    return (
        <div className="data-history">
            <h4 className="data-history-title">Histórico de uso</h4>
            <div className="data-table">
                <div className="table-header">
                    <div className="table-col">Data</div>
                    <div className="table-col">{columnLabel}</div>
                    <div className="table-col">Tempo</div>
                </div>

                <div className="table-body-presets-container">
                    <div className="table-body custom-scrollbar">
                        {loading && (
                            <div className="spinner-container" style={{ height: 120 }}>
                                <div className="spinner large"></div>
                            </div>
                        )}

                        {!loading && rows.length === 0 && (
                            <div className="nothing-here-container">
                                <div className="nothing-here-content">
                                    <h3 className="nothing-here-title">Nada por aqui</h3>
                                    <p className="nothing-here-text">Não há registro de uso nesse período</p>
                                </div>
                            </div>
                        )}

                        {!loading && rows.map((row, index) => (
                            <div className="table-row" key={`${row.id}-${index}`}>
                                <div className="table-col">{row.when}</div>
                                <div className="table-col">{renderSubject(row.subject)}</div>
                                <div className="table-col">{row.usage}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
