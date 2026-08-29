import { useState } from 'react';
import { useNotify } from '../../components/Notifications.jsx';
import { api, ApiError } from '../../lib/api.js';
import { usePackages } from '../../lib/packages.jsx';
import PlanChangeModal from './PlanChangeModal.jsx';

/**
 * Planos.
 *
 * Era um modal aberto por cima do painel; virou rota porque é uma tela de
 * decisão — dá para mandar por link ("olha os planos") e para voltar com o
 * botão do navegador sem perder onde se estava.
 *
 * Pacotes e sessões são ilimitados em todos os planos: o único limite é com
 * quantas pessoas você compartilha acesso, e é isso que os cards comparam.
 */

const PLANS = [
    {
        tier: 'plus',
        name: 'Plus',
        tag: 'Times pequenos',
        price: 'R$ 39,90',
        period: '/mês',
        people: '25',
        features: [
            'Pacotes e sessões ilimitados',
            'Extensão no navegador',
            'Links únicos e revogação a qualquer momento',
        ],
        cta: 'Assinar Plus',
    },
    {
        tier: 'business',
        name: 'Business',
        tag: 'Times e grupos',
        price: 'R$ 99,90',
        period: '/mês',
        people: '75',
        featured: 'Mais capacidade',
        features: [
            'Tudo do Plus',
            'Triplo de pessoas pelo mesmo pacote de recursos',
            'Suporte prioritário por e-mail',
        ],
        cta: 'Assinar Business',
    },
    {
        tier: 'enterprise',
        name: 'Enterprise',
        tag: 'Sob medida',
        price: 'Sob consulta',
        people: 'Ilimitado',
        features: [
            'Tudo do Business',
            'Condições e faturamento sob medida',
            'Suporte dedicado',
        ],
        // Enterprise não é assinável online: é conversa.
        contact: 'mailto:team@authpack.co?subject=Plano%20Enterprise',
        cta: 'Falar com vendas',
    },
];

export default function PlansPage() {
    const { userInfo } = usePackages();
    const notify = useNotify();

    const [pendingPlan, setPendingPlan] = useState(null);
    const [preview, setPreview] = useState(null);
    const [busyTier, setBusyTier] = useState(null);

    const currentPlan = userInfo?.plan;

    async function choose(tier) {
        if (busyTier) return;
        setBusyTier(tier);

        try {
            // Etapa 1 — simula. Nada é cobrado aqui.
            const result = await api.previewPlanChange(tier) || {};

            if (result.mode === 'same') {
                notify('error', 'Você já está neste plano.');
                return;
            }

            // Assinatura nova vai direto ao Checkout hospedado: ele é a
            // confirmação, com valor e cartão.
            if (result.mode === 'checkout') {
                const checkout = await api.createSubscriptionCheckout(tier) || {};
                if (!checkout.url) throw new Error('checkout sem url');
                window.location.href = checkout.url;
                return;
            }

            setPendingPlan(tier);
            setPreview(result);
        } catch (err) {
            console.error('[Plans] preview error:', err);
            notify('error', err instanceof ApiError
                ? err.message
                : 'Não foi possível simular a troca de plano.');
        } finally {
            setBusyTier(null);
        }
    }

    return (
        <div className="plans-modal" style={{ maxWidth: 'none' }}>
            <div className="plans-modal-header">
                <span className="plans-eyebrow">Planos</span>
                <h2>Escolha o tamanho do seu <span className="plus-highlight">compartilhamento</span></h2>
                <p>
                    Pacotes e sessões são ilimitados em todos os planos. O único limite é com
                    quantas pessoas você compartilha acesso.
                </p>
            </div>

            <div className="plans-grid">
                {PLANS.map((plan) => {
                    const isCurrent = currentPlan === plan.tier;

                    return (
                        <div
                            className={`plan-card${plan.featured ? ' plan-card--featured' : ''}${isCurrent ? ' plan-card--current' : ''}`}
                            key={plan.tier}
                        >
                            {plan.featured && <span className="plan-badge">{plan.featured}</span>}

                            <div className="plan-card-head">
                                <span className="plan-name">{plan.name}</span>
                                <span className="plan-tag">{plan.tag}</span>
                            </div>

                            <div className="plan-price">
                                <span className="plan-price-value">{plan.price}</span>
                                {plan.period && <span className="plan-price-period">{plan.period}</span>}
                            </div>

                            <div className="plan-people">
                                <span className="plan-people-value">{plan.people}</span>
                                <span className="plan-people-label">pessoas com acesso</span>
                            </div>

                            <ul className="plan-feats">
                                {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                            </ul>

                            {plan.contact ? (
                                <a className="plan-choose-btn plan-choose-btn--ghost" href={plan.contact}>
                                    {plan.cta}
                                </a>
                            ) : (
                                <button
                                    className="plan-choose-btn"
                                    type="button"
                                    disabled={isCurrent || busyTier !== null}
                                    onClick={() => choose(plan.tier)}
                                >
                                    {isCurrent ? 'Plano atual' : (busyTier === plan.tier ? 'Simulando...' : plan.cta)}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="plans-foot">
                <span className="plans-foot-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Pagamento seguro
                </span>
                <span className="plans-foot-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
                    </svg>
                    Ativação imediata
                </span>
                <span className="plans-foot-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                        <path d="M21 3v5h-5" />
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                        <path d="M8 16H3v5" />
                    </svg>
                    Cancele quando quiser
                </span>
            </div>

            {preview && (
                <PlanChangeModal
                    plan={pendingPlan}
                    preview={preview}
                    onClose={() => { setPreview(null); setPendingPlan(null); }}
                />
            )}
        </div>
    );
}
