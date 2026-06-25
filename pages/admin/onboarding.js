/* ============================================================================
   Admin · Cadastro de vendedor (onboarding Pagar.me)
   Fluxo: buscar conta existente por email → preencher o mesmo formulário de
   recebedor do dashboard (PF/PJ + endereço + sócio + banco) → criar recebedor
   e promover a vendedor via POST /api/admin/sellers/:id/onboarding.

   O formulário e a validação são portados de vitrineManager.js (mantém os
   mesmos ids onb-* e o mesmo payload register_information/default_bank_account),
   mas escopados ao overlay #admin-onb-form.
   ============================================================================ */
(function (AP) {
    'use strict';

    const SCOPE = '#admin-onb-form';
    let built = false;
    let onboardingType = 'individual';
    let targetUser = null;
    let onDoneCb = null;

    // ── Markup ───────────────────────────────────────────────────────────────
    const FORM_HTML = `
        <div class="onboarding-tabs">
            <button class="onboarding-tab active" data-type="individual">Pessoa Física</button>
            <button class="onboarding-tab" data-type="corporation">Pessoa Jurídica</button>
        </div>

        <!-- PF -->
        <div id="onb-pf-fields">
            <h4 class="onboarding-section-title">Dados pessoais</h4>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Nome completo *</label><input type="text" class="form-input" id="onb-pf-name" placeholder="Nome completo"></div>
                <div class="form-group"><label class="form-label">CPF *</label><input type="text" class="form-input" id="onb-pf-document" placeholder="000.000.000-00" maxlength="14" data-mask="cpf" inputmode="numeric"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Nome da mãe *</label><input type="text" class="form-input" id="onb-pf-mother_name" placeholder="Nome da mãe"></div>
                <div class="form-group"><label class="form-label">Data de nascimento *</label><input type="date" class="form-input" id="onb-pf-birthdate"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Renda mensal *</label><div class="input-prefix-wrapper"><span class="input-prefix">R$</span><input type="text" class="form-input" id="onb-pf-monthly_income" placeholder="0,00" data-mask="currency" inputmode="numeric"></div></div>
                <div class="form-group"><label class="form-label">Ocupação profissional *</label><input type="text" class="form-input" id="onb-pf-professional_occupation" placeholder="Ex: Desenvolvedor"></div>
            </div>
            <div class="form-group"><label class="form-label">Celular *</label><input type="text" class="form-input" id="onb-pf-phone" placeholder="(11) 99999-9999" maxlength="15" data-mask="phone" inputmode="tel"></div>

            <h4 class="onboarding-section-title">Endereço</h4>
            <div class="form-row">
                <div class="form-group"><label class="form-label">CEP *</label><input type="text" class="form-input" id="onb-pf-zip_code" placeholder="00000-000" maxlength="9" data-mask="cep" inputmode="numeric"></div>
                <div class="form-group"><label class="form-label">Rua *</label><input type="text" class="form-input" id="onb-pf-street" placeholder="Rua"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Número *</label><input type="text" class="form-input" id="onb-pf-street_number" placeholder="Número"></div>
                <div class="form-group"><label class="form-label">Complemento</label><input type="text" class="form-input" id="onb-pf-complementary" placeholder="Apto, sala..."></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Bairro *</label><input type="text" class="form-input" id="onb-pf-neighborhood" placeholder="Bairro"></div>
                <div class="form-group"><label class="form-label">Cidade *</label><input type="text" class="form-input" id="onb-pf-city" placeholder="Cidade"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Estado *</label><input type="text" class="form-input" id="onb-pf-state" placeholder="UF" maxlength="2"></div>
                <div class="form-group"><label class="form-label">Ponto de referência</label><input type="text" class="form-input" id="onb-pf-reference_point" placeholder="Próximo a..."></div>
            </div>
        </div>

        <!-- PJ -->
        <div id="onb-pj-fields" class="hidden">
            <h4 class="onboarding-section-title">Dados da empresa</h4>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Razão social *</label><input type="text" class="form-input" id="onb-pj-trading_name" placeholder="Razão social"></div>
                <div class="form-group"><label class="form-label">Nome fantasia *</label><input type="text" class="form-input" id="onb-pj-company_name" placeholder="Nome fantasia"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">CNPJ *</label><input type="text" class="form-input" id="onb-pj-document" placeholder="00.000.000/0000-00" maxlength="18" data-mask="cnpj" inputmode="numeric"></div>
                <div class="form-group"><label class="form-label">Receita anual *</label><div class="input-prefix-wrapper"><span class="input-prefix">R$</span><input type="text" class="form-input" id="onb-pj-annual_revenue" placeholder="0,00" data-mask="currency" inputmode="numeric"></div></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Tipo da empresa *</label><input type="text" class="form-input" id="onb-pj-corporation_type" placeholder="Ex: LTDA, S.A."></div>
                <div class="form-group"><label class="form-label">Data de fundação *</label><input type="date" class="form-input" id="onb-pj-founding_date"></div>
            </div>
            <div class="form-group"><label class="form-label">Celular da empresa *</label><input type="text" class="form-input" id="onb-pj-phone" placeholder="(11) 99999-9999" maxlength="15" data-mask="phone" inputmode="tel"></div>

            <h4 class="onboarding-section-title">Endereço da empresa</h4>
            <div class="form-row">
                <div class="form-group"><label class="form-label">CEP *</label><input type="text" class="form-input" id="onb-pj-zip_code" placeholder="00000-000" maxlength="9" data-mask="cep" inputmode="numeric"></div>
                <div class="form-group"><label class="form-label">Rua *</label><input type="text" class="form-input" id="onb-pj-street" placeholder="Rua"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Número *</label><input type="text" class="form-input" id="onb-pj-street_number" placeholder="Número"></div>
                <div class="form-group"><label class="form-label">Complemento</label><input type="text" class="form-input" id="onb-pj-complementary" placeholder="Apto, sala..."></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Bairro *</label><input type="text" class="form-input" id="onb-pj-neighborhood" placeholder="Bairro"></div>
                <div class="form-group"><label class="form-label">Cidade *</label><input type="text" class="form-input" id="onb-pj-city" placeholder="Cidade"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Estado *</label><input type="text" class="form-input" id="onb-pj-state" placeholder="UF" maxlength="2"></div>
                <div class="form-group"><label class="form-label">Ponto de referência</label><input type="text" class="form-input" id="onb-pj-reference_point" placeholder="Próximo a..."></div>
            </div>

            <h4 class="onboarding-section-title">Representante legal</h4>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Nome *</label><input type="text" class="form-input" id="onb-partner-name" placeholder="Nome completo"></div>
                <div class="form-group"><label class="form-label">E-mail *</label><input type="email" class="form-input" id="onb-partner-email" placeholder="email@exemplo.com"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">CPF *</label><input type="text" class="form-input" id="onb-partner-document" placeholder="000.000.000-00" maxlength="14" data-mask="cpf" inputmode="numeric"></div>
                <div class="form-group"><label class="form-label">Nome da mãe *</label><input type="text" class="form-input" id="onb-partner-mother_name" placeholder="Nome da mãe"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Data de nascimento *</label><input type="date" class="form-input" id="onb-partner-birthdate"></div>
                <div class="form-group"><label class="form-label">Renda mensal *</label><div class="input-prefix-wrapper"><span class="input-prefix">R$</span><input type="text" class="form-input" id="onb-partner-monthly_income" placeholder="0,00" data-mask="currency" inputmode="numeric"></div></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Ocupação profissional *</label><input type="text" class="form-input" id="onb-partner-professional_occupation" placeholder="Ex: Gerente"></div>
                <div class="form-group"><label class="form-label">Celular *</label><input type="text" class="form-input" id="onb-partner-phone" placeholder="(11) 99999-9999" maxlength="15" data-mask="phone" inputmode="tel"></div>
            </div>
            <h4 class="onboarding-section-title">Endereço do representante</h4>
            <div class="form-row">
                <div class="form-group"><label class="form-label">CEP *</label><input type="text" class="form-input" id="onb-partner-zip_code" placeholder="00000-000" maxlength="9" data-mask="cep" inputmode="numeric"></div>
                <div class="form-group"><label class="form-label">Rua *</label><input type="text" class="form-input" id="onb-partner-street" placeholder="Rua"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Número *</label><input type="text" class="form-input" id="onb-partner-street_number" placeholder="Número"></div>
                <div class="form-group"><label class="form-label">Complemento</label><input type="text" class="form-input" id="onb-partner-complementary" placeholder="Apto, sala..."></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Bairro *</label><input type="text" class="form-input" id="onb-partner-neighborhood" placeholder="Bairro"></div>
                <div class="form-group"><label class="form-label">Cidade *</label><input type="text" class="form-input" id="onb-partner-city" placeholder="Cidade"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Estado *</label><input type="text" class="form-input" id="onb-partner-state" placeholder="UF" maxlength="2"></div>
                <div class="form-group"><label class="form-label">Ponto de referência</label><input type="text" class="form-input" id="onb-partner-reference_point" placeholder="Próximo a..."></div>
            </div>
        </div>

        <!-- Bank (common) -->
        <h4 class="onboarding-section-title">Conta bancária</h4>
        <div class="form-row">
            <div class="form-group"><label class="form-label">Nome do titular *</label><input type="text" class="form-input" id="onb-bank-holder_name" placeholder="Nome do titular"></div>
            <div class="form-group">
                <label class="form-label">Banco *</label>
                <select class="form-input" id="onb-bank-bank">
                    <option value="">Selecione...</option>
                    <option value="001">001 - Banco do Brasil</option>
                    <option value="033">033 - Santander</option>
                    <option value="104">104 - Caixa Econômica Federal</option>
                    <option value="237">237 - Bradesco</option>
                    <option value="260">260 - Nubank</option>
                    <option value="341">341 - Itaú</option>
                    <option value="077">077 - Inter</option>
                    <option value="212">212 - Banco Original</option>
                    <option value="422">422 - Safra</option>
                    <option value="745">745 - Citibank</option>
                    <option value="041">041 - Banrisul</option>
                    <option value="070">070 - BRB</option>
                    <option value="121">121 - Agibank</option>
                    <option value="136">136 - Unicred</option>
                    <option value="748">748 - Sicredi</option>
                    <option value="756">756 - Sicoob</option>
                    <option value="other">Outro (digitar)</option>
                </select>
                <input type="text" class="form-input hidden" id="onb-bank-bank-other" placeholder="Código COMPE de 3 dígitos (ex: 341)" inputmode="numeric" maxlength="3" style="margin-top:6px;">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group"><label class="form-label">Agência *</label><input type="text" class="form-input" id="onb-bank-branch_number" placeholder="1234" inputmode="numeric" maxlength="4"></div>
            <div class="form-group"><label class="form-label">Dígito da agência</label><input type="text" class="form-input" id="onb-bank-branch_check_digit" placeholder="0" maxlength="1" inputmode="numeric"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label class="form-label">Número da conta *</label><input type="text" class="form-input" id="onb-bank-account_number" placeholder="12345" inputmode="numeric" maxlength="13"></div>
            <div class="form-group"><label class="form-label">Dígito da conta *</label><input type="text" class="form-input" id="onb-bank-account_check_digit" placeholder="0" maxlength="1" inputmode="numeric"></div>
        </div>
        <div class="form-group" style="max-width:50%"><label class="form-label">Tipo da conta *</label>
            <select class="form-input" id="onb-bank-type"><option value="checking">Corrente</option><option value="savings">Poupança</option></select>
        </div>
        <p class="admin-card-sub" style="margin-top:8px">O documento e o tipo do titular são derivados automaticamente dos dados do recebedor.</p>
    `;

    function overlayHTML() {
        return `
        <div class="admin-onb-modal">
            <button class="admin-onb-close" id="admin-onb-close" aria-label="Fechar">×</button>

            <div id="admin-onb-step1" class="admin-onb-step">
                <h2>Cadastrar vendedor</h2>
                <p class="admin-card-sub">A conta já deve existir (a pessoa entra uma vez com o Google). Busque pelo email para começar.</p>
                <div class="admin-onb-lookup">
                    <input type="search" class="admin-input admin-input-grow" id="admin-onb-email" placeholder="email@exemplo.com">
                    <button class="admin-btn admin-btn-primary" id="admin-onb-lookup-btn">Buscar</button>
                </div>
                <div id="admin-onb-lookup-result"></div>
            </div>

            <div id="admin-onb-step2" class="admin-onb-step hidden">
                <h2>Dados do recebedor</h2>
                <div id="admin-onb-target" class="admin-onb-target"></div>
                <div id="admin-onb-form">${FORM_HTML}</div>
                <div class="admin-onb-footer">
                    <span class="field-error hidden" id="admin-onb-error"></span>
                    <button class="admin-btn" id="admin-onb-back">Voltar</button>
                    <button class="admin-btn admin-btn-primary" id="admin-onb-submit">Cadastrar recebedor</button>
                </div>
            </div>
        </div>`;
    }

    // ── Masks ──────────────────────────────────────────────────────────────
    function maskCPF(el) { el.addEventListener('input', () => { let v = el.value.replace(/\D/g, '').slice(0, 11); if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4'); else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3'); else if (v.length > 3) v = v.replace(/^(\d{3})(\d{1,3})$/, '$1.$2'); el.value = v; }); }
    function maskCNPJ(el) { el.addEventListener('input', () => { let v = el.value.replace(/\D/g, '').slice(0, 14); if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/, '$1.$2.$3/$4-$5'); else if (v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})$/, '$1.$2.$3/$4'); else if (v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{1,3})$/, '$1.$2.$3'); else if (v.length > 2) v = v.replace(/^(\d{2})(\d{1,3})$/, '$1.$2'); el.value = v; }); }
    function maskCEP(el) { el.addEventListener('input', () => { let v = el.value.replace(/\D/g, '').slice(0, 8); if (v.length > 5) v = v.replace(/^(\d{5})(\d{1,3})$/, '$1-$2'); el.value = v; }); }
    function maskPhone(el) { el.addEventListener('input', () => { let v = el.value.replace(/\D/g, '').slice(0, 11); if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3'); else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4,5})(\d{0,4})$/, '($1) $2-$3'); else if (v.length > 2) v = v.replace(/^(\d{2})(\d{1,5})$/, '($1) $2'); else if (v.length > 0) v = v.replace(/^(\d{1,2})$/, '($1'); el.value = v; }); }
    function maskCurrency(el) { el.addEventListener('input', () => { let raw = el.value.replace(/[^\d,]/g, ''); const num = parseFloat(raw.replace(',', '.')); if (!isNaN(num) && raw !== '') el.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }); }
    function applyInputMasks() {
        const maskMap = { cpf: maskCPF, cnpj: maskCNPJ, cep: maskCEP, phone: maskPhone, currency: maskCurrency };
        document.querySelectorAll(`${SCOPE} [data-mask]`).forEach((el) => { const fn = maskMap[el.dataset.mask]; if (fn) fn(el); });
    }

    // ── Value getters ────────────────────────────────────────────────────────
    const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const digits = (id) => { const el = document.getElementById(id); return el ? el.value.replace(/\D/g, '') : ''; };
    const cents = (id) => { const el = document.getElementById(id); if (!el) return 0; const raw = el.value.replace(/\./g, '').replace(',', '.'); return Math.round((parseFloat(raw) || 0) * 100); };
    const phoneParts = (id) => { const d = digits(id); return { ddd: d.slice(0, 2), number: d.slice(2) }; };
    function bankCode() { const s = document.getElementById('onb-bank-bank'); if (!s) return ''; if (s.value === 'other') { const o = document.getElementById('onb-bank-bank-other'); return o ? o.value.replace(/\D/g, '') : ''; } return s.value; }
    function formatDateBR(s) { if (!s) return ''; const [y, m, d] = s.split('-'); const year = y ? y.slice(0, 4).padStart(4, '0') : '0000'; return `${d}/${m}/${year}`; }

    // ── Validation ─────────────────────────────────────────────────────────
    function isValidCPF(cpf) { if (cpf.length !== 11) return false; if (/^(\d)\1{10}$/.test(cpf)) return false; let s = 0; for (let i = 0; i < 9; i++) s += parseInt(cpf[i]) * (10 - i); let r = (s * 10) % 11; if (r === 10) r = 0; if (r !== parseInt(cpf[9])) return false; s = 0; for (let i = 0; i < 10; i++) s += parseInt(cpf[i]) * (11 - i); r = (s * 10) % 11; if (r === 10) r = 0; return r === parseInt(cpf[10]); }
    function isValidCNPJ(c) { if (c.length !== 14) return false; if (/^(\d)\1{13}$/.test(c)) return false; const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let s = 0; for (let i = 0; i < 12; i++) s += parseInt(c[i]) * w1[i]; let r = s % 11; const d1 = r < 2 ? 0 : 11 - r; if (d1 !== parseInt(c[12])) return false; s = 0; for (let i = 0; i < 13; i++) s += parseInt(c[i]) * w2[i]; r = s % 11; const d2 = r < 2 ? 0 : 11 - r; return d2 === parseInt(c[13]); }
    function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
    const VALID_BR_STATES = new Set(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']);
    const isValidBRState = (uf) => VALID_BR_STATES.has(uf.toUpperCase());
    function isValidDate(s, type) { if (!s) return false; const date = new Date(s); if (isNaN(date.getTime())) return false; const now = new Date(); if (date < new Date('1900-01-01') || date > now) return false; if (type === 'birth' && (now - date) / (365.25 * 864e5) < 18) return false; return true; }

    function highlightField(id, msg) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('invalid');
        const existing = el.parentElement.querySelector('.field-error-inline');
        if (existing) existing.remove();
        if (msg) { const span = document.createElement('span'); span.className = 'field-error-inline'; span.textContent = msg; el.parentElement.appendChild(span); }
        el.addEventListener('input', function onInput() { el.classList.remove('invalid'); const e = el.parentElement.querySelector('.field-error-inline'); if (e) e.remove(); el.removeEventListener('input', onInput); });
    }
    function clearHighlights() {
        document.querySelectorAll(`${SCOPE} .invalid`).forEach((el) => el.classList.remove('invalid'));
        document.querySelectorAll(`${SCOPE} .field-error-inline`).forEach((el) => el.remove());
    }
    const fillAddressDefaults = (a) => { if (!a.complementary) a.complementary = 'N/A'; if (!a.reference_point) a.reference_point = 'N/A'; return a; };
    function validateAddress(a, prefix, label) {
        if (!a.street || !a.street_number || !a.neighborhood || !a.city || !a.state || !a.zip_code) return { error: `Preencha todos os campos do ${label}.` };
        if (a.zip_code.length !== 8) { highlightField(`${prefix}-zip_code`, 'CEP deve ter 8 dígitos'); return { error: 'O CEP deve ter exatamente 8 dígitos.' }; }
        if (!isValidBRState(a.state)) { highlightField(`${prefix}-state`, 'UF inválido'); return { error: 'O estado (UF) é inválido.' }; }
        return null;
    }

    // ── Payload builder (ported) ───────────────────────────────────────────
    function buildPayload() {
        clearHighlights();
        let register_information = { type: onboardingType };

        if (onboardingType === 'individual') {
            const name = val('onb-pf-name'), doc = digits('onb-pf-document'), mother_name = val('onb-pf-mother_name');
            const rawBirth = val('onb-pf-birthdate'), monthly_income = cents('onb-pf-monthly_income'), occ = val('onb-pf-professional_occupation');
            const { ddd, number } = phoneParts('onb-pf-phone');
            if (!name || !doc || !mother_name || !rawBirth || !monthly_income || !occ) return { error: 'Preencha todos os dados pessoais obrigatórios.' };
            if (!isValidCPF(doc)) { highlightField('onb-pf-document', 'CPF inválido'); return { error: 'O CPF informado é inválido.' }; }
            if (!isValidDate(rawBirth, 'birth')) { highlightField('onb-pf-birthdate', 'Data inválida'); return { error: 'Data de nascimento inválida (mínimo 18 anos).' }; }
            const pd = digits('onb-pf-phone');
            if (pd.length < 10 || pd.length > 11) { highlightField('onb-pf-phone', 'Telefone incompleto'); return { error: 'Telefone deve ter DDD + 8 ou 9 dígitos.' }; }
            const address = fillAddressDefaults({ street: val('onb-pf-street'), complementary: val('onb-pf-complementary'), street_number: val('onb-pf-street_number'), neighborhood: val('onb-pf-neighborhood'), city: val('onb-pf-city'), state: val('onb-pf-state').toUpperCase(), zip_code: digits('onb-pf-zip_code'), reference_point: val('onb-pf-reference_point') });
            const addrErr = validateAddress(address, 'onb-pf', 'endereço'); if (addrErr) return addrErr;
            register_information = { ...register_information, name, document: doc, mother_name, birthdate: formatDateBR(rawBirth), monthly_income, professional_occupation: occ, address, phone_numbers: [{ ddd, number, type: 'mobile' }] };
        } else {
            const company_name = val('onb-pj-company_name'), trading_name = val('onb-pj-trading_name'), doc = digits('onb-pj-document');
            const annual_revenue = cents('onb-pj-annual_revenue'), corporation_type = val('onb-pj-corporation_type'), rawFound = val('onb-pj-founding_date');
            const { ddd, number } = phoneParts('onb-pj-phone');
            if (!company_name || !trading_name || !doc || !annual_revenue || !corporation_type || !rawFound) return { error: 'Preencha todos os dados da empresa obrigatórios.' };
            if (!isValidCNPJ(doc)) { highlightField('onb-pj-document', 'CNPJ inválido'); return { error: 'O CNPJ informado é inválido.' }; }
            if (!isValidDate(rawFound)) { highlightField('onb-pj-founding_date', 'Data inválida'); return { error: 'Data de fundação inválida.' }; }
            const pd = digits('onb-pj-phone');
            if (pd.length < 10 || pd.length > 11) { highlightField('onb-pj-phone', 'Telefone incompleto'); return { error: 'Telefone da empresa deve ter DDD + 8 ou 9 dígitos.' }; }
            const main_address = fillAddressDefaults({ street: val('onb-pj-street'), complementary: val('onb-pj-complementary'), street_number: val('onb-pj-street_number'), neighborhood: val('onb-pj-neighborhood'), city: val('onb-pj-city'), state: val('onb-pj-state').toUpperCase(), zip_code: digits('onb-pj-zip_code'), reference_point: val('onb-pj-reference_point') });
            const maErr = validateAddress(main_address, 'onb-pj', 'endereço da empresa'); if (maErr) return maErr;

            const partnerName = val('onb-partner-name'), partnerEmail = val('onb-partner-email'), partnerDocument = digits('onb-partner-document');
            const partnerMother = val('onb-partner-mother_name'), rawPartnerBirth = val('onb-partner-birthdate'), partnerIncome = cents('onb-partner-monthly_income'), partnerOcc = val('onb-partner-professional_occupation');
            const { ddd: pddd, number: pnum } = phoneParts('onb-partner-phone');
            if (!partnerName || !partnerEmail || !partnerDocument || !partnerMother || !rawPartnerBirth || !partnerIncome || !partnerOcc) return { error: 'Preencha todos os dados do representante legal.' };
            if (!isValidEmail(partnerEmail)) { highlightField('onb-partner-email', 'E-mail inválido'); return { error: 'E-mail do representante inválido.' }; }
            if (!isValidCPF(partnerDocument)) { highlightField('onb-partner-document', 'CPF inválido'); return { error: 'CPF do representante inválido.' }; }
            if (!isValidDate(rawPartnerBirth, 'birth')) { highlightField('onb-partner-birthdate', 'Data inválida'); return { error: 'Data de nascimento do representante inválida (mínimo 18 anos).' }; }
            const ppd = digits('onb-partner-phone');
            if (ppd.length < 10 || ppd.length > 11) { highlightField('onb-partner-phone', 'Telefone incompleto'); return { error: 'Telefone do representante deve ter DDD + 8 ou 9 dígitos.' }; }
            const partnerAddress = fillAddressDefaults({ street: val('onb-partner-street'), complementary: val('onb-partner-complementary'), street_number: val('onb-partner-street_number'), neighborhood: val('onb-partner-neighborhood'), city: val('onb-partner-city'), state: val('onb-partner-state').toUpperCase(), zip_code: digits('onb-partner-zip_code'), reference_point: val('onb-partner-reference_point') });
            const paErr = validateAddress(partnerAddress, 'onb-partner', 'endereço do representante'); if (paErr) return paErr;

            register_information = {
                ...register_information, company_name, trading_name, document: doc, annual_revenue, corporation_type,
                founding_date: formatDateBR(rawFound), main_address, phone_numbers: [{ ddd, number, type: 'mobile' }],
                managing_partners: [{ name: partnerName, email: partnerEmail, document: partnerDocument, type: 'individual', mother_name: partnerMother, birthdate: formatDateBR(rawPartnerBirth), monthly_income: partnerIncome, professional_occupation: partnerOcc, address: partnerAddress, phone_numbers: [{ ddd: pddd, number: pnum, type: 'mobile' }] }],
            };
        }

        // Bank account
        const holder_name = val('onb-bank-holder_name');
        const holder_document = onboardingType === 'individual' ? digits('onb-pf-document') : digits('onb-pj-document');
        const holder_type = onboardingType === 'individual' ? 'individual' : 'company';
        const bank = bankCode();
        const branch_number = digits('onb-bank-branch_number');
        const branch_check_digit = digits('onb-bank-branch_check_digit') || undefined;
        const account_number = digits('onb-bank-account_number');
        const account_check_digit = digits('onb-bank-account_check_digit');
        const accountType = (document.getElementById('onb-bank-type') || {}).value || 'checking';

        if (!holder_name || !bank || !branch_number || !account_number || !account_check_digit) return { error: 'Preencha todos os dados bancários obrigatórios.' };
        if (bank.length !== 3) return { error: 'O código do banco deve ter 3 dígitos (COMPE). Ex: 260 Nubank, 341 Itaú.' };
        if (branch_number.length < 1 || branch_number.length > 4) { highlightField('onb-bank-branch_number', 'Entre 1 e 4 dígitos'); return { error: 'A agência deve ter entre 1 e 4 dígitos.' }; }
        if (account_number.length < 1 || account_number.length > 13) { highlightField('onb-bank-account_number', 'Máximo 13 dígitos'); return { error: 'O número da conta deve ter no máximo 13 dígitos.' }; }
        if (account_check_digit.length !== 1) { highlightField('onb-bank-account_check_digit', '1 dígito'); return { error: 'O dígito da conta deve ter 1 dígito.' }; }

        const default_bank_account = { holder_name, holder_type, holder_document, bank, branch_number, account_number, account_check_digit, type: accountType };
        if (branch_check_digit) default_bank_account.branch_check_digit = branch_check_digit;

        return { register_information, default_bank_account };
    }

    // ── Pagar.me error mapping ───────────────────────────────────────────────
    const FIELD_MAP = {
        holder_name: { label: 'Nome do titular', id: 'onb-bank-holder_name' }, holder_document: { label: 'Documento do titular' },
        branch_number: { label: 'Agência', id: 'onb-bank-branch_number' }, account_number: { label: 'Número da conta', id: 'onb-bank-account_number' },
        account_check_digit: { label: 'Dígito da conta', id: 'onb-bank-account_check_digit' }, branch_check_digit: { label: 'Dígito da agência', id: 'onb-bank-branch_check_digit' },
        bank: { label: 'Banco', id: 'onb-bank-bank' }, name: { label: 'Nome' }, document: { label: 'Documento' }, email: { label: 'E-mail' },
        birthdate: { label: 'Data de nascimento' }, mother_name: { label: 'Nome da mãe' }, monthly_income: { label: 'Renda mensal' }, annual_revenue: { label: 'Receita anual' },
        company_name: { label: 'Nome fantasia' }, trading_name: { label: 'Razão social' }, zip_code: { label: 'CEP' }, street: { label: 'Rua' },
        street_number: { label: 'Número' }, neighborhood: { label: 'Bairro' }, city: { label: 'Cidade' }, state: { label: 'Estado' },
    };
    const MSG_MAP = { 'is invalid': 'valor inválido', 'is required': 'campo obrigatório', 'must be filled': 'campo obrigatório', 'has already been taken': 'já está em uso', 'must be equal to recipient document': 'deve ser igual ao documento do recebedor', 'must be a number': 'deve ser um número', 'size must be': 'tamanho inválido' };
    function formatPagarmeError(details) {
        if (!details || typeof details !== 'object') return null;
        const hints = [];
        const entries = Array.isArray(details) ? details.map((m, i) => [String(i), m]) : Object.entries(details);
        for (const [field, msgs] of entries) {
            const mapped = FIELD_MAP[field]; const label = mapped?.label || field;
            if (mapped?.id) highlightField(mapped.id);
            let t = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
            for (const [en, pt] of Object.entries(MSG_MAP)) t = t.replace(new RegExp(en, 'gi'), pt);
            hints.push(`${label}: ${t}`);
        }
        return hints.length ? hints.join('; ') : null;
    }

    // ── DOM / flow ─────────────────────────────────────────────────────────
    function showError(msg) { const e = document.getElementById('admin-onb-error'); if (!e) return; e.textContent = msg; e.classList.remove('hidden'); }
    function clearError() { const e = document.getElementById('admin-onb-error'); if (e) { e.textContent = ''; e.classList.add('hidden'); } }

    function setType(type) {
        onboardingType = type;
        document.querySelectorAll(`${SCOPE} .onboarding-tab`).forEach((t) => t.classList.toggle('active', t.dataset.type === type));
        document.getElementById('onb-pf-fields').classList.toggle('hidden', type !== 'individual');
        document.getElementById('onb-pj-fields').classList.toggle('hidden', type !== 'corporation');
    }

    function resetForm() {
        setType('individual');
        document.querySelectorAll(`${SCOPE} input, ${SCOPE} select`).forEach((el) => { if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = ''; });
        document.getElementById('onb-bank-bank-other')?.classList.add('hidden');
        clearHighlights();
        clearError();
    }

    function build() {
        if (built) return;
        const overlay = document.createElement('div');
        overlay.className = 'admin-onb-overlay';
        overlay.id = 'admin-onb-overlay';
        overlay.innerHTML = overlayHTML();
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.getElementById('admin-onb-close').addEventListener('click', close);
        document.getElementById('admin-onb-lookup-btn').addEventListener('click', doLookup);
        document.getElementById('admin-onb-email').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLookup(); });
        document.getElementById('admin-onb-back').addEventListener('click', () => { document.getElementById('admin-onb-step2').classList.add('hidden'); document.getElementById('admin-onb-step1').classList.remove('hidden'); });
        document.getElementById('admin-onb-submit').addEventListener('click', submit);

        document.querySelectorAll(`${SCOPE} .onboarding-tab`).forEach((tab) => tab.addEventListener('click', () => setType(tab.dataset.type)));
        document.getElementById('onb-bank-bank').addEventListener('change', (e) => {
            const o = document.getElementById('onb-bank-bank-other');
            o.classList.toggle('hidden', e.target.value !== 'other');
            if (e.target.value !== 'other') o.value = '';
        });
        applyInputMasks();
        built = true;
    }

    // open(onDone) — start from the email lookup (Vendedores tab).
    // open(onDone, presetUser) — skip lookup and go straight to the form for an
    // already-resolved user (Usuários drawer "Tornar vendedor"). presetUser must
    // carry { id, name, email, picture, role, has_recipient }.
    function open(onDone, presetUser) {
        onDoneCb = onDone || null;
        build();
        targetUser = null;
        resetForm();
        document.getElementById('admin-onb-email').value = '';
        document.getElementById('admin-onb-lookup-result').innerHTML = '';
        document.getElementById('admin-onb-overlay').classList.add('open');

        if (presetUser) {
            targetUser = presetUser;
            document.getElementById('admin-onb-target').innerHTML =
                `Cadastrando recebedor para <strong>${AP.escapeHtml(presetUser.name)}</strong> (${AP.escapeHtml(presetUser.email)})`;
            document.getElementById('admin-onb-step1').classList.add('hidden');
            document.getElementById('admin-onb-step2').classList.remove('hidden');
        } else {
            document.getElementById('admin-onb-step2').classList.add('hidden');
            document.getElementById('admin-onb-step1').classList.remove('hidden');
        }
    }
    function close() { document.getElementById('admin-onb-overlay')?.classList.remove('open'); }

    async function doLookup() {
        const email = document.getElementById('admin-onb-email').value.trim();
        const box = document.getElementById('admin-onb-lookup-result');
        if (!email) { box.innerHTML = ''; return; }
        box.innerHTML = AP.loadingHTML;
        const r = await AP.get('/sellers/lookup?email=' + encodeURIComponent(email));
        if (!r.ok) { box.innerHTML = AP.errorHTML(r.errorMessage); return; }
        const u = r.data;

        let blocked = null;
        if (u.role === 'admin') blocked = 'Esse usuário é administrador.';
        else if (u.has_recipient) blocked = `Já possui conta de recebedor (status: ${u.recipient_status}).`;

        box.innerHTML = `
            <div class="admin-onb-found">
                <div class="admin-user-cell">
                    ${AP.avatar(u.picture, u.name)}
                    <div><div class="nm">${AP.escapeHtml(u.name)}</div><div class="em">${AP.escapeHtml(u.email)}</div></div>
                    <span style="margin-left:auto">${AP.roleBadge(u.role)}</span>
                </div>
                ${blocked ? `<div class="admin-empty admin-error" style="padding:12px 0 0">${AP.escapeHtml(blocked)}</div>`
                    : `<button class="admin-btn admin-btn-primary" id="admin-onb-continue" style="margin-top:12px">Continuar para o cadastro</button>`}
            </div>`;
        if (!blocked) {
            document.getElementById('admin-onb-continue').addEventListener('click', () => {
                targetUser = u;
                document.getElementById('admin-onb-target').innerHTML = `Cadastrando recebedor para <strong>${AP.escapeHtml(u.name)}</strong> (${AP.escapeHtml(u.email)})`;
                document.getElementById('admin-onb-step1').classList.add('hidden');
                document.getElementById('admin-onb-step2').classList.remove('hidden');
            });
        }
    }

    async function submit() {
        if (!targetUser) return;
        clearError();
        const payload = buildPayload();
        if (payload.error) { showError(payload.error); return; }

        const btn = document.getElementById('admin-onb-submit');
        btn.disabled = true; btn.textContent = 'Cadastrando…';

        const r = await AP.send('/sellers/' + targetUser.id + '/onboarding', 'POST', payload);
        btn.disabled = false; btn.textContent = 'Cadastrar recebedor';

        if (!r.ok) {
            let msg = r.errorMessage || 'Não foi possível completar o cadastro.';
            const hints = formatPagarmeError(r.details);
            if (hints) msg += ` (${hints})`;
            showError(msg);
            return;
        }
        AP.toast('Vendedor cadastrado com sucesso.', 'success');
        close();
        if (typeof onDoneCb === 'function') onDoneCb();
    }

    AP.openSellerOnboarding = open;
})(window.AP);
