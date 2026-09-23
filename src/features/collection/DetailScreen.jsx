import { Link } from 'react-router';
import { UsageChartBody } from './UsagePanel.jsx';
import './detail.css';

const PERIOD_OPTIONS = [
    ['today', 'Hoje'],
    ['7days', '7 dias'],
    ['30days', '30 dias'],
];

/**
 * Estrutura das telas de detalhe da coleção (sessão e pessoa): as duas têm o
 * mesmo esqueleto, de cima para baixo —
 *
 *   1. barra: voltar, Pacote › Assunto, e o período, que recorta a tela toda
 *   2. identidade: ícone, nome, metadados e quem está usando agora
 *   3. um card com os números do período e o gráfico que os explica
 *   4. o histórico que soma aqueles números
 *
 * O período fica no topo, e não dentro do gráfico, porque ele manda também
 * nos números e no histórico: preso ao gráfico, parecia valer só para ele.
 */
export function DetailScreen({ children }) {
    return (
        <section className="dt-screen">
            <div className="dt-main">{children}</div>
        </section>
    );
}

export function DetailTopBar({ pkg, subject, backTo, period, onPeriodChange }) {
    return (
        <div className="dt-topbar">
            <nav className="dt-crumbs" aria-label="Caminho">
                <Link className="dt-back" to={backTo} title="Voltar para o pacote" aria-label="Voltar para o pacote">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </Link>
                <Link className="dt-crumb" to={backTo}>{pkg.name}</Link>
                <span className="dt-crumb-sep" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </span>
                <span className="dt-crumb is-current" aria-current="page">{subject}</span>
            </nav>

            <div className="dt-period" role="radiogroup" aria-label="Período">
                {PERIOD_OPTIONS.map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={period === value}
                        className={`dt-period-option${period === value ? ' is-active' : ''}`}
                        onClick={() => onPeriodChange(value)}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/** Nome, subtítulo e metadados, com o selo de "agora" à direita. */
export function DetailHero({ media, title, subtitle, meta, presence }) {
    const items = (meta || []).filter(Boolean);

    return (
        <div className="dt-hero">
            <div className="dt-hero-identity">
                {media}
                <div className="dt-hero-text">
                    <div>
                        <h1 className="dt-hero-title">{title}</h1>
                        {subtitle && <p className="dt-hero-subtitle">{subtitle}</p>}
                    </div>
                    {items.length > 0 && (
                        <div className="dt-hero-meta">
                            {items.map((item, index) => (
                                <span className="dt-hero-meta-item" key={index}>{item}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {presence}
        </div>
    );
}

export function CalendarIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M3 10h18" />
        </svg>
    );
}

export function RefreshIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
        </svg>
    );
}

/**
 * Selo de "agora" do cabeçalho. Com `onClick` vira botão — na sessão ele
 * abre quem está usando e desde quando.
 */
export function PresencePill({ active, leading, label, onClick, title }) {
    const content = (
        <>
            {leading}
            <span className={`dt-presence-dot${active ? ' is-active' : ''}`} aria-hidden="true"></span>
            <span className="dt-presence-label">{label}</span>
        </>
    );

    if (onClick) {
        return (
            <button type="button" className="dt-presence is-clickable" onClick={onClick} title={title}>
                {content}
            </button>
        );
    }
    return <div className="dt-presence" title={title}>{content}</div>;
}

/**
 * Os números do período em cima e o gráfico embaixo, no mesmo card: são a
 * mesma coisa vista de dois jeitos, o total e como ele se distribuiu.
 */
export function DetailUsageCard({ kpis, title, subtitle, status, period, dataFor, sessions }) {
    const ready = status === 'ready';

    return (
        <div className="dt-card dt-usage">
            <div className="dt-kpis">
                {kpis.map((kpi) => (
                    <div className="dt-kpi" key={kpi.label}>
                        <p className="dt-kpi-label">{kpi.label}</p>
                        <div className="dt-kpi-value">{ready && kpi.value != null ? kpi.value : '—'}</div>
                    </div>
                ))}
            </div>
            <div className="dt-chart-section">
                <div>
                    <h3 className="dt-chart-title">{title}</h3>
                    <p className="dt-chart-subtitle">{subtitle}</p>
                </div>
                <div className="dt-chart">
                    <UsageChartBody dataFor={dataFor} sessions={sessions} status={status} period={period} />
                </div>
            </div>
        </div>
    );
}

/**
 * Histórico de uso no período. A coluna do meio muda de tela para tela — a
 * pessoa na tela de uma sessão, a sessão na tela de uma pessoa —, então quem
 * monta o crachá é quem chama.
 *
 * Sem `renderSubject` ela some: na sessão recebida a pessoa e o serviço são
 * sempre os mesmos, e repetir isso linha a linha não informaria nada.
 */
export function DetailHistory({ columnLabel, rows, renderSubject, loading }) {
    const count = rows.length;
    const hasSubject = Boolean(renderSubject);

    return (
        <div className={`dt-card dt-history${hasSubject ? '' : ' is-compact'}`}>
            <div className="dt-history-header">
                <h4 className="dt-history-title">Histórico de uso</h4>
                {!loading && (
                    <span className="dt-history-count">
                        {count === 1 ? '1 registro no período' : `${count} registros no período`}
                    </span>
                )}
            </div>

            <div className="dt-history-row is-head">
                <div>Data</div>
                {hasSubject && <div>{columnLabel}</div>}
                <div className="dt-history-usage">Tempo</div>
            </div>

            <div className="dt-history-body custom-scrollbar">
                {loading && (
                    <div className="spinner-container" style={{ height: 120 }}>
                        <div className="spinner large"></div>
                    </div>
                )}

                {!loading && count === 0 && (
                    <div className="nothing-here-container">
                        <div className="nothing-here-content">
                            <h3 className="nothing-here-title">Nada por aqui</h3>
                            <p className="nothing-here-text">Não há registro de uso nesse período</p>
                        </div>
                    </div>
                )}

                {!loading && rows.map((row, index) => (
                    <div className="dt-history-row" key={`${row.id}-${index}`}>
                        <div className="dt-history-when">{row.when}</div>
                        {hasSubject && (
                            <div className="dt-history-subject">{renderSubject(row.subject)}</div>
                        )}
                        <div className="dt-history-usage">{row.usage}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
