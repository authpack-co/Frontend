/**
 * AuthPack — Página de Parceiros (CTA "Tornar-se parceiro")
 *
 * Fluxo self-service (sem lead/WhatsApp): o visitante clica em "Tornar-se
 * parceiro". A ação exige login (o e-mail vem da sessão, no backend):
 *   - se NÃO estiver logado, mandamos para o login com redirect de volta para
 *     /parceiros/?intent=1, que retoma a ação ao voltar;
 *   - se estiver logado, chamamos fetchManager.becomeSellerIntent() (grava
 *     role=pending_seller) e redirecionamos para a Home, onde a "Minha Vitrine"
 *     já aparece desbloqueada com o badge "Novo" e o formulário de cadastro.
 */
(function () {
    'use strict';

    const LOGIN_RETURN = '/parceiros/?intent=1';
    const DASHBOARD_URL = '/pages/dashboard/?vitrine=novo';

    const errorEl = document.getElementById('partner-error');
    const submitBtn = document.getElementById('partner-submit');

    if (!submitBtn) return;

    const defaultBtnHtml = submitBtn.innerHTML;
    let busy = false;

    function showError(msg) {
        if (!errorEl) return;
        errorEl.textContent = msg;
        errorEl.classList.add('show');
    }
    function clearError() {
        if (!errorEl) return;
        errorEl.textContent = '';
        errorEl.classList.remove('show');
    }

    function setLoading(on) {
        busy = on;
        submitBtn.disabled = on;
        submitBtn.innerHTML = on ? '<span class="pf-spinner"></span>' : defaultBtnHtml;
    }

    async function becomePartner() {
        if (busy) return;
        clearError();
        setLoading(true);

        try {
            // 1. Exige login — a intenção é gravada na conta (backend).
            const auth = await fetchManager.getAuthenticatedUser();
            if (!auth.ok) {
                window.location.href = '/pages/login/?redirect=' + encodeURIComponent(LOGIN_RETURN);
                return;
            }

            // 2. Marca a intenção (user → pending_seller) e vai para a Home.
            const res = await fetchManager.becomeSellerIntent();
            if (res.ok) {
                window.location.href = DASHBOARD_URL;
            } else {
                showError((res.result && (res.result.error || res.result.errorMessage)) || 'Não foi possível continuar. Tente novamente.');
                setLoading(false);
            }
        } catch (err) {
            console.error('partner intent error:', err);
            showError('Erro de conexão. Tente novamente.');
            setLoading(false);
        }
    }

    submitBtn.addEventListener('click', becomePartner);

    // ── Retorno do login ──────────────────────────────────────────────────
    // Se voltou com ?intent=1, retoma a ação automaticamente.
    const params = new URLSearchParams(window.location.search);
    if (params.get('intent') === '1') {
        becomePartner();
    }
})();
