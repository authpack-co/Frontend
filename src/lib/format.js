// Formatação pt-BR compartilhada pelas telas.

export function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

export function formatMoney(cents, currency = 'BRL') {
    const value = (Number(cents) || 0) / 100;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: currency || 'BRL' });
}

// "Junho de 2026" — título do período de cobrança.
export function formatMonth(value) {
    const label = new Date(value).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

export function addMonthISO(value) {
    const date = new Date(value);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString();
}
