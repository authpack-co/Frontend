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

// Diferença em dias de calendário entre a data e hoje (0 = hoje, 1 = ontem).
function daysApart(date) {
    const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return Math.round((startOf(new Date()) - startOf(date)) / 86400000);
}

// "24 jul" no mesmo ano; "24 jul 2025" quando o ano é outro. O pt-BR devolve
// "25 de jul." — enxugamos para caber numa linha de lista.
function formatDayLabel(date) {
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date
        .toLocaleDateString('pt-BR', sameYear
            ? { day: 'numeric', month: 'short' }
            : { day: 'numeric', month: 'short', year: 'numeric' })
        .replace(/\./g, '')
        .replace(/ de /g, ' ');
}

/** "Hoje, 14:22" · "Ontem, 11:14" · "12 ago, 15:40". Vazio sem data válida. */
export function formatDayStamp(value) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return '';

    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const days = daysApart(date);

    if (days === 0) return `Hoje, ${time}`;
    if (days === 1) return `Ontem, ${time}`;
    return `${formatDayLabel(date)}, ${time}`;
}

/** Iniciais para avatar sem foto: primeira e última palavra do nome. */
export function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
