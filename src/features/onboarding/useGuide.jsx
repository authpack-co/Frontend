import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePackages } from '../../lib/packages.jsx';
import OnboardingGuide from './OnboardingGuide.jsx';

/**
 * Quando o guia aparece.
 *
 * Sozinho, uma vez: na primeira vez que a conta abre o painel. Depois disso é
 * a pessoa que pede, pelo "Ver como funciona" da coleção vazia.
 *
 * Abrir não aposenta o guia — fechar e concluir aposentam. Recarregar a página
 * no meio dele não conta como já ter visto.
 */

const SEEN_KEY = 'niango-guide-seen';

// A chave anterior, de quando o produto tinha outro nome. Quem já dispensou o
// guia sob ela não o vê de novo só porque a chave mudou de nome.
const LEGACY_SEEN_KEY = 'authpack-session-tutorial-seen';

function isSeen() {
    try {
        return localStorage.getItem(SEEN_KEY) === '1'
            || localStorage.getItem(LEGACY_SEEN_KEY) === '1';
    } catch {
        // Navegador sem storage: o guia abre nesta visita e pronto.
        return false;
    }
}

function markSeen() {
    try {
        localStorage.setItem(SEEN_KEY, '1');
    } catch {
        // Sem storage não há o que lembrar; o guia ainda fecha.
    }
}

const GuideContext = createContext(null);

export function GuideProvider({ children }) {
    const { status } = usePackages();
    const [guide, setGuide] = useState(null);

    const open = useCallback((startSection) => setGuide({ startSection }), []);

    const close = useCallback(() => {
        markSeen();
        setGuide(null);
    }, []);

    // Só depois do painel carregar: o guia é uma camada sobre a tela pronta,
    // e sobre esqueletos ele explicaria uma coisa que ainda não está lá.
    useEffect(() => {
        if (status !== 'ready' || isSeen()) return;
        setGuide({ startSection: null });
    }, [status]);

    return (
        <GuideContext.Provider value={{ open }}>
            {children}
            <OnboardingGuide
                open={guide !== null}
                startSection={guide?.startSection}
                onClose={close}
            />
        </GuideContext.Provider>
    );
}

/** `open('create' | 'sessions' | 'share')` abre o guia na seção pedida. */
export function useGuide() {
    return useContext(GuideContext) || { open: () => {} };
}
