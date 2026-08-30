import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Entrada e saída dos modais.
 *
 * O CSS já sabe animar: o overlay nasce com opacity 0 e a caixa com scale
 * menor, e a classe de aberto (.show, .open) leva os dois ao estado final. No
 * painel antigo isso bastava porque os overlays viviam no HTML e só a classe
 * era ligada e desligada. Em React o elemento nasce já com a classe — não há
 * estado inicial de onde animar — e some no mesmo instante em que fecha. Daí
 * os modais aparecerem e sumirem secos.
 *
 * O hook devolve os dois tempos que faltavam:
 *
 * - abrir: monta sem a classe e a liga no recálculo seguinte;
 * - fechar: desliga a classe, espera a transição, e só então chama o onClose
 *   — que quase sempre é o que desmonta o modal (uma troca de rota, um estado
 *   que vira null). Sem essa inversão a saída não teria quando rodar.
 */

// Casa com `transition: all 0.3s` do .modal-overlay em dashboard.css.
export const MODAL_EXIT_MS = 300;

export default function useModalTransition(open, onClose, exitMs = MODAL_EXIT_MS) {
    // 'fechado' → 'entrando' → 'aberto' → 'saindo' → 'fechado'
    const [phase, setPhase] = useState('fechado');

    const overlayRef = useRef(null);
    const timer = useRef(null);
    // Espelho do estado para as decisões: elas acontecem dentro de efeitos e
    // de callbacks, e precisam da fase de agora, não da do último render.
    const phaseRef = useRef('fechado');
    const wasOpen = useRef(false);

    const apply = useCallback((next) => {
        phaseRef.current = next;
        setPhase(next);
    }, []);

    useEffect(() => () => clearTimeout(timer.current), []);

    // Só as bordas de `open` mandam aqui, nunca o valor corrente: ao fechar
    // pelo ×, a saída começa com `open` ainda true — é o onClose, no fim dela,
    // que baixa — e uma regra baseada no valor reabriria o modal no ato.
    useLayoutEffect(() => {
        const antes = wasOpen.current;
        wasOpen.current = open;
        if (open === antes) return;

        if (open) {
            clearTimeout(timer.current);
            apply('entrando');
            return;
        }

        // Já saindo (fechou pelo ×) ou já fora: o cronômetro certo está de pé.
        if (phaseRef.current !== 'aberto' && phaseRef.current !== 'entrando') return;

        apply('saindo');
        clearTimeout(timer.current);
        timer.current = setTimeout(() => apply('fechado'), exitMs);
    }, [open, exitMs, apply]);

    useLayoutEffect(() => {
        if (phase !== 'entrando') return;

        // Ler o layout obriga o navegador a calcular o estado fechado antes de
        // a classe entrar. Sem essa leitura os dois estados caem no mesmo
        // recálculo, o navegador enxerga um valor só, e não há transição.
        overlayRef.current?.getBoundingClientRect();
        apply('aberto');
    }, [phase, apply]);

    // Fechar pelo ×, pelo clique fora ou pelo Escape.
    const requestClose = useCallback(() => {
        if (phaseRef.current !== 'aberto') return;

        apply('saindo');
        clearTimeout(timer.current);
        timer.current = setTimeout(() => { apply('fechado'); onClose?.(); }, exitMs);
    }, [onClose, exitMs, apply]);

    return {
        mounted: phase !== 'fechado',
        visible: phase === 'aberto',
        overlayRef,
        requestClose,
    };
}
