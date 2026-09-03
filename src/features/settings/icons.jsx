// Ícones das configurações, extraídos do markup do painel antigo.
// As marcas de terceiros ficam em components/BrandIcons.jsx.

export function StarIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8l-6.2 3.3 1.2-6.9L2 9.3l6.9-1z" />
        </svg>
    );
}

export function PuzzleIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.5 3.5a2.5 2.5 0 0 0-5 0V6H7a1 1 0 0 0-1 1v3.5H3.5a2.5 2.5 0 0 0 0 5H6V19a1 1 0 0 0 1 1h3.5v-2.5a2.5 2.5 0 0 1 5 0V20H19a1 1 0 0 0 1-1v-3.5h-2.5a2.5 2.5 0 0 1 0-5H20V7a1 1 0 0 0-1-1h-3.5Z" />
        </svg>
    );
}

export function InvoiceIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
    );
}

// Glifos das linhas de período (pago / em aberto / atrasada).
export const PERIOD_STATUS_ICON = {
    paid: <path d="M20 6 9 17l-5-5" />,
    open: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    overdue: (
        <>
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="13" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </>
    ),
};
