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
 *   page → niango:captureCancel   para o que ainda não começou a gravar
 *   page ← niango:captureStage    { ref, current:{ stage } }
 *   page ← niango:captureProgress { ref, current:{ status: 'ok'|'error'|'cancelled', session } }
 *   page ← niango:captureDone     { mode, total, ok, saved, failed, cancelled }
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
// Depois do "Cancelar", quanto esperar a extensão fechar o lote. A sessão que já
// estava gravando termina em poucos segundos; passando disso é extensão antiga,
// que não conhece o cancelar — a tela encerra o lote por conta própria.
const CANCEL_FALLBACK_MS = 10000;

export default function useCapture({ packageId, mode = 'create', onFinished }) {
    // ref -> { target, state: 'pending'|'ok'|'error'|'cancelled', pct }
    const [rows, setRows] = useState(null);
    const [batchDone, setBatchDone] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const cancelTimer = useRef(null);

    const creepTimers = useRef({});
    const settleTimers = useRef({});
    // Lote em andamento e retries em voo (ref -> desfecho). A escuta das mensagens mora num
    // efeito próprio (abaixo), e não dentro do start: o "Atualizar sessão" dispara o start
    // num efeito de abertura, e no StrictMode o React desmonta e remonta o componente logo em
    // seguida — a limpeza da desmontagem tirava o listener, a remontagem não disparava de novo
    // (trava contra abrir duas abas) e o progresso nunca chegava, embora a sessão atualizasse.
    const batchActiveRef = useRef(false);
    // A escuta lê isto, não o estado: ela é registrada uma vez e veria o valor antigo.
    const cancelRequestedRef = useRef(false);
    const retriesRef = useRef(new Map());
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

    /** Desfecho de uma linha: 'ok', 'error' ou 'cancelled' (o que vier da extensão). */
    const applyResult = useCallback((ref, status) => {
        stopCreep(ref);
        stopSettle(ref);
        const state = status === 'ok' || status === 'cancelled' ? status : 'error';
        setRows((current) => {
            const row = current?.[ref];
            if (!row) return current;
            return {
                ...current,
                [ref]: { ...row, state, pct: state === 'ok' ? PCT.done : row.pct },
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

    /** Retry resolvido (progresso da linha ou timeout): uma vez só. */
    const finishRetry = useCallback((ref, status) => {
        const timer = retriesRef.current.get(ref);
        if (timer === undefined) return;
        clearTimeout(timer);
        retriesRef.current.delete(ref);
        applyResult(ref, status);
        finishedRef.current?.();
    }, [applyResult]);

    /**
     * Fecha o lote: o que ficou pendente não vai mais chegar. Depois de um
     * cancelar isso é "cancelada"; sem ele, falha — e a linha ganha o botão de
     * tentar de novo.
     */
    const endBatch = useCallback((leftover) => {
        batchActiveRef.current = false;
        clearTimeout(cancelTimer.current);
        stopAll();

        setRows((current) => {
            const next = { ...current };
            Object.keys(next).forEach((ref) => {
                if (next[ref].state === 'pending') next[ref] = { ...next[ref], state: leftover };
            });
            return next;
        });

        setCancelling(false);
        setBatchDone(true);
        finishedRef.current?.();
    }, [stopAll]);

    // A escuta vive enquanto o componente estiver montado — o StrictMode a desliga e religa
    // junto com a remontagem, sem depender de quem chamou o start.
    useEffect(() => {
        function onMessage(event) {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (data?.source !== 'niango-extension') return;

            // Retry: casamos pelo ref e não esperamos o captureDone — assim o
            // retry não cruza com o lote original.
            if (data.ref != null && retriesRef.current.has(data.ref)) {
                if (data.type === 'niango:captureStage') handleStage(data.ref, data.current?.stage);
                else if (data.type === 'niango:captureProgress') finishRetry(data.ref, data.current?.status);
                return;
            }

            if (!batchActiveRef.current) return;

            if (data.type === 'niango:captureStage') {
                handleStage(data.ref, data.current?.stage);
            } else if (data.type === 'niango:captureProgress') {
                applyResult(data.ref, data.current?.status);
            } else if (data.type === 'niango:captureDone') {
                endBatch(cancelRequestedRef.current ? 'cancelled' : 'error');
            }
        }

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [applyResult, endBatch, finishRetry, handleStage]);

    /** Põe um lote no ar; o progresso chega pela escuta acima até o captureDone. */
    const run = useCallback((targets) => {
        setBatchDone(false);
        setCancelling(false);
        cancelRequestedRef.current = false;

        // Cada linha começa a andar no t=0 e é ancorada pelos estágios reais
        // quando eles chegam.
        targets.forEach((target) => startCreep(target.ref, PCT.interactive));

        batchActiveRef.current = true;
        post(targets);
    }, [post, startCreep]);

    const start = useCallback((targets) => {
        stopAll();

        const initial = {};
        targets.forEach((target) => {
            initial[target.ref] = { target, state: 'pending', pct: PCT.loading };
        });
        setRows(initial);

        run(targets);
    }, [run, stopAll]);

    /**
     * Retoma o que o cancelar parou: as linhas canceladas voltam para a fila
     * num lote novo — com o mesmo Cancelar de antes —, e o que já foi coletado
     * fica como está.
     */
    const resume = useCallback(() => {
        if (batchActiveRef.current) return;
        const targets = Object.values(rows || {})
            .filter((row) => row.state === 'cancelled')
            .map((row) => row.target);
        if (targets.length === 0) return;

        setRows((current) => {
            const next = { ...current };
            targets.forEach((target) => {
                next[target.ref] = { ...next[target.ref], state: 'pending', pct: PCT.loading };
            });
            return next;
        });

        run(targets);
    }, [rows, run]);

    /**
     * Para a captura: o que ainda espera a vez não abre, o que já foi coletado
     * fica. A extensão devolve cada linha parada como "cancelled" e fecha o
     * lote com o captureDone de sempre — é ele que libera o "Fechar".
     */
    const cancel = useCallback(() => {
        if (!batchActiveRef.current || cancelRequestedRef.current) return;
        cancelRequestedRef.current = true;
        setCancelling(true);

        window.postMessage({ source: 'niango-page', type: 'niango:captureCancel' }, window.location.origin);
        cancelTimer.current = setTimeout(() => {
            if (batchActiveRef.current) endBatch('cancelled');
        }, CANCEL_FALLBACK_MS);
    }, [endBatch]);

    /** Uma linha só, de novo. */
    const retry = useCallback((ref) => {
        setRows((current) => {
            const row = current?.[ref];
            if (!row || row.state === 'pending') return current;
            return { ...current, [ref]: { ...row, state: 'pending', pct: PCT.loading } };
        });

        const target = rows?.[ref]?.target;
        if (!target || retriesRef.current.has(ref)) return;

        startCreep(ref, PCT.interactive);
        retriesRef.current.set(ref, setTimeout(() => finishRetry(ref, false), ITEM_TIMEOUT_MS));
        post([target]);
    }, [finishRetry, post, rows, startCreep]);

    // Sair da tela no meio da captura não pode deixar timers vivos.
    useEffect(() => () => {
        stopAll();
        clearTimeout(cancelTimer.current);
        retriesRef.current.forEach((timer) => clearTimeout(timer));
        retriesRef.current.clear();
    }, [stopAll]);

    const list = rows ? Object.values(rows) : [];
    const total = list.length;
    const resolved = list.filter((row) => row.state !== 'pending').length;
    const ok = list.filter((row) => row.state === 'ok').length;
    const failed = list.filter((row) => row.state === 'error').length;
    const cancelled = list.filter((row) => row.state === 'cancelled').length;

    return {
        rows: list,
        started: rows !== null,
        batchDone,
        cancelling,
        // O CSS do modal pendura o resultado num atributo: é `[data-result]`
        // que revela o "tentar de novo" das linhas em erro, e o
        // `[data-result="success"]` que pinta a barra de verde.
        // 'success' exige o lote inteiro resolvido: no meio de um retry o
        // failed cai para zero com a linha ainda pendente, e a barra ficaria
        // verde antes da hora.
        result: batchDone
            ? (failed === 0 && cancelled === 0 && resolved === total ? 'success' : 'partial')
            : null,
        // A barra PRINCIPAL avança só quando uma sessão é resolvida; o
        // progresso de carregamento vive nas barras de cada linha.
        summary: { total, resolved, ok, failed, cancelled },
        start,
        retry,
        cancel,
        resume,
    };
}
