import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Motor da fase de progresso da captura — o mesmo de ADICIONAR e ATUALIZAR
 * sessões (do lado da extensão também é um motor só, com mode 'create'|'update').
 *
 * Cada alvo carrega um `ref` que a extensão ecoa em toda mensagem. É por ele
 * que casamos progresso com linha — nunca pela URL: duas contas do mesmo
 * serviço no mesmo pacote têm a mesma URL e se cruzariam.
 *
 * Protocolo (content/bridge.js na extensão):
 *   page → niango:captureRun      { packageId, mode, targets }
 *   page ← niango:captureStage    { ref, current:{ stage } }
 *   page ← niango:captureProgress { ref, current:{ status, session } }
 *   page ← niango:captureDone     { mode, total, ok, saved, failed }
 */

// Marcos de progresso — DEVEM casar com a extensão (content/connectHold.js):
//   loading     →  0% .. 25%   (creep gradual enquanto readyState é "loading")
//   interactive → 25% .. 50%   (DOMContentLoaded)
//   complete    → 50% .. 75%   (load event)
//   settle      → 75% .. 100%  (3s pós-complete, ~1s cada terço)
const PCT = { loading: 0, interactive: 25, complete: 50, settle: 75, done: 100 };

const SETTLE_MS = 3000;   // casa com o CAPTURE_SETTLE_MS do captureManager
const CREEP_MS = 250;     // intervalo entre ticks do creep
// Rede de segurança por linha, acima do CAPTURE_TAB_TIMEOUT_MS da extensão (60s).
const ITEM_TIMEOUT_MS = 75000;

export default function useCapture({ packageId, mode = 'create', onFinished }) {
    // ref -> { target, state: 'pending'|'ok'|'error', pct }
    const [rows, setRows] = useState(null);
    const [batchDone, setBatchDone] = useState(false);

    const creepTimers = useRef({});
    const settleTimers = useRef({});
    const listenerRef = useRef(null);
    const finishedRef = useRef(onFinished);

    useEffect(() => { finishedRef.current = onFinished; }, [onFinished]);

    const stopCreep = useCallback((ref) => {
        clearInterval(creepTimers.current[ref]);
        delete creepTimers.current[ref];
    }, []);

    const stopSettle = useCallback((ref) => {
        clearInterval(settleTimers.current[ref]);
        delete settleTimers.current[ref];
    }, []);

    const stopAll = useCallback(() => {
        Object.keys(creepTimers.current).forEach(stopCreep);
        Object.keys(settleTimers.current).forEach(stopSettle);
    }, [stopCreep, stopSettle]);

    // A barra de uma linha só sobe: monotônica.
    const setPct = useCallback((ref, pct) => {
        setRows((current) => {
            const row = current?.[ref];
            if (!row) return current;
            return { ...current, [ref]: { ...row, pct: Math.max(row.pct, pct) } };
        });
    }, []);

    /** Preenche gradualmente até o teto, desacelerando. */
    const startCreep = useCallback((ref, ceiling) => {
        stopCreep(ref);
        creepTimers.current[ref] = setInterval(() => {
            setRows((current) => {
                const row = current?.[ref];
                if (!row || row.state !== 'pending' || row.pct >= ceiling - 0.5) {
                    stopCreep(ref);
                    return current;
                }
                return {
                    ...current,
                    [ref]: { ...row, pct: row.pct + (ceiling - row.pct) * 0.06 },
                };
            });
        }, CREEP_MS);
    }, [stopCreep]);

    /** 75% → 100% em três passos de ~1s. */
    const startSettle = useCallback((ref) => {
        stopCreep(ref);
        stopSettle(ref);
        setPct(ref, PCT.settle);

        const STEPS = 3;
        const step = (PCT.done - PCT.settle) / STEPS;
        let done = 0;

        settleTimers.current[ref] = setInterval(() => {
            done += 1;
            setPct(ref, Math.min(PCT.settle + step * done, PCT.done));
            if (done >= STEPS) stopSettle(ref);
        }, SETTLE_MS / STEPS);
    }, [setPct, stopCreep, stopSettle]);

    /** Estágio real vindo do overlay da extensão → barra da linha. */
    const handleStage = useCallback((ref, stage) => {
        if (stage === 'start') { setPct(ref, PCT.loading); startCreep(ref, PCT.interactive); }
        else if (stage === 'dcl') { setPct(ref, PCT.interactive); startCreep(ref, PCT.complete); }
        else if (stage === 'complete') { setPct(ref, PCT.complete); startCreep(ref, PCT.settle); }
        else if (stage === 'settle') { startSettle(ref); }
    }, [setPct, startCreep, startSettle]);

    const applyResult = useCallback((ref, ok) => {
        stopCreep(ref);
        stopSettle(ref);
        setRows((current) => {
            const row = current?.[ref];
            if (!row) return current;
            return {
                ...current,
                [ref]: { ...row, state: ok ? 'ok' : 'error', pct: ok ? PCT.done : row.pct },
            };
        });
    }, [stopCreep, stopSettle]);

    const post = useCallback((targets) => {
        window.postMessage({
            source: 'niango-page',
            type: 'niango:captureRun',
            packageId,
            mode,
            targets,
        }, window.location.origin);
    }, [packageId, mode]);

    /** Dispara o lote e escuta até o captureDone. */
    const start = useCallback((targets) => {
        stopAll();
        setBatchDone(false);

        const initial = {};
        targets.forEach((target) => {
            initial[target.ref] = { target, state: 'pending', pct: PCT.loading };
        });
        setRows(initial);

        // Cada linha começa a andar no t=0 e é ancorada pelos estágios reais
        // quando eles chegam.
        targets.forEach((target) => startCreep(target.ref, PCT.interactive));

        function onMessage(event) {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (data?.source !== 'niango-extension') return;

            if (data.type === 'niango:captureStage') {
                handleStage(data.ref, data.current?.stage);
            } else if (data.type === 'niango:captureProgress') {
                applyResult(data.ref, data.current?.status === 'ok');
            } else if (data.type === 'niango:captureDone') {
                window.removeEventListener('message', onMessage);
                listenerRef.current = null;
                stopAll();

                // O que ficou pendente quando o lote terminou não vai mais
                // chegar: vira falha, e a linha ganha o botão de tentar de novo.
                setRows((current) => {
                    const next = { ...current };
                    Object.keys(next).forEach((ref) => {
                        if (next[ref].state === 'pending') next[ref] = { ...next[ref], state: 'error' };
                    });
                    return next;
                });

                setBatchDone(true);
                finishedRef.current?.();
            }
        }

        listenerRef.current = onMessage;
        window.addEventListener('message', onMessage);
        post(targets);
    }, [applyResult, handleStage, post, startCreep, stopAll]);

    /**
     * Uma linha só. Casamos pelo ref e não esperamos o captureDone — assim o
     * retry não cruza com o lote original.
     */
    const retry = useCallback((ref) => {
        setRows((current) => {
            const row = current?.[ref];
            if (!row || row.state === 'pending') return current;
            return { ...current, [ref]: { ...row, state: 'pending', pct: PCT.loading } };
        });

        const target = rows?.[ref]?.target;
        if (!target) return;

        startCreep(ref, PCT.interactive);

        let settled = false;

        const finish = (ok) => {
            if (settled) return;
            settled = true;
            window.removeEventListener('message', onMessage);
            clearTimeout(timer);
            applyResult(ref, ok);
            finishedRef.current?.();
        };

        function onMessage(event) {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (data?.source !== 'niango-extension' || data.ref !== ref) return;

            if (data.type === 'niango:captureStage') handleStage(ref, data.current?.stage);
            else if (data.type === 'niango:captureProgress') finish(data.current?.status === 'ok');
        }

        const timer = setTimeout(() => finish(false), ITEM_TIMEOUT_MS);
        window.addEventListener('message', onMessage);
        post([target]);
    }, [applyResult, handleStage, post, rows, startCreep]);

    // Sair da tela no meio da captura não pode deixar timers nem listener vivos.
    useEffect(() => () => {
        stopAll();
        if (listenerRef.current) window.removeEventListener('message', listenerRef.current);
    }, [stopAll]);

    const list = rows ? Object.values(rows) : [];
    const total = list.length;
    const resolved = list.filter((row) => row.state !== 'pending').length;
    const ok = list.filter((row) => row.state === 'ok').length;
    const failed = list.filter((row) => row.state === 'error').length;

    return {
        rows: list,
        started: rows !== null,
        batchDone,
        // A barra PRINCIPAL avança só quando uma sessão é resolvida; o
        // progresso de carregamento vive nas barras de cada linha.
        summary: { total, resolved, ok, failed },
        start,
        retry,
    };
}
