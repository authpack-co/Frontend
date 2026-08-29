import UsageChart from './UsageChart.jsx';

export const PERIOD_DAYS = { today: 0, '7days': 7, '30days': 30 };

/**
 * Ponto neutro: um único registro zerado, para o gráfico nunca ficar sem
 * nenhum ponto. Um pacote pode ter histórico e mesmo assim não sobrar nada
 * depois do recorte de período.
 */
function emptyChartData(isDaily) {
    if (isDaily) {
        const hour = `${String(new Date().getHours()).padStart(2, '0')}:00`;
        return { [hour]: { hours: 0, users: 0 } };
    }
    const day = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return { [day]: { hours: 0, users: 0, peak: { hour: '00:00', count: 0 } } };
}

/**
 * Gráfico de uso com seletor de período — o mesmo nas três telas (pacote,
 * sessão e pessoa). Só muda o título e de onde os dados saem.
 *
 * O período é controlado por quem chama porque nas telas de detalhe ele manda
 * também nos cards de estatística e no histórico, não só no gráfico.
 *
 * Trocar de período não vai à rede: `dataFor` recorta o histórico que já está
 * na memória.
 */
export default function UsagePanel({ title, subtitle, dataFor, status = 'ready', period, onPeriodChange }) {
    const days = PERIOD_DAYS[period];
    const isDaily = days === 0;

    let content;
    if (status === 'loading') {
        content = (
            <div className="spinner-container" style={{ height: 120 }}>
                <div className="spinner large"></div>
            </div>
        );
    } else if (status === 'error') {
        content = <p className="bl-error">Não foi possível carregar o uso.</p>;
    } else {
        const raw = dataFor(days, isDaily) || {};
        const data = Object.keys(raw).length ? raw : emptyChartData(isDaily);
        content = <UsageChart data={data} isDaily={isDaily} />;
    }

    return (
        <div className="usage-chart-container">
            <div className="chart-header">
                <div>
                    <h3 className="chart-title">{title(period)}</h3>
                    <p className="chart-subtitle">{isDaily ? 'Tempo de uso por hora' : subtitle}</p>
                </div>
                <div className="chart-period-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 2v4" />
                        <path d="M16 2v4" />
                        <rect width="18" height="18" x="3" y="4" rx="2" />
                        <path d="M3 10h18" />
                    </svg>
                    <select
                        className="chart-period-select"
                        value={period}
                        onChange={(event) => onPeriodChange(event.target.value)}
                    >
                        <option value="today">Hoje</option>
                        <option value="7days">7 dias</option>
                        <option value="30days">30 dias</option>
                    </select>
                </div>
            </div>
            <div className="chart-wrapper">{content}</div>
        </div>
    );
}

/** Título no padrão "Uso de X hoje / nos últimos N dias". */
export function periodTitle(subject) {
    return (period) => {
        if (period === 'today') return `Uso ${subject} hoje`;
        return `Uso ${subject} nos últimos ${PERIOD_DAYS[period]} dias`;
    };
}
