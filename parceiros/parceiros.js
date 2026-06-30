/**
 * AuthPack — Página de Parceiros (lead capture público)
 *
 * Fluxo: o visitante preenche nome, telefone e o que quer vender e clica em
 * "Tornar-se parceiro". O envio exige login (o e-mail vem da sessão, no backend):
 *   - se NÃO estiver logado, salvamos o formulário e mandamos para o login com
 *     redirect de volta para /parceiros/?submit=1, que retoma o envio ao voltar;
 *   - se estiver logado, enviamos direto via fetchManager.submitLead → POST /api/leads.
 */
(function () {
    'use strict';

    const STORE_KEY = 'ap-partner-lead';
    const LOGIN_RETURN = '/parceiros/?submit=1';

    const wrap = document.getElementById('partner-form-wrap');
    const successEl = document.getElementById('partner-success');
    const nameInput = document.getElementById('partner-name');
    const phoneInput = document.getElementById('partner-phone');
    const whatInput = document.getElementById('partner-what');
    const errorEl = document.getElementById('partner-error');
    const submitBtn = document.getElementById('partner-submit');

    if (!submitBtn) return;

    const defaultBtnHtml = submitBtn.innerHTML;
    let busy = false;

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.classList.add('show');
    }
    function clearError() {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
    }

    function setLoading(on) {
        busy = on;
        submitBtn.disabled = on;
        submitBtn.innerHTML = on ? '<span class="pf-spinner"></span>' : defaultBtnHtml;
    }

    function readForm() {
        return {
            name: (nameInput.value || '').trim(),
            phone: (phoneInput.value || '').trim(),
            what_to_sell: (whatInput.value || '').trim(),
        };
    }

    function fillForm(data) {
        if (!data) return;
        if (data.name) nameInput.value = data.name;
        if (data.phone) phoneInput.value = data.phone;
        if (data.what_to_sell) whatInput.value = data.what_to_sell;
    }

    function readStored() {
        try {
            const raw = sessionStorage.getItem(STORE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }
    function storeLead(data) {
        try { sessionStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {}
    }
    function clearStored() {
        try { sessionStorage.removeItem(STORE_KEY); } catch (e) {}
    }

    function showSuccess() {
        clearStored();
        if (wrap) wrap.style.display = 'none';
        if (successEl) successEl.classList.add('show');
        // limpa o ?submit=1 da URL sem recarregar
        try { history.replaceState(null, '', '/parceiros/'); } catch (e) {}
    }

    async function submit() {
        if (busy) return;
        clearError();

        const data = readForm();
        if (!data.name || !data.phone || !data.what_to_sell) {
            showError('Preencha nome, telefone e o que você quer vender.');
            return;
        }

        setLoading(true);

        try {
            // 1. Exige login — o e-mail do lead vem da sessão (backend).
            const auth = await fetchManager.getAuthenticatedUser();
            if (!auth.ok) {
                storeLead(data);
                window.location.href = '/pages/login/?redirect=' + encodeURIComponent(LOGIN_RETURN);
                return;
            }

            // 2. Envia a candidatura.
            const res = await fetchManager.submitLead(data);
            if (res.ok) {
                showSuccess();
            } else {
                showError((res.result && res.result.errorMessage) || 'Não foi possível enviar. Tente novamente.');
                setLoading(false);
            }
        } catch (err) {
            console.error('partner submit error:', err);
            showError('Erro de conexão. Tente novamente.');
            setLoading(false);
        }
    }

    submitBtn.addEventListener('click', submit);

    // ── Retorno do login ──────────────────────────────────────────────────
    // Pré-preenche com o que foi salvo e, se voltou com ?submit=1, retoma o envio.
    const stored = readStored();
    fillForm(stored);

    const params = new URLSearchParams(window.location.search);
    if (params.get('submit') === '1' && stored) {
        submit();
    }
})();
