/**
 * AuthPack – Estado da extensão (dashboard)
 *
 * Fonte única de verdade para responder "esta ação pode rodar agora?".
 * São dois estados possíveis:
 *
 *   missing → a extensão não está instalada neste navegador.
 *   ready   → está instalada, e portanto autenticada como esta conta.
 *
 * Por que só dois: a extensão não guarda credencial própria. Ela chama a API com
 * o mesmo cookie de sessão desta página, então "instalada" e "na conta certa" são
 * a mesma coisa — divergência de conta deixou de ser possível, e com ela sumiram
 * o handshake de identidade e o fluxo de sincronizar navegador.
 */

const extensionState = (function () {
    'use strict';

    const FLAG_ATTRIBUTE = 'data-authpack-active';
    const WEBSTORE_URL = 'https://chromewebstore.google.com/detail/authpack-studio/fncdgjcpelomihdflipojhkmgoicckpm';

    const STATUS = { READY: 'ready', MISSING: 'missing' };

    // Memoiza a verificação: um clique não deve custar trabalho novo.
    let checkPromise = null;
    let lastResult = null;

    const listeners = [];

    // ─── Helpers ──────────────────────────────────────────────────────────────────

    function isInstalled() {
        return document.documentElement.getAttribute(FLAG_ATTRIBUTE) === '1';
    }

    function emit(result) {
        listeners.forEach((cb) => {
            try { cb(result); } catch (err) { console.error('[extensionState] listener error:', err); }
        });
    }

    // ─── Verificação ──────────────────────────────────────────────────────────────

    function check(force) {
        if (force) checkPromise = null;

        if (!checkPromise) {
            checkPromise = Promise.resolve({
                status: isInstalled() ? STATUS.READY : STATUS.MISSING
            }).then((result) => {
                lastResult = result;
                emit(result);
                return result;
            });
        }

        return checkPromise;
    }

    function invalidate() {
        checkPromise = null;
        lastResult = null;
    }

    // ─── Gate das ações ───────────────────────────────────────────────────────────

    /**
     * Usado por toda ação que depende da extensão. Resolve `true` quando pode
     * seguir; quando não, abre o card de instalação e resolve `false`.
     */
    async function ensure() {
        const result = await check();

        if (result.status === STATUS.READY) return true;

        openRequiredModal();
        return false;
    }

    // ─── Card: extensão necessária ────────────────────────────────────────────────

    function openRequiredModal() {
        const note = document.getElementById('ext-recheck-note');
        if (note) note.hidden = true;
        utils.showModal('extensionRequired');
    }

    async function handleRecheck() {
        const btn = document.getElementById('btn-extension-recheck');
        const note = document.getElementById('ext-recheck-note');
        if (!btn) return;

        btn.classList.add('is-loading');
        btn.disabled = true;
        if (note) note.hidden = true;

        const result = await check(true);

        btn.classList.remove('is-loading');
        btn.disabled = false;

        if (result.status === STATUS.READY) {
            utils.closeModals();
            return;
        }

        if (note) note.hidden = false;
    }

    // ─── Resultado do connect (rede de segurança) ─────────────────────────────────

    // A ponte devolve o desfecho do connect. Sem isto, qualquer falha da extensão
    // não produziria nenhum sinal na tela.
    function initConnectResultListener() {
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            if (event.data?.source !== 'authpack-extension') return;
            if (event.data.type !== 'authpack:connectResult') return;
            if (event.data.ok) return;

            const code = event.data.code;

            // A extensão usa a mesma sessão desta página: um 401 lá significa que a
            // sessão caiu para os dois lados, e recarregar leva ao login.
            if (code === 'unauthorized') {
                alert('Sua sessão expirou. Faça login novamente para continuar.');
                window.location.reload();
                return;
            }

            if (code === 'not_found') {
                alert('Esta sessão não está mais disponível. Atualize o pacote e tente novamente.');
                return;
            }

            alert('Não foi possível conectar à sessão. Tente novamente em instantes.');
        });
    }

    // ─── Init ─────────────────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', () => {
        initConnectResultListener();

        const installBtn = document.getElementById('btn-install-extension');
        if (installBtn) {
            installBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = WEBSTORE_URL;
            });
        }

        const recheckBtn = document.getElementById('btn-extension-recheck');
        if (recheckBtn) recheckBtn.addEventListener('click', handleRecheck);
    });

    return {
        STATUS,
        isInstalled,
        check,
        ensure,
        invalidate,
        openRequiredModal,
        getLastResult: () => lastResult,
        onChange: (cb) => { listeners.push(cb); if (lastResult) cb(lastResult); }
    };
})();
