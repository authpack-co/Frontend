/**
 * AuthPack – Estado da extensão (dashboard)
 *
 * Fonte única de verdade para responder "esta ação pode rodar agora?".
 * São três estados possíveis:
 *
 *   missing   → a extensão não está instalada neste navegador.
 *   unsynced  → está instalada, mas o JWT que ela guarda é de outra conta
 *               (ou ela nunca foi ativada). As sessões desta conta não abrem.
 *   ready     → instalada e apontando para a mesma conta logada aqui.
 *
 * Por que o handshake é necessário: quando as contas divergem, o backend
 * responde 404 "Produto indisponível" (a query de sessão é filtrada pelo
 * userId da extensão) — indistinguível de uma sessão realmente apagada. Não dá
 * para descobrir a divergência pelo erro; só perguntando à extensão quem ela é.
 *
 * O handshake não custa rede: a extensão apenas decodifica o payload do JWT que
 * já tem guardado e compara o userId.
 */

const extensionState = (function () {
    'use strict';

    const FLAG_ATTRIBUTE = 'data-authpack-active';
    const WEBSTORE_URL = 'https://chromewebstore.google.com/detail/authpack-studio/fncdgjcpelomihdflipojhkmgoicckpm';

    // Janela para a ponte (content script, roda em document_idle) responder.
    const HANDSHAKE_TIMEOUT_MS = 2500;
    const HANDSHAKE_RETRY_MS = 250;
    // A extensão precisa confirmar que guardou o JWT antes de considerarmos sincronizado.
    const STORE_TIMEOUT_MS = 8000;
    // Teto para o /api/users/info do dashboard responder e liberar o handshake.
    const USER_TIMEOUT_MS = 6000;

    const STATUS = { READY: 'ready', MISSING: 'missing', UNSYNCED: 'unsynced' };

    let currentUser = null;
    let resolveUser = null;
    const userReady = new Promise((resolve) => { resolveUser = resolve; });

    // Memoiza o handshake: um clique não deve custar um round-trip novo.
    let checkPromise = null;
    let lastResult = null;
    let currentDeviceId = null;

    const listeners = [];

    // ─── Helpers ──────────────────────────────────────────────────────────────────

    function isInstalled() {
        return document.documentElement.getAttribute(FLAG_ATTRIBUTE) === '1';
    }

    function post(type, payload) {
        window.postMessage({ source: 'authpack-page', type, ...(payload || {}) }, location.origin);
    }

    // Aguarda uma mensagem da extensão. `onMessage` devolve o valor final (ou
    // undefined para seguir esperando).
    function waitFor(matcher, timeoutMs, onTick) {
        return new Promise((resolve) => {
            let done = false;
            let tickTimer = null;

            function finish(value) {
                if (done) return;
                done = true;
                window.removeEventListener('message', handler);
                clearTimeout(timer);
                clearInterval(tickTimer);
                resolve(value);
            }

            function handler(event) {
                if (event.source !== window) return;
                if (event.data?.source !== 'authpack-extension') return;
                const value = matcher(event.data);
                if (value !== undefined) finish(value);
            }

            window.addEventListener('message', handler);
            const timer = setTimeout(() => finish(undefined), timeoutMs);

            if (onTick) {
                onTick();
                tickTimer = setInterval(onTick, HANDSHAKE_RETRY_MS);
            }
        });
    }

    function emit(result) {
        listeners.forEach((cb) => {
            try { cb(result); } catch (err) { console.error('[extensionState] listener error:', err); }
        });
    }

    // ─── Handshake ────────────────────────────────────────────────────────────────

    async function runCheck() {
        if (!isInstalled()) {
            return { status: STATUS.MISSING, hasAuth: false, deviceId: null };
        }

        // O timeout cobre o caso de /api/users/info ter falhado: sem ele, o gate
        // ficaria pendurado para sempre e o clique não faria nada — exatamente a
        // falha silenciosa que este módulo existe para eliminar.
        const user = await Promise.race([
            userReady,
            new Promise((resolve) => setTimeout(() => resolve(null), USER_TIMEOUT_MS))
        ]);

        // Sem id do usuário não há como comparar. Não bloqueia a ação: seria pior
        // barrar quem está tudo certo por causa de uma falha nossa de carregamento.
        if (!user || !user.id) {
            console.warn('[extensionState] usuário sem id — handshake ignorado');
            return { status: STATUS.READY, hasAuth: true, deviceId: null };
        }

        // A ponte pode ainda não ter carregado; repetimos o whoami até ela responder.
        const reply = await waitFor(
            (data) => (data.type === 'authpack:whoamiResult' ? data : undefined),
            HANDSHAKE_TIMEOUT_MS,
            () => post('authpack:whoami', { expectedUserId: user.id })
        );

        // Sem resposta = extensão presente que não fala o protocolo, ou ponte
        // quebrada. Fail-closed: mostrar o card é melhor que falhar em silêncio.
        if (!reply) {
            return { status: STATUS.UNSYNCED, hasAuth: false, deviceId: null };
        }

        if (!reply.hasAuth) {
            return { status: STATUS.UNSYNCED, hasAuth: false, deviceId: null };
        }

        if (!reply.match) {
            return { status: STATUS.UNSYNCED, hasAuth: true, deviceId: null };
        }

        return { status: STATUS.READY, hasAuth: true, deviceId: reply.deviceId || null };
    }

    function check(force) {
        if (force) checkPromise = null;

        if (!checkPromise) {
            checkPromise = runCheck().then((result) => {
                lastResult = result;
                currentDeviceId = result.deviceId;
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
     * seguir; quando não, abre o card certo e resolve `false`.
     */
    async function ensure() {
        const result = await check();

        if (result.status === STATUS.READY) return true;

        if (result.status === STATUS.MISSING) {
            openRequiredModal();
        } else {
            openSyncModal(result);
        }

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

        if (result.status === STATUS.UNSYNCED) {
            utils.closeModals();
            openSyncModal(result);
            return;
        }

        if (note) note.hidden = false;
    }

    // ─── Card: extensão não sincronizada ──────────────────────────────────────────

    function openSyncModal(result) {
        const subtitle = document.getElementById('ext-sync-subtitle');
        const extValue = document.getElementById('ext-sync-ext-value');
        const extState = document.getElementById('ext-sync-ext-state');
        const emailEl = document.getElementById('ext-sync-email');
        const avatar = document.getElementById('ext-sync-avatar');
        const initials = document.getElementById('ext-sync-initials');

        // A extensão tem um JWT, só que de outra conta — vs. nunca foi ativada.
        const hasOtherAccount = !!(result && result.hasAuth);

        if (subtitle) {
            subtitle.textContent = hasOtherAccount
                ? 'A extensão está conectada a outra conta. Enquanto isso, as sessões desta conta não abrem neste navegador.'
                : 'A extensão está instalada, mas ainda não foi conectada a nenhuma conta neste navegador.';
        }
        if (extValue) extValue.textContent = hasOtherAccount ? 'Outra conta' : 'Nenhuma conta';
        if (extState) extState.textContent = hasOtherAccount ? 'Divergente' : 'Sem conta';

        if (emailEl) emailEl.textContent = (currentUser && currentUser.email) || '—';

        if (avatar && initials) {
            const picture = currentUser && currentUser.picture;
            if (picture) {
                avatar.onerror = () => { avatar.style.display = 'none'; initials.style.display = ''; };
                avatar.onload = () => { avatar.style.display = ''; initials.style.display = 'none'; };
                avatar.src = picture;
            } else {
                avatar.style.display = 'none';
                initials.style.display = '';
                initials.textContent = ((currentUser && currentUser.name) || '?').trim().charAt(0).toUpperCase();
            }
        }

        utils.showModal('extensionSync');
    }

    // Leva direto ao ponto de conserto: Configurações → Conta, com a linha de
    // sincronização destacada. Sem isso o usuário cai numa tela cheia de cards.
    function handleManage() {
        utils.closeModals();
        if (window.settingsModal && typeof settingsModal.openAt === 'function') {
            settingsModal.openAt('conta', { highlight: 'device-sync' });
        }
    }

    // ─── Sincronizar este navegador ───────────────────────────────────────────────

    /**
     * Gera o fingerprint deste navegador, registra o dispositivo na conta logada e
     * entrega o JWT resultante para a extensão guardar.
     *
     * O import do FingerprintJS é dinâmico de propósito: cada `fp.get()` é uma
     * identificação cobrada, e o backend só aceita o evento dentro de 10s
     * (validateFingerprint) — não dá para pré-computar no load da página.
     *
     * Resolve com { ok, code, message }.
     */
    async function syncCurrentDevice() {
        if (!isInstalled()) {
            return { ok: false, code: 'no_extension', message: 'Extensão não encontrada neste navegador.' };
        }

        let visitorId, requestId;
        try {
            const FingerprintJS = await import('https://fp.authpack.co/web/v3/WhjnKdImdrIFK4nCzKLI');
            const fp = await FingerprintJS.load({
                endpoint: ['https://fp.authpack.co', FingerprintJS.defaultEndpoint]
            });
            const identification = await fp.get({ extendedResult: true });
            visitorId = identification.visitorId;
            requestId = identification.requestId;
        } catch (err) {
            console.error('[extensionState] fingerprint error:', err);
            return { ok: false, code: 'fingerprint_failed', message: 'Não foi possível identificar este navegador. Tente novamente.' };
        }

        const res = await fetchManager.activateDevice({ visitorId, requestId });

        if (!res.ok) {
            const code = res.result?.code || 'unknown';
            return {
                ok: false,
                code,
                limit: res.result?.limit,
                message: res.result?.errorMessage || 'Não foi possível sincronizar este dispositivo.'
            };
        }

        const { jwt, deviceId } = res.result.data;

        post('authpack:activationPayload', { jwt });

        const stored = await waitFor(
            (data) => (data.type === 'authpack:payloadStored' ? data : undefined),
            STORE_TIMEOUT_MS
        );

        if (!stored || stored.success !== true) {
            return {
                ok: false,
                code: 'store_failed',
                message: 'A extensão não confirmou o armazenamento. Recarregue a página e tente novamente.'
            };
        }

        currentDeviceId = deviceId || null;
        invalidate();
        const result = await check(true);

        return { ok: true, deviceId: currentDeviceId, status: result.status };
    }

    // ─── Resultado do connect (rede de segurança) ─────────────────────────────────

    // A ponte devolve o desfecho do connect. Sem isto, qualquer falha da extensão
    // (a mais comum sendo conta divergente) não produz nenhum sinal na tela.
    function initConnectResultListener() {
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            if (event.data?.source !== 'authpack-extension') return;
            if (event.data.type !== 'authpack:connectResult') return;
            if (event.data.ok) return;

            const code = event.data.code;

            if (code === 'unauthorized' || code === 'not_found') {
                // Pode ser conta divergente OU sessão apagada — o backend responde igual
                // nos dois casos. Refazemos o handshake: se ele acusar divergência, o card
                // certo aparece; se estiver tudo sincronizado, é problema da sessão mesmo.
                check(true).then((result) => {
                    if (result.status === STATUS.UNSYNCED) {
                        openSyncModal(result);
                    } else if (result.status === STATUS.MISSING) {
                        openRequiredModal();
                    } else {
                        alert('Esta sessão não está mais disponível. Atualize o pacote e tente novamente.');
                    }
                });
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
                // Navegação na própria aba: ao instalar, a extensão abre a página de
                // ativação sozinha (chrome.runtime.onInstalled) e devolve o usuário
                // ao dashboard — não há nada para preservar nesta aba.
                window.location.href = WEBSTORE_URL;
            });
        }

        const recheckBtn = document.getElementById('btn-extension-recheck');
        if (recheckBtn) recheckBtn.addEventListener('click', handleRecheck);

        const manageBtn = document.getElementById('btn-extension-manage');
        if (manageBtn) manageBtn.addEventListener('click', handleManage);
    });

    return {
        STATUS,
        isInstalled,
        check,
        ensure,
        invalidate,
        syncCurrentDevice,
        openSyncModal,
        openRequiredModal,
        getLastResult: () => lastResult,
        getCurrentDeviceId: () => currentDeviceId,
        onChange: (cb) => { listeners.push(cb); if (lastResult) cb(lastResult); },
        // Chamado pelo contentRenderer assim que /api/users/info responde.
        setUser: (user) => { currentUser = user; resolveUser(user); }
    };
})();
