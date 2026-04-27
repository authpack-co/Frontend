// ============================================================================
// PaymentModal — Shared payment component for Pagar.me
// Supports credit card (with tokenization) and Pix
// Usage: PaymentModal.open({ title, amount, period, onSubmit, pixEnabled })
// ============================================================================

const PaymentModal = (() => {
    let _overlay = null;
    let _onSubmit = null;
    let _pixEnabled = true;

    // ── Build DOM (once) ──
    function ensureDOM() {
        if (_overlay) return;

        _overlay = document.createElement('div');
        _overlay.className = 'pm-overlay';
        _overlay.id = 'payment-modal-overlay';
        _overlay.innerHTML = `
            <div class="pm-modal">
                <div class="pm-header">
                    <h2 class="pm-title" id="pm-title">Pagamento</h2>
                    <button class="pm-close" id="pm-close">&times;</button>
                </div>
                <div class="pm-amount" id="pm-amount"></div>
                
                <div class="pm-row" id="pm-customer-fields">
                    <div class="pm-form-group">
                        <label class="pm-label">CPF ou CNPJ</label>
                        <input class="pm-input" id="pm-doc" type="text" placeholder="000.000.000-00" maxlength="18" inputmode="numeric">
                    </div>
                    <div class="pm-form-group">
                        <label class="pm-label">Celular (com DDD)</label>
                        <input class="pm-input" id="pm-phone" type="text" placeholder="(00) 00000-0000" maxlength="15" inputmode="tel">
                    </div>
                </div>

                <div class="pm-tabs" id="pm-tabs">
                    <button class="pm-tab active" data-tab="card">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>
                        </svg>
                        Cartão de Crédito
                    </button>
                    <button class="pm-tab" data-tab="pix" id="pm-tab-pix">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2v20M2 12h20"/>
                        </svg>
                        Pix
                    </button>
                </div>

                <!-- Card Tab -->
                <div class="pm-tab-content active" id="pm-content-card">
                    <div class="pm-form-group">
                        <label class="pm-label">Número do cartão</label>
                        <input class="pm-input" id="pm-card-number" type="text" placeholder="0000 0000 0000 0000" maxlength="19" inputmode="numeric" autocomplete="cc-number">
                    </div>
                    <div class="pm-form-group">
                        <label class="pm-label">Nome no cartão</label>
                        <input class="pm-input" id="pm-card-holder" type="text" placeholder="Ex: JOAO DA SILVA" autocomplete="cc-name">
                    </div>
                    <div class="pm-row">
                        <div class="pm-form-group">
                            <label class="pm-label">Validade</label>
                            <input class="pm-input" id="pm-card-expiry" type="text" placeholder="MM/AA" maxlength="5" inputmode="numeric" autocomplete="cc-exp">
                        </div>
                        <div class="pm-form-group">
                            <label class="pm-label">CVV</label>
                            <input class="pm-input" id="pm-card-cvv" type="text" placeholder="123" maxlength="4" inputmode="numeric" autocomplete="cc-csc">
                        </div>
                    </div>
                    <button class="pm-submit" id="pm-card-submit">Pagar</button>
                    <div class="pm-error" id="pm-card-error"></div>
                </div>

                <!-- Pix Tab -->
                <div class="pm-tab-content" id="pm-content-pix">
                    <div class="pm-pix-info" id="pm-pix-info">
                        <div class="pm-pix-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <path d="M7 7h.01M7 12h.01M12 7h.01M17 7h.01M12 12h.01M17 12h.01M7 17h.01M12 17h.01M17 17h.01"/>
                            </svg>
                        </div>
                        <p>O código Pix será gerado após clicar no botão abaixo. Você terá 30 minutos para realizar o pagamento.</p>
                    </div>
                    <div class="pm-pix-result" id="pm-pix-result">
                        <img id="pm-pix-qr-img" src="" alt="QR Code Pix">
                        <div class="pm-pix-code" id="pm-pix-code" title="Clique para copiar"></div>
                    </div>
                    <button class="pm-submit pm-pix-submit" id="pm-pix-submit">Gerar Pix</button>
                    <div class="pm-error" id="pm-pix-error"></div>
                </div>

                <!-- Success state (replaces form) -->
                <div class="pm-success" id="pm-success">
                    <div class="pm-success-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 6 9 17l-5-5"/>
                        </svg>
                    </div>
                    <h3 id="pm-success-title">Pagamento confirmado!</h3>
                    <p id="pm-success-msg">Seu acesso já está ativo.</p>
                </div>

                <div class="pm-secure">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    Pagamento seguro via Pagar.me
                </div>
            </div>
        `;

        document.body.appendChild(_overlay);

        // ── Events ──
        _overlay.querySelector('#pm-close').addEventListener('click', close);
        _overlay.addEventListener('click', (e) => { if (e.target === _overlay) close(); });

        // Tab switching
        _overlay.querySelectorAll('.pm-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                _overlay.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
                _overlay.querySelectorAll('.pm-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const contentId = `pm-content-${tab.dataset.tab}`;
                _overlay.querySelector(`#${contentId}`).classList.add('active');
            });
        });

        // Card number formatting
        const cardInput = _overlay.querySelector('#pm-card-number');
        cardInput.addEventListener('input', () => {
            let val = cardInput.value.replace(/\D/g, '');
            val = val.replace(/(.{4})/g, '$1 ').trim();
            cardInput.value = val;
        });

        // Expiry formatting
        const expiryInput = _overlay.querySelector('#pm-card-expiry');
        expiryInput.addEventListener('input', () => {
            let val = expiryInput.value.replace(/\D/g, '');
            if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
            expiryInput.value = val;
        });

        // Doc formatting
        const docInput = _overlay.querySelector('#pm-doc');
        docInput.addEventListener('input', () => {
            let val = docInput.value.replace(/\D/g, '');
            if (val.length <= 11) {
                val = val.replace(/(\d{3})(\d)/, '$1.$2');
                val = val.replace(/(\d{3})(\d)/, '$1.$2');
                val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            } else {
                val = val.replace(/^(\d{2})(\d)/, '$1.$2');
                val = val.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                val = val.replace(/\.(\d{3})(\d)/, '.$1/$2');
                val = val.replace(/(\d{4})(\d)/, '$1-$2');
            }
            docInput.value = val;
        });

        // Phone formatting
        const phoneInput = _overlay.querySelector('#pm-phone');
        phoneInput.addEventListener('input', () => {
            let val = phoneInput.value.replace(/\D/g, '');
            if (val.length > 2) val = '(' + val.substring(0, 2) + ') ' + val.substring(2);
            if (val.length > 9) val = val.substring(0, 9) + '-' + val.substring(9);
            phoneInput.value = val;
        });

        // Card submit
        _overlay.querySelector('#pm-card-submit').addEventListener('click', handleCardSubmit);

        // Pix submit
        _overlay.querySelector('#pm-pix-submit').addEventListener('click', handlePixSubmit);

        // Pix code copy
        _overlay.querySelector('#pm-pix-code').addEventListener('click', () => {
            const code = _overlay.querySelector('#pm-pix-code').textContent;
            navigator.clipboard.writeText(code).catch(() => { });
        });
    }

    // ── Tokenize card via Pagar.me ──
    async function tokenizeCard(cardData) {
        const url = `https://api.pagar.me/core/v5/tokens?appId=${PAGARME_PUBLIC_KEY}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'card',
                card: {
                    number: cardData.number,
                    holder_name: cardData.holder_name,
                    exp_month: cardData.exp_month,
                    exp_year: cardData.exp_year,
                    cvv: cardData.cvv,
                },
            }),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => null);
            const msg = errData?.message || 'Erro ao processar cartão';
            throw new Error(msg);
        }

        const data = await res.json();
        return data.id; // card token
    }

    // ── Extract Customer Data ──
    function getCustomerPayload(tab) {
        const rawDoc = _overlay.querySelector('#pm-doc').value.replace(/\D/g, '');
        const rawPhone = _overlay.querySelector('#pm-phone').value.replace(/\D/g, '');

        if (rawDoc.length < 11) {
            showError(tab, 'CPF ou CNPJ inválido');
            return null;
        }
        if (rawPhone.length < 10) {
            showError(tab, 'Celular inválido (inclua o DDD)');
            return null;
        }

        return {
            document: rawDoc,
            phones: {
                mobile_phone: {
                    country_code: "55",
                    area_code: rawPhone.substring(0, 2),
                    number: rawPhone.substring(2)
                }
            }
        };
    }

    // ── Card submit handler ──
    async function handleCardSubmit() {
        const btn = _overlay.querySelector('#pm-card-submit');
        const errorEl = _overlay.querySelector('#pm-card-error');
        errorEl.classList.remove('visible');

        // Gather values
        const number = _overlay.querySelector('#pm-card-number').value.replace(/\s/g, '');
        const holder = _overlay.querySelector('#pm-card-holder').value.trim();
        const expiry = _overlay.querySelector('#pm-card-expiry').value.trim();
        const cvv = _overlay.querySelector('#pm-card-cvv').value.trim();

        // Validate customer
        const customerPayload = getCustomerPayload('card');
        if (!customerPayload) return;

        // Validate
        if (number.length < 13) return showError('card', 'Número do cartão inválido');
        if (!holder) return showError('card', 'Nome no cartão é obrigatório');
        if (!/^\d{2}\/\d{2}$/.test(expiry)) return showError('card', 'Validade inválida (MM/AA)');
        if (cvv.length < 3) return showError('card', 'CVV inválido');

        const [expMonth, expYear] = expiry.split('/');

        // Loading state
        btn.disabled = true;
        btn.innerHTML = '<div class="pm-spinner"></div> Processando...';

        try {
            const cardToken = await tokenizeCard({
                number,
                holder_name: holder,
                exp_month: parseInt(expMonth, 10),
                exp_year: parseInt('20' + expYear, 10),
                cvv,
            });

            // Call callback
            if (_onSubmit) {
                await _onSubmit({
                    payment_method: 'credit_card',
                    customer: customerPayload,
                    credit_card: {
                        card_token: cardToken,
                    },
                });
            }
        } catch (err) {
            showError('card', err.message || 'Erro ao processar pagamento');
            btn.disabled = false;
            btn.textContent = 'Pagar';
        }
    }

    // ── Pix submit handler ──
    async function handlePixSubmit() {
        const btn = _overlay.querySelector('#pm-pix-submit');
        const errorEl = _overlay.querySelector('#pm-pix-error');
        errorEl.classList.remove('visible');

        btn.disabled = true;
        btn.innerHTML = '<div class="pm-spinner"></div> Gerando Pix...';

        const customerPayload = getCustomerPayload('pix');
        if (!customerPayload) {
            btn.disabled = false;
            btn.textContent = 'Gerar Pix';
            return;
        }

        try {
            if (_onSubmit) {
                await _onSubmit({
                    payment_method: 'pix',
                    customer: customerPayload
                });
            }
        } catch (err) {
            showError('pix', err.message || 'Erro ao gerar Pix');
            btn.disabled = false;
            btn.textContent = 'Gerar Pix';
        }
    }

    // ── Show error ──
    function showError(tab, msg) {
        const id = tab === 'card' ? 'pm-card-error' : 'pm-pix-error';
        const el = _overlay.querySelector(`#${id}`);
        el.textContent = msg;
        el.classList.add('visible');
    }

    // ── Show Pix QR code ──
    function showPixQR(qrCodeUrl, qrCode) {
        const pixInfo = _overlay.querySelector('#pm-pix-info');
        const pixResult = _overlay.querySelector('#pm-pix-result');
        const pixBtn = _overlay.querySelector('#pm-pix-submit');

        pixInfo.style.display = 'none';
        pixBtn.style.display = 'none';
        pixResult.classList.add('visible');

        if (qrCodeUrl) {
            _overlay.querySelector('#pm-pix-qr-img').src = qrCodeUrl;
        }
        if (qrCode) {
            _overlay.querySelector('#pm-pix-code').textContent = qrCode;
        }
    }

    // ── Show success ──
    function showSuccess(title, msg) {
        // Hide tabs and tab content
        _overlay.querySelector('#pm-customer-fields').style.display = 'none';
        _overlay.querySelector('#pm-tabs').style.display = 'none';
        _overlay.querySelectorAll('.pm-tab-content').forEach(c => c.style.display = 'none');

        const successEl = _overlay.querySelector('#pm-success');
        _overlay.querySelector('#pm-success-title').textContent = title || 'Pagamento confirmado!';
        _overlay.querySelector('#pm-success-msg').textContent = msg || 'Seu acesso já está ativo.';
        successEl.style.display = 'block';
    }

    // ── Reset state ──
    function reset() {
        if (!_overlay) return;

        // Clear inputs
        ['pm-doc', 'pm-phone', 'pm-card-number', 'pm-card-holder', 'pm-card-expiry', 'pm-card-cvv'].forEach(id => {
            const el = _overlay.querySelector(`#${id}`);
            if (el) el.value = '';
        });

        // Reset errors
        _overlay.querySelectorAll('.pm-error').forEach(el => {
            el.classList.remove('visible');
            el.textContent = '';
        });

        // Reset buttons
        const cardBtn = _overlay.querySelector('#pm-card-submit');
        cardBtn.disabled = false;
        cardBtn.textContent = 'Pagar';

        const pixBtn = _overlay.querySelector('#pm-pix-submit');
        pixBtn.disabled = false;
        pixBtn.textContent = 'Gerar Pix';
        pixBtn.style.display = '';

        // Reset pix result
        const pixResult = _overlay.querySelector('#pm-pix-result');
        pixResult.classList.remove('visible');
        _overlay.querySelector('#pm-pix-info').style.display = '';

        // Reset success
        _overlay.querySelector('#pm-success').style.display = 'none';

        // Reset tabs visibility
        _overlay.querySelector('#pm-customer-fields').style.display = '';
        _overlay.querySelector('#pm-tabs').style.display = '';
        _overlay.querySelectorAll('.pm-tab-content').forEach(c => c.style.display = '');

        // Set first tab active
        _overlay.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
        _overlay.querySelectorAll('.pm-tab-content').forEach(c => c.classList.remove('active'));
        _overlay.querySelector('.pm-tab[data-tab="card"]').classList.add('active');
        _overlay.querySelector('#pm-content-card').classList.add('active');
    }

    // ── Public API ──

    function open({ title, amount, period, onSubmit, pixEnabled = true } = {}) {
        ensureDOM();
        reset();

        _onSubmit = onSubmit;
        _pixEnabled = pixEnabled;

        // Set title
        _overlay.querySelector('#pm-title').textContent = title || 'Pagamento';

        // Set amount
        const amountEl = _overlay.querySelector('#pm-amount');
        if (amount != null) {
            const formatted = (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            amountEl.innerHTML = formatted + (period ? `<span class="pm-period"> ${period}</span>` : '');
            amountEl.style.display = '';
        } else {
            amountEl.style.display = 'none';
        }

        // Pix tab visibility
        const pixTab = _overlay.querySelector('#pm-tab-pix');
        if (pixEnabled) {
            pixTab.style.display = '';
        } else {
            pixTab.style.display = 'none';
        }

        // Open
        _overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        if (!_overlay) return;
        _overlay.classList.remove('open');
        document.body.style.overflow = '';
        _onSubmit = null;
    }

    return { open, close, showPixQR, showSuccess, showError };
})();
