import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Avisos rápidos no canto da tela.
 *
 * Mesma casca do painel antigo (.notifications), mas com uma diferença: lá os
 * três balões existiam no HTML e o notify() reciclava o do tipo pedido, o que
 * fazia dois avisos seguidos do mesmo tipo se atropelarem. Aqui só existe o
 * que está sendo mostrado, e um aviso novo substitui o anterior.
 */

const NotifyContext = createContext(null);

const VISIBLE_MS = 2500;

const ICONS = {
    success: <path d="M20 6 9 17l-5-5" />,
    info: (
        <>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
        </>
    ),
    error: (
        <>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </>
    ),
};

export function NotificationsProvider({ children }) {
    const [current, setCurrent] = useState(null);
    const timerRef = useRef(null);

    const notify = useCallback((type, message) => {
        clearTimeout(timerRef.current);
        // A chave força a remontagem: sem ela, um aviso novo durante a saída do
        // anterior herdaria a animação pela metade.
        setCurrent({ type, message, key: Date.now() });
        timerRef.current = setTimeout(() => setCurrent(null), VISIBLE_MS);
    }, []);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    return (
        <NotifyContext.Provider value={notify}>
            {children}
            <div className="notifications">
                {current && (
                    <div key={current.key} className={`notification ${current.type} show`}>
                        <div className="notification-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {ICONS[current.type] || ICONS.info}
                            </svg>
                        </div>
                        <div className="notification-message">{current.message}</div>
                        <div className="notification-progress"></div>
                    </div>
                )}
            </div>
        </NotifyContext.Provider>
    );
}

export function useNotify() {
    const notify = useContext(NotifyContext);
    if (!notify) throw new Error('useNotify precisa estar dentro de <NotificationsProvider>');
    return notify;
}
