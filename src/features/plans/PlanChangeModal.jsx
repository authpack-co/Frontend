import { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { useNotify } from '../../components/Notifications.jsx';
import { api, ApiError } from '../../lib/api.js';
import { PLAN_LABELS, PLAN_PEOPLE, planDate, planMoney } from './plans.js';

/**
 * Confirmação de troca de plano: mostra o que será cobrado ANTES de qualquer
 * cobrança. Os números vêm da simulação (POST /subscription/preview), não de
 * conta feita aqui.
 *
 * Assinatura nova não passa por aqui: o próprio Checkout da Stripe é a tela de
 * confirmação, com valor e cartão, e duplicar isso só criaria duas verdades.
 */
export default function PlanChangeModal({ plan, preview, onClose }) {
    const [busy, setBusy] = useState(false);
    const notify = useNotify();

    const from = PLAN_LABELS[preview.currentTier] || preview.currentTier;
    const to = PLAN_LABELS[preview.newTier] || preview.newTier;

    const copy = buildCopy(preview, from, to);

    async function handleConfirm() {
        setBusy(true);

        try {
            const result = await api.createSubscriptionCheckout(plan) || {};
            const { mode, url, effectiveAt } = result;

            if (mode === 'checkout') {
                if (!url) throw new Error('checkout sem url');
                window.location.href = url;
                return;
            }

            onClose();

            if (mode === 'upgraded') {
                notify('success', 'Plano atualizado! Cobramos apenas a diferença proporcional.');
            } else if (mode === 'downgrade_scheduled') {
                notify('success', `Mudança agendada para ${planDate(effectiveAt) || 'o fim do período atual'}.`);
            } else if (mode === 'schedule_canceled') {
                notify('success', 'Mudança de plano cancelada. Você segue no plano atual.');
            }

            // O plano novo chega em várias telas ao mesmo tempo (limite de
            // pessoas, badge, cobrança): recarregar é mais honesto que
            // remendar cada uma.
            setTimeout(() => window.location.reload(), 2500);
        } catch (err) {
            console.error('[Plans] change error:', err);
            notify('error', err instanceof ApiError && err.message === 'ALREADY_SUBSCRIBED_TO_THIS_PLAN'
                ? 'Você já está neste plano.'
                : 'Não foi possível concluir a operação.');
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={copy.title}
            className="pc-modal"
            closable={!busy}
            footer={(
                <>
                    <button className="pc-btn pc-btn--ghost" type="button" onClick={onClose} disabled={busy}>
                        Voltar
                    </button>
                    <button className="pc-btn pc-btn--primary" type="button" onClick={handleConfirm} disabled={busy}>
                        {busy ? 'Processando...' : 'Confirmar'}
                    </button>
                </>
            )}
        >
            <div className="pc-body">
                {/* Plano atual → plano novo, com o limite de pessoas de cada um
                    (o limitador real do produto). */}
                <div className="pc-transition">
                    <div className="pc-plan">
                        <span className="pc-plan-label">Atual</span>
                        <span className="pc-plan-name">AuthPack {from}</span>
                        <span className="pc-plan-people">{PLAN_PEOPLE[preview.currentTier] || ''}</span>
                    </div>
                    <svg className="pc-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                    <div className="pc-plan pc-plan--target">
                        <span className="pc-plan-label">{copy.targetLabel}</span>
                        <span className="pc-plan-name">AuthPack {copy.targetName}</span>
                        <span className="pc-plan-people">{copy.targetPeople}</span>
                    </div>
                </div>

                {/* Detalhamento da Stripe: crédito do tempo não usado + valor
                    do novo plano. Só existe no upgrade. */}
                {copy.lines.length > 0 && (
                    <div className="pc-breakdown">
                        <span className="pc-breakdown-title">Cálculo proporcional</span>
                        <div className="pc-lines">
                            {copy.lines.map((line, index) => (
                                <div className="pc-line" key={`${line.description}-${index}`}>
                                    <span>{line.description || ''}</span>
                                    <strong className={line.amount < 0 ? 'is-credit' : undefined}>
                                        {planMoney(line.amount, preview.currency)}
                                    </strong>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className={`pc-charge${copy.noCharge ? ' pc-charge--none' : ''}`}>
                    <div className="pc-charge-row">
                        <span className="pc-charge-label">{copy.chargeLabel}</span>
                        <span className="pc-charge-value">{copy.chargeValue}</span>
                    </div>
                    <span className="pc-charge-sub">{copy.chargeSub}</span>
                </div>

                <p className="pc-note">{copy.note}</p>
            </div>
        </Modal>
    );
}

function buildCopy(preview, from, to) {
    const base = {
        targetName: to,
        targetPeople: PLAN_PEOPLE[preview.newTier] || '',
        lines: [],
        noCharge: false,
    };

    if (preview.mode === 'upgrade') {
        return {
            ...base,
            title: 'Confirmar upgrade',
            targetLabel: 'A partir de agora',
            lines: preview.lines || [],
            chargeLabel: 'Cobrança única agora',
            chargeValue: planMoney(preview.amountDueNow, preview.currency),
            chargeSub: 'Referente apenas aos dias restantes do ciclo atual.',
            note: 'A mensalidade cheia do novo plano só passa a valer na próxima renovação. '
                + 'O novo limite de pessoas fica disponível imediatamente.',
        };
    }

    if (preview.mode === 'downgrade') {
        const when = planDate(preview.effectiveAt);
        return {
            ...base,
            title: 'Confirmar mudança de plano',
            targetLabel: when ? `A partir de ${when}` : 'No fim do ciclo',
            noCharge: true,
            chargeLabel: 'Nenhuma cobrança agora',
            chargeValue: 'R$ 0,00',
            chargeSub: when
                ? `Você já pagou o ${from} até ${when}.`
                : `Você já pagou o ${from} até o fim do ciclo atual.`,
            note: `Até lá nada muda: você mantém todos os limites do ${from}. `
                + `Depois dessa data passa a valer o limite do ${to} — acessos compartilhados `
                + 'acima do novo limite ficam pausados até você liberar espaço.',
        };
    }

    // cancel_schedule: desfaz um downgrade agendado, então o "novo" é o atual.
    return {
        ...base,
        title: 'Cancelar mudança agendada',
        targetLabel: 'Continua',
        targetName: from,
        targetPeople: PLAN_PEOPLE[preview.currentTier] || '',
        noCharge: true,
        chargeLabel: 'Nenhuma cobrança agora',
        chargeValue: 'R$ 0,00',
        chargeSub: '',
        note: `A mudança agendada será desfeita e você segue no ${from} normalmente, `
            + 'com renovação automática.',
    };
}
