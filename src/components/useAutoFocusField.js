import { useEffect, useRef } from 'react';
import { MODAL_EXIT_MS } from './useModalTransition.js';

/**
 * Põe o cursor no primeiro campo de texto assim que o modal aparece.
 *
 * O `autoFocus` do React não serve aqui: ele chama focus() na montagem, e
 * nesse instante o overlay está em `visibility: hidden` — é a classe .show,
 * um recálculo depois, que o revela. Elemento invisível não recebe foco, e o
 * focus() morre calado.
 *
 * Esperar a fase visível quase basta, mas ainda é cedo: a classe acabou de
 * entrar e a transição de visibility pode não ter começado. Por isso o hook
 * tenta, confere se pegou, e insiste — no quadro seguinte e, por último,
 * depois do tempo da animação.
 */

// Campos em que se digita. Botões, selects e caixas de marcar ficam de fora:
// abrir um modal já com um deles focado não adianta nada e ainda tira o
// destaque de onde a pessoa vai escrever.
const TYPABLE = [
    'input[type="text"]',
    'input[type="search"]',
    'input[type="email"]',
    'input[type="url"]',
    'input[type="number"]',
    'input[type="password"]',
    'input:not([type])',
    'textarea',
].map((selector) => `${selector}:not([disabled]):not([readonly])`).join(', ');

export default function useAutoFocusField(active) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!active) return undefined;

        const field = containerRef.current?.querySelector(TYPABLE);
        if (!field) return undefined;

        let frame = null;
        let timer = null;

        const tryFocus = () => {
            if (document.activeElement === field) return true;

            field.focus();
            if (document.activeElement !== field) return false;

            // Renomear chega com o nome atual escrito: o cursor no fim deixa
            // continuar de onde parou, em vez de escrever de trás para frente.
            const end = field.value?.length ?? 0;
            if (end && typeof field.setSelectionRange === 'function') {
                try {
                    field.setSelectionRange(end, end);
                } catch {
                    // type="number" e afins não aceitam seleção — o foco basta.
                }
            }
            return true;
        };

        // As duas tentativas são marcadas juntas, e não uma dentro da outra:
        // aba em segundo plano não roda requestAnimationFrame, e aí a corrente
        // pararia no primeiro elo. tryFocus desiste sozinho se já pegou.
        if (!tryFocus()) {
            frame = requestAnimationFrame(tryFocus);
            timer = setTimeout(tryFocus, MODAL_EXIT_MS);
        }

        return () => {
            if (frame !== null) cancelAnimationFrame(frame);
            if (timer !== null) clearTimeout(timer);
        };
    }, [active]);

    return containerRef;
}
