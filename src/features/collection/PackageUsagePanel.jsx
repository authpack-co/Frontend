import { useState } from 'react';
import { filterByLastDays } from '../../lib/usage.js';
import UsagePanel, { periodTitle } from './UsagePanel.jsx';

const title = periodTitle('do pacote');

export default function PackageUsagePanel({ stats, status }) {
    // Na tela do pacote o período vale só para o gráfico: as colunas da lista
    // são sempre "hoje vs. costume", e não há card de estatística por período.
    const [period, setPeriod] = useState('7days');

    return (
        <div className="collection-chart-col">
            <UsagePanel
                title={title}
                subtitle="Horas de uso por dia"
                status={status}
                period={period}
                onPeriodChange={setPeriod}
                dataFor={(days, isDaily) => (isDaily
                    ? stats.dailyUsage
                    : filterByLastDays(stats.historyUsage, days))}
            />
        </div>
    );
}
