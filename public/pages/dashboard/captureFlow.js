/**
 * AuthPack – Fase de progresso da captura (dashboard)
 *
 * Motor de tela compartilhado por ADICIONAR e ATUALIZAR sessões. Do lado da extensão
 * os dois são o mesmo motor (captureManager, com mode 'create'|'update'); aqui também:
 * a mesma lista de linhas, as mesmas mini bars de 4 faixas, o mesmo retry por linha e
 * o mesmo resumo de rodapé. Só a cópia muda.
 *
 * Quem chama monta os alvos e cuida da fase de SELEÇÃO (catálogo, no adicionar; lista
 * do pacote, no atualizar). Daqui para frente é tudo igual.
 *
 * Cada alvo carrega um `ref` que a extensão ecoa em toda mensagem. É por ele que
 * casamos progresso com linha — nunca pela URL: duas sessões do mesmo serviço no mesmo
 * pacote (duas contas do mesmo Gmail) têm a mesma URL e se cruzariam.
 *
 * Protocolo (ver content/bridge.js na extensão):
 *   page → authpack:captureRun      { packageId, mode, targets }
 *   page ← authpack:captureStage    { ref, current:{url,name,stage} }
 *   page ← authpack:captureProgress { ref, mode, done, total, current }
 *   page ← authpack:captureDone     { mode, total, ok, saved, failed }
 */

const captureFlow = (function () {
    'use strict';

    // Marcos de progresso — DEVEM casar com a extensão (content/connectHold.js).
    //   loading    →  0% .. 25%   (creep gradual enquanto readyState é "loading")
    //   interactive→ 25% .. 50%   (DOMContentLoaded: boom p/ 25% + creep)
    //   complete   → 50% .. 75%   (load event: boom p/ 50% + creep)
    //   settle     → 75% .. 100%  (3s pós-complete: ~1s cada ⅓)
    const CAP_PCT = { loading: 0, interactive: 25, complete: 50, settle: 75, done: 100 };
    const SETTLE_MS = 3000;        // deve casar com CAPTURE_SETTLE_MS do captureManager
    const CREEP_MS = 250;          // intervalo entre ticks do creep
    // Rede de segurança por linha, acima do CAPTURE_TAB_TIMEOUT_MS da extensão (60s).
    const ITEM_TIMEOUT_MS = 75000;

    const ICON_SPINNER = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader spin"><line x1="12" x2="12" y1="2" y2="6"/><line x1="12" x2="12" y1="18" y2="22"/><line x1="4.93" x2="7.76" y1="4.93" y2="7.76"/><line x1="16.24" x2="19.07" y1="16.24" y2="19.07"/><line x1="2" x2="6" y1="12" y2="12"/><line x1="18" x2="22" y1="12" y2="12"/><line x1="4.93" x2="7.76" y1="19.07" y2="16.24"/><line x1="16.24" x2="19.07" y1="7.76" y2="4.93"/></svg>';
    const ICON_CHECK = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    const ICON_ALERT = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>';

    const COPY = {
        create: {
            running: 'Capturando sessões…',
            footerRunning: 'Capturando…',
            allOk: 'Todas as sessões foram adicionadas',
            partial: (ok, failed) => `${ok} adicionada(s) · ${failed} com falha`,
            footerAllOk: 'Sessões adicionadas com sucesso.',
        },
        update: {
            running: 'Atualizando sessões…',
            footerRunning: 'Atualizando…',
            allOk: 'Todas as sessões foram atualizadas',
            partial: (ok, failed) => `${ok} atualizada(s) · ${failed} com falha`,
            footerAllOk: 'Sessões atualizadas com sucesso.',
        },
    };

    /**
     * Executa a fase de progresso. Assume que o modal já está aberto.
     *
     * @param {Object}      opts
     * @param {HTMLElement} opts.modal      modal com a estrutura .as-* (progresso + rodapé)
     * @param {string}      opts.packageId
     * @param {string}      opts.mode       'create' | 'update'
     * @param {Array}       opts.targets    [{ ref, id?, name, url, icon? }]
     * @param {Function}   [opts.onItemOk]  (target, session) quando uma captura grava com sucesso
     */
    function run(opts) {
        const { modal, packageId, mode, targets } = opts;
        const copy = COPY[mode] || COPY.create;
        const onItemOk = opts.onItemOk || function () { };

        const statusEl = modal.querySelector('.as-status');
        const countEl = modal.querySelector('.as-count');
        const fillEl = modal.querySelector('.as-bar-fill');
        const listEl = modal.querySelector('.as-list');
        const closeBtn = modal.querySelector('.as-close');
        const footerStatusIcon = modal.querySelector('.as-footer-status-icon');
        const footerStatusText = modal.querySelector('.as-footer-status-text');
        const footerStatusWrapper = modal.querySelector('.as-footer-status-wrapper');

        const total = targets.length;
        if (total === 0) return;

        const rows = {};                 // ref -> <li>
        const targetByRef = {};          // ref -> alvo (para o retry)
        const progressByRef = {};        // ref -> % de carregamento [0..100]
        const creepTimers = {};
        const settleTimers = {};
        let batchDone = false;           // libera os botões de retry

        targets.forEach(t => { targetByRef[t.ref] = t; });

        // ─── Mini bars ────────────────────────────────────────────────────────────

        function stopCreep(ref) {
            if (creepTimers[ref]) { clearInterval(creepTimers[ref]); delete creepTimers[ref]; }
        }

        function stopSettle(ref) {
            if (settleTimers[ref]) { clearInterval(settleTimers[ref]); delete settleTimers[ref]; }
        }

        function stopAll() {
            Object.keys(creepTimers).forEach(stopCreep);
            Object.keys(settleTimers).forEach(stopSettle);
        }

        // Monotônico: a barra de uma linha só sobe.
        function setRowBar(ref, pct) {
            progressByRef[ref] = Math.max(progressByRef[ref] || 0, pct);
            const fill = rows[ref]?.querySelector('.up-item-bar-fill');
            if (fill) fill.style.width = `${Math.round(progressByRef[ref])}%`;
        }

        // Preenche gradualmente até `ceiling`, desacelerando.
        function startCreep(ref, ceiling) {
            stopCreep(ref);
            creepTimers[ref] = setInterval(() => {
                if (!rows[ref] || rows[ref].dataset.state !== 'pending') { stopCreep(ref); return; }
                const cur = progressByRef[ref] || 0;
                if (cur >= ceiling - 0.5) { stopCreep(ref); return; }
                progressByRef[ref] = cur + (ceiling - cur) * 0.06;
                const fill = rows[ref].querySelector('.up-item-bar-fill');
                if (fill) fill.style.width = `${Math.round(progressByRef[ref])}%`;
            }, CREEP_MS);
        }

        // 75% → 100% em 3 passos de ~1s.
        function startSettle(ref) {
            stopCreep(ref);
            stopSettle(ref);
            setRowBar(ref, CAP_PCT.settle);
            const STEPS = 3;
            const stepPct = (CAP_PCT.done - CAP_PCT.settle) / STEPS;
            let step = 0;
            settleTimers[ref] = setInterval(() => {
                step++;
                setRowBar(ref, Math.min(CAP_PCT.settle + stepPct * step, CAP_PCT.done));
                if (step >= STEPS) stopSettle(ref);
            }, SETTLE_MS / STEPS);
        }

        // Estágio de carregamento vindo do overlay da extensão → mini bar da linha.
        function handleStage(ref, stage) {
            if (!rows[ref]) return;
            if (stage === 'start') { setRowBar(ref, CAP_PCT.loading); startCreep(ref, CAP_PCT.interactive); }
            else if (stage === 'dcl') { setRowBar(ref, CAP_PCT.interactive); startCreep(ref, CAP_PCT.complete); }
            else if (stage === 'complete') { setRowBar(ref, CAP_PCT.complete); startCreep(ref, CAP_PCT.settle); }
            else if (stage === 'settle') { startSettle(ref); }
        }

        // ─── Linhas ───────────────────────────────────────────────────────────────

        function buildRows() {
            listEl.innerHTML = '';
            targets.forEach(t => {
                const row = document.createElement('li');
                row.className = 'up-item';
                row.dataset.ref = t.ref;
                row.dataset.state = 'pending';

                const icon = document.createElement('img');
                icon.className = 'up-item-icon';
                icon.alt = '';
                AuthPackFavicon.apply(icon, {
                    url: t.url,
                    icon: t.icon,
                    onFinalError: () => {
                        const fb = document.createElement('span');
                        fb.className = 'up-item-icon up-item-icon--fb';
                        fb.textContent = (t.name || '?').trim().charAt(0).toUpperCase();
                        icon.replaceWith(fb);
                    }
                });

                const content = document.createElement('div');
                content.className = 'up-item-content';

                const nameSpan = document.createElement('span');
                nameSpan.className = 'up-item-name';
                nameSpan.textContent = t.name;
                nameSpan.title = t.name || '';

                const miniTrack = document.createElement('div');
                miniTrack.className = 'up-item-bar';
                const miniFill = document.createElement('div');
                miniFill.className = 'up-item-bar-fill';
                miniTrack.appendChild(miniFill);

                content.append(nameSpan, miniTrack);

                // Só aparece (via CSS) quando a linha falha e o lote já concluiu.
                const retry = document.createElement('button');
                retry.type = 'button';
                retry.className = 'up-item-retry';
                retry.title = 'Tentar de novo';
                retry.setAttribute('aria-label', 'Tentar de novo');
                retry.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';
                retry.addEventListener('click', () => retryRow(t.ref));

                const status = document.createElement('span');
                status.className = 'up-item-status';

                row.append(icon, content, retry, status);
                listEl.appendChild(row);
                rows[t.ref] = row;
            });
        }

        // ─── Resumo ───────────────────────────────────────────────────────────────

        // A barra PRINCIPAL avança somente quando uma sessão é resolvida (ok ou erro);
        // o progresso de carregamento por estágio vive nas mini bars.
        function refreshSummary() {
            const all = Object.values(rows);
            const doneCount = all.filter(r => r.dataset.state !== 'pending').length;
            const okCount = all.filter(r => r.dataset.state === 'ok').length;
            const failedCount = all.filter(r => r.dataset.state === 'error').length;

            fillEl.style.width = `${Math.round((doneCount / total) * 100)}%`;

            if (doneCount < total) {
                countEl.textContent = `${doneCount}/${total}`;
                return;
            }

            countEl.textContent = `${okCount}/${total}`;
            statusEl.textContent = failedCount === 0 ? copy.allOk : copy.partial(okCount, failedCount);
            footerStatusText.textContent = failedCount === 0
                ? copy.footerAllOk
                : 'Toque em tentar de novo nas que falharam.';

            if (failedCount === 0) {
                footerStatusIcon.innerHTML = ICON_CHECK;
                footerStatusWrapper.classList.add('is-active');
            } else {
                footerStatusIcon.innerHTML = ICON_ALERT;
                footerStatusWrapper.classList.remove('is-active');
            }

            modal.dataset.result = failedCount === 0 ? 'success' : 'partial';
        }

        function applyResult(ref, ok, session) {
            const row = rows[ref];
            if (!row) return;

            stopCreep(ref);
            stopSettle(ref);
            row.dataset.state = ok ? 'ok' : 'error';

            if (ok) onItemOk(targetByRef[ref], session);

            const retryBtn = row.querySelector('.up-item-retry');
            if (retryBtn) retryBtn.disabled = !(batchDone && row.dataset.state === 'error');

            refreshSummary();
        }

        // ─── Disparo ──────────────────────────────────────────────────────────────

        function post(list) {
            window.postMessage({
                source: 'authpack-page',
                type: 'authpack:captureRun',
                packageId, mode, targets: list,
            }, location.origin);
        }

        // Dispara UM alvo e resolve quando a extensão responde por ele. Casamos pelo
        // ref, sem depender do captureDone (evita cruzar com outro lote).
        function captureOne(target) {
            return new Promise((resolve) => {
                let settled = false;

                const finish = (ok, session) => {
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('message', onMsg);
                    clearTimeout(timer);
                    resolve({ ok, session });
                };

                function onMsg(ev) {
                    if (ev.origin !== location.origin) return;
                    const d = ev.data;
                    if (d?.source !== 'authpack-extension') return;
                    if (d.ref !== target.ref) return;

                    if (d.type === 'authpack:captureStage') {
                        handleStage(target.ref, d.current?.stage);
                    } else if (d.type === 'authpack:captureProgress') {
                        const ok = d.current?.status === 'ok';
                        finish(ok, ok ? d.current.session : null);
                    }
                }

                const timer = setTimeout(() => finish(false, null), ITEM_TIMEOUT_MS);
                window.addEventListener('message', onMsg);
                post([target]);
            });
        }

        async function retryRow(ref) {
            const row = rows[ref];
            const target = targetByRef[ref];
            if (!row || !target || !batchDone) return;
            if (row.dataset.state === 'pending') return;   // já em andamento

            row.dataset.state = 'pending';                 // volta ao spinner (CSS esconde o botão)
            stopCreep(ref);
            stopSettle(ref);
            progressByRef[ref] = 0;
            setRowBar(ref, CAP_PCT.loading);
            startCreep(ref, CAP_PCT.interactive);

            const { ok, session } = await captureOne(target);
            applyResult(ref, ok, session);
        }

        // ─── Arranque ─────────────────────────────────────────────────────────────

        modal.dataset.phase = 'progress';
        modal.removeAttribute('data-result');
        closeBtn.disabled = true;
        statusEl.textContent = copy.running;
        footerStatusText.textContent = copy.footerRunning;
        footerStatusIcon.innerHTML = ICON_SPINNER;
        footerStatusWrapper.classList.remove('is-active');
        countEl.textContent = `0/${total}`;
        fillEl.style.width = '0%';

        buildRows();

        // Cada linha começa a andar no t=0 (creep) e é ANCORADA pelos estágios reais
        // quando chegam (dcl → 25%, complete → 50%, settle → 75→100%).
        targets.forEach(t => { setRowBar(t.ref, CAP_PCT.loading); startCreep(t.ref, CAP_PCT.interactive); });

        function onMessage(ev) {
            if (ev.origin !== location.origin) return;
            const d = ev.data;
            if (d?.source !== 'authpack-extension') return;

            if (d.type === 'authpack:captureStage') {
                handleStage(d.ref, d.current?.stage);
            } else if (d.type === 'authpack:captureProgress') {
                applyResult(d.ref, d.current?.status === 'ok', d.current?.session);
            } else if (d.type === 'authpack:captureDone') {
                window.removeEventListener('message', onMessage);
                stopAll();
                Object.values(rows).forEach(r => { if (r.dataset.state === 'pending') r.dataset.state = 'error'; });
                batchDone = true;
                Object.values(rows).forEach(r => {
                    const b = r.querySelector('.up-item-retry');
                    if (b) b.disabled = r.dataset.state !== 'error';
                });
                refreshSummary();
                closeBtn.disabled = false;
            }
        }

        window.addEventListener('message', onMessage);
        closeBtn.onclick = () => {
            window.removeEventListener('message', onMessage);
            stopAll();
            utils.closeModals();
        };

        post(targets);
    }

    return { run, CAP_PCT };
})();
