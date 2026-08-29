import { useState } from 'react';
import { filterByLastDays } from '../../lib/usage.js';
import UsageChart from './UsageChart.jsx';

const PERIODS = {
    today: { days: 0, title: 'Uso do pacote hoje', subtitle: 'Horas de uso por hora' },
    '7days': { days: 7, title: 'Uso do pacote nos últimos 7 dias', subtitle: 'Horas de uso por dia' },
    '30days': { days: 30, title: 'Uso do pacote nos últimos 30 dias', subtitle: 'Horas de uso por dia' },
};

/**
 * Ponto neutro: um único registro zerado, para o gráfico nunca ficar sem
 * nenhum ponto. O pacote pode ter histórico e mesmo assim não sobrar nada
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

export default function PackageUsagePanel({ stats, status }) {
    const [period, setPeriod] = useState('7days');
    const { days, title, subtitle } = PERIODS[period];
    const isDaily = days === 0;

    let content;
    if (status === 'loading') {
        content = (
            <div className="spinner-container" style={{ height: 120 }}>
                <div className="spinner large"></div>
            </div>
        );
    } else if (status === 'error') {
        content = <p className="bl-error">Não foi possível carregar o uso deste pacote.</p>;
    } else {
        const raw = isDaily ? stats.dailyUsage : filterByLastDays(stats.historyUsage, days);
        const data = Object.keys(raw).length ? raw : emptyChartData(isDaily);
        content = <UsageChart data={data} isDaily={isDaily} />;
    }

    return (
        <div className="collection-chart-col">
            <div className="usage-chart-container">
                <div className="chart-header">
                    <div>
                        <h3 className="chart-title">{title}</h3>
                        <p className="chart-subtitle">{subtitle}</p>
                    </div>
                    <div className="chart-period-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 2v4" />
                            <path d="M16 2v4" />
                            <rect width="18" height="18" x="3" y="4" rx="2" />
                            <path d="M3 10h18" />
                        </svg>
                        {/* Trocar de período não vai à rede: recorta o histórico
                            que já veio na carga do pacote. */}
                        <select
                            className="chart-period-select"
                            value={period}
                            onChange={(event) => setPeriod(event.target.value)}
                        >
                            <option value="today">Hoje</option>
                            <option value="7days">7 dias</option>
                            <option value="30days">30 dias</option>
                        </select>
                    </div>
                </div>
                <div className="chart-wrapper">{content}</div>
            </div>
        </div>
    );
}
