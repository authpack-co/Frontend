import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { addMonthISO, formatDate, formatMonth, formatMoney } from '../../lib/format.js';
import { InvoiceIcon, PERIOD_STATUS_ICON, StarIcon } from './icons.jsx';

// Preço de referência do Plus (R$ 39,90/mês), usado só quando ainda não há
// assinatura nem fatura de onde ler o valor real.
const PLUS_PRICE_CENTS = 3990;

export default function BillingView() {
    const { user } = useAuth();
    const [state, setState] = useState({ status: 'loading', billing: null });

    useEffect(() => {
        let alive = true;

        api.getBilling()
            .then((billing) => { if (alive) setState({ status: 'ready', billing }); })
            .catch((err) => {
                console.error('[Settings] getBilling error:', err);
                if (alive) setState({ status: 'error', billing: null });
            });

        return () => { alive = false; };
    }, []);

    return (
        <div className="settings-view active" id="settings-view-cobranca">
            <div className="settings-view-header">
                <h2>Cobrança</h2>
                <p>Acompanhe seu plano vigente e o histórico de pagamentos da assinatura.</p>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">
                    <div className="settings-card-icon settings-card-icon--star"><StarIcon /></div>
                    <span className="settings-card-title">Plano vigente</span>
                </div>
                <div className="settings-card-body">
                    {state.status === 'ready'
                        ? <PlanSummary billing={state.billing} role={user?.role} />
                        : <PlanSummaryFallback status={state.status} />}
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">
                    <div className="settings-card-icon"><InvoiceIcon /></div>
                    <span className="settings-card-title">Meses da assinatura</span>
                </div>
                <div className="settings-card-body">
                    {state.status === 'loading' && (
                        <div className="sc-loading" style={{ minHeight: 120 }}>
                            <div className="spinner large"></div>
                        </div>
                    )}
                    {state.status === 'error' && (
                        <p className="bl-error">Não foi possível carregar suas informações de cobrança.</p>
                    )}
                    {state.status === 'ready' && <PeriodList periods={buildPeriods(state.billing)} />}
                </div>
            </div>
        </div>
    );
}

function PlanSummaryFallback({ status }) {
    if (status === 'error') {
        return <p className="bl-error">Não foi possível carregar seu plano.</p>;
    }
    return (
        <div className="sc-loading" style={{ minHeight: 80 }}>
            <div className="spinner large"></div>
        </div>
    );
}

/**
 * Resumo do plano vigente.
 *
 * A mensalidade sai SEMPRE do preço da assinatura, nunca da última fatura:
 * depois de um upgrade a última fatura é a diferença proporcional (ex.:
 * R$ 59,90), que não é o valor recorrente.
 */
function PlanSummary({ billing, role }) {
    if (role === 'admin') {
        return (
            <>
                <div className="bl-plan-summary">
                    <div className="bl-plan-summary-main">
                        <span className="bl-plan-name">Benefícios inclusos</span>
                        <span className="bl-status-badge bl-status-badge--paid">Administrador</span>
                    </div>
                    <div className="bl-plan-summary-side">
                        <span className="bl-plan-price">Incluso</span>
                    </div>
                </div>
                <p className="bl-plan-note">
                    Seu papel de administrador já inclui todos os recursos. Nenhuma assinatura é necessária.
                </p>
            </>
        );
    }

    const { plan, plan_status: status, subscription: sub, invoices = [] } = billing;
    const isPaid = !!plan && plan !== 'free';

    if (!isPaid) {
        return (
            <>
                <div className="bl-plan-summary">
                    <div className="bl-plan-summary-main">
                        <span className="bl-plan-name">Plano Free</span>
                    </div>
                    <div className="bl-plan-summary-side">
                        <span className="bl-plan-price">Gratuito</span>
                    </div>
                </div>
                <p className="bl-plan-note">
                    Você está no plano Free. Assine o Plus para compartilhar acesso com muito mais pessoas.
                </p>
            </>
        );
    }

    const planLabel = `Niango ${plan.charAt(0).toUpperCase()}${plan.slice(1)}`;
    // Plano pago sem subscription = cortesia/trial (sem cobrança).
    const isTrial = !sub;
    const priceCents = sub?.unit_amount != null
        ? sub.unit_amount
        : (invoices.length ? invoices[0].amount_paid : PLUS_PRICE_CENTS);
    const currency = sub?.currency || invoices[0]?.currency || 'BRL';
    const price = `${formatMoney(priceCents, currency)} / mês`;

    let badge = { text: 'Ativa', kind: 'paid' };
    let renew = '';
    let note = '';
    let showPrice = price;

    if (isTrial) {
        badge = { text: 'Cortesia', kind: 'trial' };
        showPrice = 'Gratuito';
        if (billing.plan_expires_at) renew = `Ativo até ${formatDate(billing.plan_expires_at)}`;
        note = 'Período promocional gratuito — nenhuma cobrança será feita.';
    } else if (status === 'canceled') {
        badge = { text: 'Cancelada', kind: 'overdue' };
        if (billing.plan_expires_at) renew = `Acesso até ${formatDate(billing.plan_expires_at)}`;
        note = 'Assinatura cancelada — não será renovada. O acesso Plus permanece até o fim do período pago.';
    } else if (sub.pending_plan) {
        // Downgrade agendado: o plano maior continua valendo até a data.
        const pendingLabel = `Niango ${sub.pending_plan.charAt(0).toUpperCase()}${sub.pending_plan.slice(1)}`;
        badge = { text: 'Mudança agendada', kind: 'trial' };
        if (sub.pending_change_at) renew = `Muda em ${formatDate(sub.pending_change_at)}`;
        note = `Seu plano muda para ${pendingLabel} em ${formatDate(sub.pending_change_at)}. `
            + `Até lá você continua no ${planLabel} com todos os limites atuais.`;
    } else if (sub.current_period_end) {
        renew = `Renova em ${formatDate(sub.current_period_end)}`;
    }

    return (
        <>
            <div className="bl-plan-summary">
                <div className="bl-plan-summary-main">
                    <span className="bl-plan-name">{planLabel}</span>
                    <span className={`bl-status-badge bl-status-badge--${badge.kind}`}>{badge.text}</span>
                </div>
                <div className="bl-plan-summary-side">
                    <span className="bl-plan-price">{showPrice}</span>
                    <span className="bl-plan-renew">{renew}</span>
                </div>
            </div>
            {note && <p className="bl-plan-note">{note}</p>}
            {/* O portal só existe para quem tem customer na Stripe — cortesia e
                Free não têm nada para gerenciar lá. */}
            {sub?.has_billing_account && <BillingPortalButton />}
        </>
    );
}

/**
 * Trocar cartão, baixar faturas e cancelar acontecem no portal hospedado pela
 * Stripe — nenhum dado de pagamento passa por aqui.
 */
function BillingPortalButton() {
    const [opening, setOpening] = useState(false);

    async function handleClick() {
        setOpening(true);
        try {
            const { url } = await api.createBillingPortal();
            if (!url) throw new Error('portal sem url');
            window.location.assign(url);
        } catch (err) {
            console.error('[Settings] billingPortal error:', err);
            window.alert('Não foi possível abrir o portal de cobrança. Tente novamente.');
            setOpening(false);
        }
    }

    return (
        <button className="sc-full-btn btn-primary" onClick={handleClick} disabled={opening}>
            {opening ? 'Abrindo…' : 'Gerenciar pagamento'}
        </button>
    );
}

/**
 * Lista de períodos (meses) a partir das faturas pagas e da próxima cobrança
 * em aberto da assinatura.
 */
export function buildPeriods(billing) {
    const periods = [];
    const invoices = billing.invoices || [];
    const sub = billing.subscription;

    // Ciclos já pagos (uma fatura por ciclo). Faturas de troca de plano são
    // ajustes proporcionais, não mensalidades — ficam marcadas para não
    // parecerem um mês normal.
    invoices.forEach((inv) => {
        periods.push({
            status: 'paid',
            periodStart: inv.period_start || inv.paid_at,
            periodEnd: inv.period_end,
            dueDate: inv.period_start || inv.paid_at,
            amount: inv.amount_paid,
            currency: inv.currency || 'BRL',
            paidAt: inv.paid_at,
            isAdjustment: inv.billing_reason === 'subscription_update',
        });
    });

    // Próxima cobrança — só quando a assinatura está ativa e vai renovar. Ela
    // acontece em current_period_end (fim do ciclo já pago).
    if (billing.plan && billing.plan !== 'free' && sub && sub.status === 'active'
        && !sub.cancel_at_period_end && sub.current_period_end) {
        const dueTime = new Date(sub.current_period_end).getTime();
        periods.push({
            status: dueTime > Date.now() ? 'open' : 'overdue',
            periodStart: sub.current_period_end,
            periodEnd: addMonthISO(sub.current_period_end),
            dueDate: sub.current_period_end,
            amount: sub.unit_amount != null
                ? sub.unit_amount
                : (invoices.length ? invoices[0].amount_paid : PLUS_PRICE_CENTS),
            currency: sub.currency || invoices[0]?.currency || 'BRL',
            paidAt: null,
        });
    }

    // Mais recente primeiro.
    periods.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    return periods;
}

const STATUS_LABEL = { paid: 'Pago', open: 'Em aberto', overdue: 'Atrasada' };

function periodMeta(period) {
    if (period.status === 'paid') {
        const base = period.paidAt ? `Pago em ${formatDate(period.paidAt)}` : 'Pagamento confirmado';
        return period.isAdjustment ? `${base} · ajuste proporcional por troca de plano` : base;
    }
    if (period.status === 'open') return `Vence em ${formatDate(period.dueDate)}`;
    return `Vencido em ${formatDate(period.dueDate)}`;
}

function PeriodList({ periods }) {
    if (!periods.length) {
        return (
            <p style={{ fontSize: 13, color: 'var(--ap-text-muted)', textAlign: 'center', padding: '12px 0' }}>
                Nenhuma cobrança registrada ainda.
            </p>
        );
    }

    return (
        <div>
            {periods.map((period) => (
                <PeriodRow key={`${period.status}-${period.dueDate}`} period={period} />
            ))}
        </div>
    );
}

function PeriodRow({ period }) {
    const label = STATUS_LABEL[period.status] || STATUS_LABEL.open;

    return (
        <div className={`bl-period-row bl-period-row--${period.status}`}>
            <div className="bl-period-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {PERIOD_STATUS_ICON[period.status] || PERIOD_STATUS_ICON.open}
                </svg>
            </div>
            <div className="bl-period-info">
                <div className="bl-period-title">{formatMonth(period.periodStart)}</div>
                <div className="bl-period-meta">{periodMeta(period)}</div>
            </div>
            <div className="bl-period-right">
                <div className="bl-period-amount">{formatMoney(period.amount, period.currency)}</div>
                <span className={`bl-status-badge bl-status-badge--${period.status}`}>{label}</span>
            </div>
        </div>
    );
}
