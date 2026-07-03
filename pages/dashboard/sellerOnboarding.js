/* ============================================================================
   Seller Onboarding — wizard self-service de cadastro de recebedor (Pagar.me)
   Exibido dentro de #vitrine-container (preset-onboarding) quando o usuário é
   pending_seller. Ao concluir, cria o recebedor e vira seller.

   As máscaras, validações e o builder de payload são portados de
   pages/admin/onboarding.js (mesmos ids onb-*, mesmo payload
   register_information/default_bank_account), aqui organizados em passos com
   barra de progresso, rascunho em localStorage e etapa de revisão.
   ============================================================================ */
window.SellerOnboarding = (function () {
    'use strict';

    const MOUNT_SEL = '#seller-onboarding-mount';
    const DRAFT_KEY = 'ap-seller-onboarding-draft';

    let built = false;
    let onSubmitStartCb = null;
    let onSubmitSuccessCb = null;
    let onSubmitErrorCb = null;
    let type = 'individual';
    let current = 0;
    let steps = [];

    const STEP_FLOW = {
        individual: ['tipo', 'pf-identity', 'pf-address', 'bank', 'review'],
        corporation: ['tipo', 'pj-company', 'pj-address', 'pj-partner', 'bank', 'review'],
    };
    const STEP_TITLE = {
        'tipo': 'Tipo de conta',
        'pf-identity': 'Seus dados',
        'pf-address': 'Endereço',
        'pj-company': 'Dados da empresa',
        'pj-address': 'Endereço da empresa',
        'pj-partner': 'Representante legal',
        'bank': 'Conta bancária',
        'review': 'Revisão',
    };

    // ── Address field block (reused for PF, PJ company and partner) ──────────
    function addressFields(p) {
        return `
            <div class="form-row">
                <div class="form-group"><label class="form-label">CEP *</label><input type="text" class="form-input" id="${p}-zip_code" placeholder="00000-000" maxlength="9" data-mask="cep" inputmode="numeric"></div>
                <div class="form-group"><label class="form-label">Rua *</label><input type="text" class="form-input" id="${p}-street" placeholder="Rua"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Número *</label><input type="text" class="form-input" id="${p}-street_number" placeholder="Número"></div>
                <div class="form-group"><label class="form-label">Complemento</label><input type="text" class="form-input" id="${p}-complementary" placeholder="Apto, sala..."></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Bairro *</label><input type="text" class="form-input" id="${p}-neighborhood" placeholder="Bairro"></div>
                <div class="form-group"><label class="form-label">Cidade *</label><input type="text" class="form-input" id="${p}-city" placeholder="Cidade"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Estado *</label><input type="text" class="form-input" id="${p}-state" placeholder="UF" maxlength="2"></div>
                <div class="form-group"><label class="form-label">Ponto de referência</label><input type="text" class="form-input" id="${p}-reference_point" placeholder="Próximo a..."></div>
            </div>`;
    }

    function panelsHTML() {
        return `
        <!-- Step: tipo -->
        <div class="so-step" data-panel="tipo">
            <p class="so-lead">Como você vai receber pelas suas vendas?</p>
            <div class="so-type-cards">
                <button type="button" class="so-type-card active" data-type="individual">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    <span class="so-type-name">Pessoa Física</span>
                    <span class="so-type-desc">Recebo com meu CPF</span>
                </button>
                <button type="button" class="so-type-card" data-type="corporation">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
                    <span class="so-type-name">Pessoa Jurídica</span>
                    <span class="so-type-desc">Recebo com CNPJ da empresa</span>
                </button>
            </div>
        </div>

        <!-- Step: PF identity -->
        <div class="so-step" data-panel="pf-identity">
            <div class="form-row">
                <div class="form-group"><label class="form-label">Nome completo *</label><input type="text" class="form-input" id="onb-pf-name" placeholder="Nome completo" autocomplete="name"></div>
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
        </div>

        <!-- Step: PF address -->
        <div class="so-step" data-panel="pf-address">${addressFields('onb-pf')}</div>

        <!-- Step: PJ company -->
        <div class="so-step" data-panel="pj-company">
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
        </div>

        <!-- Step: PJ address -->
        <div class="so-step" data-panel="pj-address">${addressFields('onb-pj')}</div>

        <!-- Step: PJ partner -->
        <div class="so-step" data-panel="pj-partner">
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
            <h4 class="so-section-title">Endereço do representante</h4>
            ${addressFields('onb-partner')}
        </div>

        <!-- Step: bank -->
        <div class="so-step" data-panel="bank">
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
            <p class="so-note">O documento e o tipo do titular são derivados automaticamente dos seus dados de cadastro.</p>
        </div>

        <!-- Step: review -->
        <div class="so-step" data-panel="review">
            <p class="so-lead">Confira seus dados antes de enviar.</p>
            <div id="so-review"></div>
        </div>`;
    }

    function shellHTML() {
        return `
        <div class="so-header">
            <div class="so-trust">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                <span>Seus dados vão direto ao <strong>Pagar.me</strong>, instituição de pagamento regulada pelo Banco Central. A AuthPack não vê nem guarda sua senha bancária.</span>
            </div>
            <div class="so-progress-row">
                <div class="so-progress"><div class="so-progress-bar" id="so-progress-bar"></div></div>
                <span class="so-step-label" id="so-step-label"></span>
            </div>
            <h3 class="so-title" id="so-title"></h3>
        </div>

        <div id="so-panels">${panelsHTML()}</div>

        <p class="so-error hidden" id="so-error"></p>

        <div class="so-footer">
            <button type="button" class="btn btn-secondary" id="so-back">Voltar</button>
            <button type="button" class="btn btn-primary" id="so-next">Continuar</button>
            <button type="button" class="btn btn-primary hidden" id="so-submit">Concluir cadastro</button>
        </div>`;
    }

    // ── Masks (ported) ───────────────────────────────────────────────────────
    function maskCPF(el) { el.addEventListener('input', () => { let v = el.value.replace(/\D/g, '').slice(0, 11); if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4'); else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3'); else if (v.length > 3) v = v.replace(/^(\d{3})(\d{1,3})$/, '$1.$2'); el.value = v; }); }
    function maskCNPJ(el) { el.addEventListener('input', () => { let v = el.value.replace(/\D/g, '').slice(0, 14); if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/, '$1.$2.$3/$4-$5'); else if (v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})$/, '$1.$2.$3/$4'); else if (v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{1,3})$/, '$1.$2.$3'); else if (v.length > 2) v = v.replace(/^(\d{2})(\d{1,3})$/, '$1.$2'); el.value = v; }); }
    function maskCEP(el) { el.addEventListener('input', () => { let v = el.value.replace(/\D/g, '').slice(0, 8); if (v.length > 5) v = v.replace(/^(\d{5})(\d{1,3})$/, '$1-$2'); el.value = v; }); }
    function maskPhone(el) { el.addEventListener('input', () => { let v = el.value.replace(/\D/g, '').slice(0, 11); if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3'); else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4,5})(\d{0,4})$/, '($1) $2-$3'); else if (v.length > 2) v = v.replace(/^(\d{2})(\d{1,5})$/, '($1) $2'); else if (v.length > 0) v = v.replace(/^(\d{1,2})$/, '($1'); el.value = v; }); }
    function maskCurrency(el) { el.addEventListener('input', () => { let raw = el.value.replace(/[^\d,]/g, ''); const num = parseFloat(raw.replace(',', '.')); if (!isNaN(num) && raw !== '') el.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }); }
    function applyInputMasks() {
        const maskMap = { cpf: maskCPF, cnpj: maskCNPJ, cep: maskCEP, phone: maskPhone, currency: maskCurrency };
        document.querySelectorAll(`${MOUNT_SEL} [data-mask]`).forEach((el) => { const fn = maskMap[el.dataset.mask]; if (fn) fn(el); });
    }

    // ── Value getters ────────────────────────────────────────────────────────
    const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const digits = (id) => { const el = document.getElementById(id); return el ? el.value.replace(/\D/g, '') : ''; };
    const cents = (id) => { const el = document.getElementById(id); if (!el) return 0; const raw = el.value.replace(/\./g, '').replace(',', '.'); return Math.round((parseFloat(raw) || 0) * 100); };
    const phoneParts = (id) => { const d = digits(id); return { ddd: d.slice(0, 2), number: d.slice(2) }; };
    function bankCode() { const s = document.getElementById('onb-bank-bank'); if (!s) return ''; if (s.value === 'other') { const o = document.getElementById('onb-bank-bank-other'); return o ? o.value.replace(/\D/g, '') : ''; } return s.value; }
    function formatDateBR(s) { if (!s) return ''; const [y, m, d] = s.split('-'); const year = y ? y.slice(0, 4).padStart(4, '0') : '0000'; return `${d}/${m}/${year}`; }

    // ── Validation (ported) ──────────────────────────────────────────────────
    function isValidCPF(cpf) { if (cpf.length !== 11) return false; if (/^(\d)\1{10}$/.test(cpf)) return false; let s = 0; for (let i = 0; i < 9; i++) s += parseInt(cpf[i]) * (10 - i); let r = (s * 10) % 11; if (r === 10) r = 0; if (r !== parseInt(cpf[9])) return false; s = 0; for (let i = 0; i < 10; i++) s += parseInt(cpf[i]) * (11 - i); r = (s * 10) % 11; if (r === 10) r = 0; return r === parseInt(cpf[10]); }
    function isValidCNPJ(c) { if (c.length !== 14) return false; if (/^(\d)\1{13}$/.test(c)) return false; const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let s = 0; for (let i = 0; i < 12; i++) s += parseInt(c[i]) * w1[i]; let r = s % 11; const d1 = r < 2 ? 0 : 11 - r; if (d1 !== parseInt(c[12])) return false; s = 0; for (let i = 0; i < 13; i++) s += parseInt(c[i]) * w2[i]; r = s % 11; const d2 = r < 2 ? 0 : 11 - r; return d2 === parseInt(c[13]); }
    function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
    const VALID_BR_STATES = new Set(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']);
    const isValidBRState = (uf) => VALID_BR_STATES.has(uf.toUpperCase());
    function isValidDate(s, kind) { if (!s) return false; const date = new Date(s); if (isNaN(date.getTime())) return false; const now = new Date(); if (date < new Date('1900-01-01') || date > now) return false; if (kind === 'birth' && (now - date) / (365.25 * 864e5) < 18) return false; return true; }

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
        document.querySelectorAll(`${MOUNT_SEL} .invalid`).forEach((el) => el.classList.remove('invalid'));
        document.querySelectorAll(`${MOUNT_SEL} .field-error-inline`).forEach((el) => el.remove());
    }
    const fillAddressDefaults = (a) => { if (!a.complementary) a.complementary = 'N/A'; if (!a.reference_point) a.reference_point = 'N/A'; return a; };
    function readAddress(prefix) {
        return fillAddressDefaults({
            street: val(`${prefix}-street`), complementary: val(`${prefix}-complementary`), street_number: val(`${prefix}-street_number`),
            neighborhood: val(`${prefix}-neighborhood`), city: val(`${prefix}-city`), state: val(`${prefix}-state`).toUpperCase(),
            zip_code: digits(`${prefix}-zip_code`), reference_point: val(`${prefix}-reference_point`),
        });
    }
    function validateAddress(a, prefix, label) {
        if (!a.street || !a.street_number || !a.neighborhood || !a.city || !a.state || !a.zip_code) return { error: `Preencha todos os campos do ${label}.` };
        if (a.zip_code.length !== 8) { highlightField(`${prefix}-zip_code`, 'CEP deve ter 8 dígitos'); return { error: 'O CEP deve ter exatamente 8 dígitos.' }; }
        if (!isValidBRState(a.state)) { highlightField(`${prefix}-state`, 'UF inválido'); return { error: 'O estado (UF) é inválido.' }; }
        return null;
    }

    // ── Per-step validation (gate for "Continuar") ───────────────────────────
    function validateStep(key) {
        clearHighlights();
        if (key === 'pf-identity') {
            const name = val('onb-pf-name'), doc = digits('onb-pf-document'), mother = val('onb-pf-mother_name');
            const birth = val('onb-pf-birthdate'), income = cents('onb-pf-monthly_income'), occ = val('onb-pf-professional_occupation');
            if (!name || !doc || !mother || !birth || !income || !occ) return { error: 'Preencha todos os dados pessoais obrigatórios.' };
            if (!isValidCPF(doc)) { highlightField('onb-pf-document', 'CPF inválido'); return { error: 'O CPF informado é inválido.' }; }
            if (!isValidDate(birth, 'birth')) { highlightField('onb-pf-birthdate', 'Data inválida'); return { error: 'Data de nascimento inválida (mínimo 18 anos).' }; }
            const pd = digits('onb-pf-phone'); if (pd.length < 10 || pd.length > 11) { highlightField('onb-pf-phone', 'Telefone incompleto'); return { error: 'Telefone deve ter DDD + 8 ou 9 dígitos.' }; }
            return null;
        }
        if (key === 'pf-address') return validateAddress(readAddress('onb-pf'), 'onb-pf', 'endereço');
        if (key === 'pj-company') {
            const cn = val('onb-pj-company_name'), tn = val('onb-pj-trading_name'), doc = digits('onb-pj-document');
            const rev = cents('onb-pj-annual_revenue'), ctype = val('onb-pj-corporation_type'), found = val('onb-pj-founding_date');
            if (!cn || !tn || !doc || !rev || !ctype || !found) return { error: 'Preencha todos os dados da empresa obrigatórios.' };
            if (!isValidCNPJ(doc)) { highlightField('onb-pj-document', 'CNPJ inválido'); return { error: 'O CNPJ informado é inválido.' }; }
            if (!isValidDate(found)) { highlightField('onb-pj-founding_date', 'Data inválida'); return { error: 'Data de fundação inválida.' }; }
            const pd = digits('onb-pj-phone'); if (pd.length < 10 || pd.length > 11) { highlightField('onb-pj-phone', 'Telefone incompleto'); return { error: 'Telefone da empresa deve ter DDD + 8 ou 9 dígitos.' }; }
            return null;
        }
        if (key === 'pj-address') return validateAddress(readAddress('onb-pj'), 'onb-pj', 'endereço da empresa');
        if (key === 'pj-partner') {
            const name = val('onb-partner-name'), email = val('onb-partner-email'), doc = digits('onb-partner-document');
            const mother = val('onb-partner-mother_name'), birth = val('onb-partner-birthdate'), income = cents('onb-partner-monthly_income'), occ = val('onb-partner-professional_occupation');
            if (!name || !email || !doc || !mother || !birth || !income || !occ) return { error: 'Preencha todos os dados do representante legal.' };
            if (!isValidEmail(email)) { highlightField('onb-partner-email', 'E-mail inválido'); return { error: 'E-mail do representante inválido.' }; }
            if (!isValidCPF(doc)) { highlightField('onb-partner-document', 'CPF inválido'); return { error: 'CPF do representante inválido.' }; }
            if (!isValidDate(birth, 'birth')) { highlightField('onb-partner-birthdate', 'Data inválida'); return { error: 'Data de nascimento do representante inválida (mínimo 18 anos).' }; }
            const pd = digits('onb-partner-phone'); if (pd.length < 10 || pd.length > 11) { highlightField('onb-partner-phone', 'Telefone incompleto'); return { error: 'Telefone do representante deve ter DDD + 8 ou 9 dígitos.' }; }
            return validateAddress(readAddress('onb-partner'), 'onb-partner', 'endereço do representante');
        }
        if (key === 'bank') {
            const holder = val('onb-bank-holder_name'), bank = bankCode();
            const branch = digits('onb-bank-branch_number'), acc = digits('onb-bank-account_number'), accDigit = digits('onb-bank-account_check_digit');
            if (!holder || !bank || !branch || !acc || !accDigit) return { error: 'Preencha todos os dados bancários obrigatórios.' };
            if (bank.length !== 3) return { error: 'O código do banco deve ter 3 dígitos (COMPE). Ex: 260 Nubank, 341 Itaú.' };
            if (branch.length < 1 || branch.length > 4) { highlightField('onb-bank-branch_number', 'Entre 1 e 4 dígitos'); return { error: 'A agência deve ter entre 1 e 4 dígitos.' }; }
            if (acc.length < 1 || acc.length > 13) { highlightField('onb-bank-account_number', 'Máximo 13 dígitos'); return { error: 'O número da conta deve ter no máximo 13 dígitos.' }; }
            if (accDigit.length !== 1) { highlightField('onb-bank-account_check_digit', '1 dígito'); return { error: 'O dígito da conta deve ter 1 dígito.' }; }
            return null;
        }
        return null;
    }

    // ── Final payload builder (ported) ───────────────────────────────────────
    function buildPayload() {
        let register_information = { type };

        if (type === 'individual') {
            const address = readAddress('onb-pf');
            register_information = {
                ...register_information,
                name: val('onb-pf-name'), document: digits('onb-pf-document'), mother_name: val('onb-pf-mother_name'),
                birthdate: formatDateBR(val('onb-pf-birthdate')), monthly_income: cents('onb-pf-monthly_income'),
                professional_occupation: val('onb-pf-professional_occupation'), address,
                phone_numbers: [{ ...phoneParts('onb-pf-phone'), type: 'mobile' }],
            };
        } else {
            const main_address = readAddress('onb-pj');
            const partnerAddress = readAddress('onb-partner');
            register_information = {
                ...register_information,
                company_name: val('onb-pj-company_name'), trading_name: val('onb-pj-trading_name'), document: digits('onb-pj-document'),
                annual_revenue: cents('onb-pj-annual_revenue'), corporation_type: val('onb-pj-corporation_type'),
                founding_date: formatDateBR(val('onb-pj-founding_date')), main_address,
                phone_numbers: [{ ...phoneParts('onb-pj-phone'), type: 'mobile' }],
                managing_partners: [{
                    name: val('onb-partner-name'), email: val('onb-partner-email'), document: digits('onb-partner-document'), type: 'individual',
                    mother_name: val('onb-partner-mother_name'), birthdate: formatDateBR(val('onb-partner-birthdate')),
                    monthly_income: cents('onb-partner-monthly_income'), professional_occupation: val('onb-partner-professional_occupation'),
                    address: partnerAddress, phone_numbers: [{ ...phoneParts('onb-partner-phone'), type: 'mobile' }],
                }],
            };
        }

        const holder_document = type === 'individual' ? digits('onb-pf-document') : digits('onb-pj-document');
        const default_bank_account = {
            holder_name: val('onb-bank-holder_name'),
            holder_type: type === 'individual' ? 'individual' : 'company',
            holder_document,
            bank: bankCode(),
            branch_number: digits('onb-bank-branch_number'),
            account_number: digits('onb-bank-account_number'),
            account_check_digit: digits('onb-bank-account_check_digit'),
            type: (document.getElementById('onb-bank-type') || {}).value || 'checking',
        };
        const branchDigit = digits('onb-bank-branch_check_digit');
        if (branchDigit) default_bank_account.branch_check_digit = branchDigit;

        return { register_information, default_bank_account };
    }

    // ── Pagar.me error mapping (ported) ──────────────────────────────────────
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

    // ── Draft persistence ────────────────────────────────────────────────────
    function saveDraft() {
        try {
            const data = { type, values: {} };
            document.querySelectorAll(`${MOUNT_SEL} input, ${MOUNT_SEL} select`).forEach((el) => { if (el.id) data.values[el.id] = el.value; });
            localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
        } catch (e) {}
    }
    function restoreDraft() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.type) setType(data.type);
            Object.entries(data.values || {}).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = v; });
            const bankOther = document.getElementById('onb-bank-bank-other');
            if (bankOther && document.getElementById('onb-bank-bank')?.value === 'other') bankOther.classList.remove('hidden');
        } catch (e) {}
    }
    function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }

    // ── Error + step chrome ──────────────────────────────────────────────────
    function showError(msg) { const e = document.getElementById('so-error'); if (!e) return; e.textContent = msg; e.classList.remove('hidden'); }
    function clearError() { const e = document.getElementById('so-error'); if (e) { e.textContent = ''; e.classList.add('hidden'); } }

    function setType(next) {
        type = next;
        steps = STEP_FLOW[type];
        document.querySelectorAll(`${MOUNT_SEL} .so-type-card`).forEach((c) => c.classList.toggle('active', c.dataset.type === next));
    }

    function renderReview() {
        const box = document.getElementById('so-review');
        if (!box) return;
        const row = (label, value) => `<div class="so-review-row"><span>${label}</span><strong>${value || '—'}</strong></div>`;
        const bankSel = document.getElementById('onb-bank-bank');
        const bankText = bankSel && bankSel.value === 'other' ? `COMPE ${bankCode()}` : (bankSel?.selectedOptions?.[0]?.textContent || '—');
        let html = '';
        if (type === 'individual') {
            html += `<div class="so-review-group"><h5>Pessoa Física</h5>${row('Nome', val('onb-pf-name'))}${row('CPF', val('onb-pf-document'))}${row('Cidade/UF', `${val('onb-pf-city')} / ${val('onb-pf-state').toUpperCase()}`)}</div>`;
        } else {
            html += `<div class="so-review-group"><h5>Pessoa Jurídica</h5>${row('Razão social', val('onb-pj-trading_name'))}${row('CNPJ', val('onb-pj-document'))}${row('Representante', val('onb-partner-name'))}</div>`;
        }
        html += `<div class="so-review-group"><h5>Conta bancária</h5>${row('Titular', val('onb-bank-holder_name'))}${row('Banco', bankText)}${row('Agência / Conta', `${val('onb-bank-branch_number')} / ${val('onb-bank-account_number')}-${val('onb-bank-account_check_digit')}`)}</div>`;
        box.innerHTML = html;
    }

    function showStep(i) {
        current = Math.max(0, Math.min(i, steps.length - 1));
        const key = steps[current];

        document.querySelectorAll(`${MOUNT_SEL} .so-step`).forEach((p) => p.classList.toggle('is-active', p.dataset.panel === key));

        const pct = steps.length > 1 ? Math.round((current / (steps.length - 1)) * 100) : 100;
        const bar = document.getElementById('so-progress-bar'); if (bar) bar.style.width = `${pct}%`;
        const label = document.getElementById('so-step-label'); if (label) label.textContent = `Passo ${current + 1} de ${steps.length}`;
        const title = document.getElementById('so-title'); if (title) title.textContent = STEP_TITLE[key] || '';

        const isLast = current === steps.length - 1;
        document.getElementById('so-back').classList.toggle('hidden', current === 0);
        document.getElementById('so-next').classList.toggle('hidden', isLast);
        document.getElementById('so-submit').classList.toggle('hidden', !isLast);

        if (key === 'review') renderReview();
        clearError();
        const panels = document.getElementById('so-panels');
        if (panels) panels.scrollTop = 0;
    }

    async function submit() {
        clearError();
        clearHighlights();
        const payload = buildPayload();

        const btn = document.getElementById('so-submit');
        btn.disabled = true; const prev = btn.textContent; btn.textContent = 'Enviando…';

        // Troca para o loading ANTES da chamada: a criação do recebedor no
        // Pagar.me leva alguns segundos e é isso que o loading representa.
        if (typeof onSubmitStartCb === 'function') onSubmitStartCb();

        try {
            const res = await fetchManager.registerSeller(payload);
            if (res.ok) {
                // 201 (criado agora) ou 200 (já existente): o recebedor existe e o
                // usuário já é seller. vitrineManager carrega o painel.
                if (typeof onSubmitSuccessCb === 'function') onSubmitSuccessCb();
                return;
            }
            // Erro do backend/Pagar.me → volta ao formulário e mostra a mensagem.
            if (typeof onSubmitErrorCb === 'function') onSubmitErrorCb();
            let msg = (res.result && res.result.error) || 'Não foi possível completar o cadastro.';
            const hints = formatPagarmeError(res.result && res.result.details);
            if (hints) msg += ` (${hints})`;
            showError(msg);
        } catch (err) {
            console.error('[seller onboarding] submit error:', err);
            if (typeof onSubmitErrorCb === 'function') onSubmitErrorCb();
            showError('Erro de conexão. Tente novamente.');
        } finally {
            btn.disabled = false; btn.textContent = prev;
        }
    }

    function build() {
        if (built) return;
        const mount = document.querySelector(MOUNT_SEL);
        if (!mount) return;
        mount.innerHTML = shellHTML();

        // Type selection
        document.querySelectorAll(`${MOUNT_SEL} .so-type-card`).forEach((card) => {
            card.addEventListener('click', () => { setType(card.dataset.type); saveDraft(); });
        });

        // Bank "other" toggle
        document.getElementById('onb-bank-bank').addEventListener('change', (e) => {
            const o = document.getElementById('onb-bank-bank-other');
            o.classList.toggle('hidden', e.target.value !== 'other');
            if (e.target.value !== 'other') o.value = '';
        });

        // Navigation
        document.getElementById('so-back').addEventListener('click', () => showStep(current - 1));
        document.getElementById('so-next').addEventListener('click', () => {
            const check = validateStep(steps[current]);
            if (check && check.error) { showError(check.error); return; }
            showStep(current + 1);
        });
        document.getElementById('so-submit').addEventListener('click', submit);

        // Draft autosave
        document.querySelector(MOUNT_SEL).addEventListener('input', saveDraft);
        document.querySelector(MOUNT_SEL).addEventListener('change', saveDraft);

        applyInputMasks();
        setType('individual');
        restoreDraft();
        built = true;
    }

    // Public: mount({ onSubmitStart, onSubmitSuccess, onSubmitError }) — render
    // the wizard and (re)bind the submit lifecycle callbacks:
    //   onSubmitStart   → show the "creating" loading (called before the request)
    //   onSubmitSuccess → recipient created, load the seller panel
    //   onSubmitError   → request failed, return to the form
    function mount(opts) {
        onSubmitStartCb = (opts && opts.onSubmitStart) || null;
        onSubmitSuccessCb = (opts && opts.onSubmitSuccess) || null;
        onSubmitErrorCb = (opts && opts.onSubmitError) || null;
        build();
        if (!steps.length) steps = STEP_FLOW[type];
        showStep(0);
    }

    return { mount, clearDraft };
})();
