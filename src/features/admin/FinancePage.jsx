import { useCallback, useEffect, useState } from 'react';
import { useNotify } from '../../components/Notifications.jsx';
import { api } from '../../lib/api.js';
import { AdminView } from './AdminShell.jsx';
import { ErrorState, Loading, fmtBRL } from './pieces.jsx';
import RevenueChart from './RevenueChart.jsx';

/** Data de hoje deslocada em N dias, no formato que a API espera. */
function isoDay(offsetDays = 0) {
    return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

export default function FinancePage() {
    const notify = useNotify();

    const [summary, setSummary] = useState({ status: 'loading', data: null, error: null });

    // O período é aplicado no botão, e não a cada tecla: são três controles, e
    // recarregar no meio da digitação de uma data pediria intervalos absurdos.
    const [form, setForm] = useState({ from: isoDay(-30), to: isoDay(0), granularity: 'day' });
    const [applied, setApplied] = useState(form);
    const [chart, setChart] = useState({ status: 'loading', rows: [] });

    useEffect(() => {
        let alive = true;

        api.admin.financialSummary()
            .then((data) => { if (alive) setSummary({ status: 'ready', data, error: null }); })
            .catch((err) => {
                console.error('[Admin] financialSummary error:', err);
                if (alive) setSummary({ status: 'error', data: null, error: err.message });
            });

        return () => { alive = false; };
    }, []);

    const loadChart = useCallback(() => {
        let alive = true;
        setChart({ status: 'loading', rows: [] });

        api.admin.financialByPeriod(applied)
            .then((data) => { if (alive) setChart({ status: 'ready', rows: data?.subscriptions || [] }); })
            .catch((err) => {
                console.error('[Admin] financialByPeriod error:', err);
                if (!alive) return;
                setChart({ status: 'error', rows: [] });
                notify('error', err.message || 'Não foi possível carregar a receita.');
            });

        return () => { alive = false; };
    }, [applied, notify]);

    useEffect(loadChart, [loadChart]);

    return (
        <AdminView title="Financeiro" description="Receita recorrente das assinaturas da plataforma.">
            <div className="admin-cards">
                {summary.status === 'loading' && <Loading />}
                {summary.status === 'error' && <ErrorState>{summary.error}</ErrorState>}
                {summary.status === 'ready' && <SummaryCards data={summary.data} />}
            </div>

            <div className="admin-panel">
                <div className="admin-panel-head">
                    <h2>Receita por período</h2>
                    <div className="admin-period-controls">
                        <input
                            type="date"
                            className="admin-input"
                            value={form.from}
                            onChange={(event) => setForm({ ...form, from: event.target.value })}
                        />
                        <span>até</span>
                        <input
                            type="date"
                            className="admin-input"
                            value={form.to}
                            onChange={(event) => setForm({ ...form, to: event.target.value })}
                        />
                        <select
                            className="admin-input"
                            value={form.granularity}
                            onChange={(event) => setForm({ ...form, granularity: event.target.value })}
                        >
                            <option value="day">Por dia</option>
                            <option value="month">Por mês</option>
                        </select>
                        <button
                            className="admin-btn admin-btn-primary"
                            type="button"
                            onClick={() => setApplied(form)}
                        >
                            Aplicar
                        </button>
                    </div>
                </div>

                <div className="admin-chart-wrap">
                    {chart.status === 'ready'
                        ? <RevenueChart rows={chart.rows} />
                        : <Loading />}
                </div>
            </div>
        </AdminView>
    );
}

function SummaryCards({ data }) {
    const plans = data?.plans || {};
    const paid = (plans.plus || 0) + (plans.business || 0) + (plans.enterprise || 0);

    return (
        <>
            <div className="admin-card admin-card--accent">
                <div className="admin-card-label">Receita acumulada</div>
                <div className="admin-card-value">{fmtBRL(data.total_revenue_cents)}</div>
                <div className="admin-card-sub">
                    {data.subscriptions.invoices} faturas pagas · {data.subscriptions.payers} clientes
                </div>
            </div>
            <div className="admin-card">
                <div className="admin-card-label">Receita recorrente (MRR)</div>
                <div className="admin-card-value">{fmtBRL(data.recurring.mrr_cents)}</div>
                <div className="admin-card-sub">
                    {data.recurring.active_subscriptions} assinatura(s) ativa(s)
                </div>
            </div>
            <div className="admin-card">
                <div className="admin-card-label">Contas em plano pago</div>
                <div className="admin-card-value">{paid}</div>
                <div className="admin-card-sub">
                    Plus {plans.plus} · Business {plans.business} · Enterprise {plans.enterprise}
                </div>
            </div>
            <div className="admin-card">
                <div className="admin-card-label">Contas no Free</div>
                <div className="admin-card-value">{plans.free}</div>
                <div className="admin-card-sub">Base elegível para upgrade</div>
            </div>
        </>
    );
}
