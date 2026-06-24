// ============================================================================
// "Torne-se um parceiro" — lead capture modal (apenas role 'user')
// Passo 1: vantagens → "Quero vender" → Passo 2: formulário (nome, telefone,
// o que vai vender) → POST /api/leads. O email vem da sessão (backend).
// ============================================================================
(function () {
    'use strict';

    const modal = document.getElementById('partnerModal');
    if (!modal) return;

    // currentUserInfo é um `let` global definido em contentRenderer.js — acessível
    // por nome (não via window). Lê com guarda para evitar ReferenceError.
    function currentName() {
        try {
            return (typeof currentUserInfo !== 'undefined' && currentUserInfo && currentUserInfo.name) || '';
        } catch (e) { return ''; }
    }

    const step1 = document.getElementById('partner-step-1');
    const step2 = document.getElementById('partner-step-2');
    const nameInput = document.getElementById('partner-name');
    const phoneInput = document.getElementById('partner-phone');
    const whatInput = document.getElementById('partner-what');
    const errorEl = document.getElementById('partner-error');
    const submitBtn = document.getElementById('partner-submit');

    // Nota: o dashboard não tem uma classe utilitária `.hidden` global, então
    // alternamos display inline em vez de classes.
    function showStep(n) {
        if (step1) step1.style.display = n === 1 ? '' : 'none';
        if (step2) step2.style.display = n === 2 ? '' : 'none';
    }

    function clearError() {
        if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }
    }
    function showError(msg) {
        if (errorEl) { errorEl.textContent = msg; errorEl.classList.remove('hidden'); }
    }

    // Abre o modal no passo 1, pré-preenchendo o nome a partir do usuário logado.
    window.openPartnerModal = function () {
        clearError();
        if (nameInput) nameInput.value = currentName();
        if (phoneInput) phoneInput.value = '';
        if (whatInput) whatInput.value = '';
        showStep(1);
        utils.showModal('partner');
    };

    document.getElementById('partner-close')?.addEventListener('click', () => utils.closeModals());
    modal.addEventListener('click', (e) => { if (e.target === modal) utils.closeModals(); });

    document.getElementById('partner-want')?.addEventListener('click', () => {
        clearError();
        showStep(2);
        if (nameInput && !nameInput.value) nameInput.value = currentName();
    });

    submitBtn?.addEventListener('click', async () => {
        clearError();
        const name = (nameInput?.value || '').trim();
        const phone = (phoneInput?.value || '').trim();
        const what_to_sell = (whatInput?.value || '').trim();

        if (!name || !phone || !what_to_sell) {
            showError('Preencha nome, telefone e o que você quer vender.');
            return;
        }

        const btnContainer = submitBtn.closest('.buttonContent');
        if (btnContainer) setElementState(btnContainer, 'loading');

        try {
            const res = await fetchManager.submitLead({ name, phone, what_to_sell });
            if (res.ok) {
                utils.closeModals();
                notify('success', 'Candidatura enviada! Entraremos em contato em até 1 dia útil.');
            } else {
                showError((res.result && res.result.errorMessage) || 'Não foi possível enviar. Tente novamente.');
                if (btnContainer) setElementState(btnContainer, 'content');
            }
        } catch (err) {
            console.error('submitLead error:', err);
            showError('Erro de conexão. Tente novamente.');
            if (btnContainer) setElementState(btnContainer, 'content');
        }
    });
})();
