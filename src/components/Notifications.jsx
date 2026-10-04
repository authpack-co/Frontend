import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Avisos rápidos no canto da tela.
 *
 * Mesma casca do painel antigo (.notifications), mas com uma diferença: lá os
 * três balões existiam no HTML e o notify() reciclava o do tipo pedido, o que
 * fazia dois avisos seguidos do mesmo tipo se atropelarem. Aqui só existe o
 * que está sendo mostrado, e um aviso novo substitui o anterior.
 *
 * O tempo na tela depende do que o aviso diz: uma confirmação some rápido, um
 * erro fica o dobro — é o que a pessoa precisa ler com calma, às vezes para
 * decidir o que fazer em seguida. O cursor em cima pausa a contagem, e o ×
 * fecha na hora.
 */

const NotifyContext = createContext(null);

// Tempo na tela por tipo, em ms.
const VISIBLE_MS = { success: 3000, info: 4000, warning: 5000, error: 6000 };
const DEFAULT_MS = 4000;
// Precisa casar com a animação de saída (.notification.is-leaving no CSS).
const EXIT_MS = 180;

const ICONS = {
    success: <path d="M20 6 9 17l-5-5" />,
    info: (
        <>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
        </>
    ),
    warning: (
        <>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
        </>
    ),
    error: (
        <>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </>
    ),
};

const LABELS = {
    success: 'Sucesso',
    info: 'Aviso',
    warning: 'Atenção',
    error: 'Erro',
};

export function NotificationsProvider({ children }) {
    const [current, setCurrent] = useState(null);
    const [leaving, setLeaving] = useState(false);
    // Dois relógios: um para tirar o aviso da tela, outro para desmontá-lo
    // depois da animação de saída.
    const hideTimer = useRef(null);
    const removeTimer = useRef(null);
    // Quanto falta quando o cursor pausa a contagem.
    const remainingRef = useRef(0);
    const startedAtRef = useRef(0);

    const dismiss = useCallback(() => {
        clearTimeout(hideTimer.current);
        setLeaving(true);
        removeTimer.current = setTimeout(() => {
            setCurrent(null);
            setLeaving(false);
        }, EXIT_MS);
    }, []);

    const arm = useCallback((ms) => {
        clearTimeout(hideTimer.current);
        startedAtRef.current = Date.now();
        remainingRef.current = ms;
        hideTimer.current = setTimeout(dismiss, ms);
    }, [dismiss]);

    const notify = useCallback((type, message) => {
        clearTimeout(removeTimer.current);
        setLeaving(false);
        // A chave força a remontagem: sem ela, um aviso novo durante a saída do
        // anterior herdaria a animação pela metade.
        setCurrent({ type, message, key: Date.now() });
        arm(VISIBLE_MS[type] ?? DEFAULT_MS);
    }, [arm]);

    const pause = useCallback(() => {
        clearTimeout(hideTimer.current);
        remainingRef.current -= Date.now() - startedAtRef.current;
    }, []);

    // Sempre sobra um respiro depois que o cursor sai, mesmo que o tempo já
    // tivesse acabado: o aviso não pode sumir no mesmo instante.
    const resume = useCallback(() => arm(Math.max(remainingRef.current, 900)), [arm]);

    useEffect(() => () => {
        clearTimeout(hideTimer.current);
        clearTimeout(removeTimer.current);
    }, []);

    return (
        <NotifyContext.Provider value={notify}>
            {children}
            <div className="notifications" aria-live="polite" aria-atomic="true">
                {current && (
                    <div
                        key={current.key}
                        className={`notification ${current.type}${leaving ? ' is-leaving' : ''}`}
                        role={current.type === 'error' ? 'alert' : 'status'}
                        onMouseEnter={pause}
                        onMouseLeave={resume}
                    >
                        <span className="notification-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                {ICONS[current.type] || ICONS.info}
                            </svg>
                        </span>
                        <p className="notification-message">{current.message}</p>
                        <button
                            className="notification-close"
                            type="button"
                            aria-label={`Fechar aviso de ${(LABELS[current.type] || LABELS.info).toLowerCase()}`}
                            onClick={dismiss}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                            </svg>
                        </button>
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
