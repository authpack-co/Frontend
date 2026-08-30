/** Rótulos e limites de cada plano, do jeito que a tela fala deles. */

export const PLAN_LABELS = {
    free: 'Free',
    plus: 'Plus',
    business: 'Business',
    enterprise: 'Enterprise',
};

export const PLAN_PEOPLE = {
    free: 'até 10 pessoas',
    plus: 'até 25 pessoas',
    business: 'até 75 pessoas',
    enterprise: 'pessoas ilimitadas',
};

export function planMoney(cents, currency) {
    return ((cents || 0) / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: (currency || 'BRL').toUpperCase(),
    });
}

/** effectiveAt vem em unix seconds no upgrade e como ISO no downgrade. */
export function planDate(value) {
    if (!value) return '';
    const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}
