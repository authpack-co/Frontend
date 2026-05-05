// ============================================================================
// Checkout Page — /pages/checkout/?orderId=...
// Fetches a checkout order and allows payment via card or Pix.
// ============================================================================

(async function () {
    const container = document.getElementById('checkout-state');
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    // State
    let _order = null;
    let _selectedMethod = 'credit_card';
    let _expiryInterval = null;

    // ====================================================================
    // INIT
    // ====================================================================

    if (!orderId) {
        showError('Pedido não encontrado', 'Nenhum ID de pagamento foi informado na URL.');
        return;
    }

    try {
        const res = await fetchManager.getCheckoutOrder(orderId);

        if (!res.ok) {
            if (res.status === 403) {
                showError('Acesso negado', 'Este link de pagamento não pertence à sua conta.');
            } else if (res.status === 401) {
                // Not authenticated — redirect to login
                window.location.href = '/pages/login/?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
                return;
            } else {
                showError('Pedido não encontrado', 'Este link de pagamento é inválido ou foi removido.');
            }
            return;
        }

        _order = res.result?.data;

        if (!_order) {
            showError('Pedido não encontrado', 'Este link de pagamento é inválido ou foi removido.');
            return;
        }

        // Route by status
        switch (_order.status) {
            case 'expired':
                setElementState(container, 'expired');
                return;
            case 'paid':
                setElementState(container, 'paid');
                return;
            case 'failed':
                showError('Pagamento falhou', 'Houve um erro ao processar este pagamento. Tente novamente.');
                return;
            case 'canceled':
                showError('Pagamento cancelado', 'Este pagamento foi cancelado.');
                return;
            case 'processing':
                // Page refreshed while waiting for webhook — resume polling
                showProcessingState();
                pollCheckoutOrder(orderId);
                return;
            case 'pending':
                renderCheckout(_order);
                setupEvents();
                setElementState(container, 'content');
                startExpiryTimer();
                break;
            default:
                showError('Status desconhecido', 'Este pagamento possui um status inesperado.');
        }
    } catch (err) {
        console.error('Checkout init error:', err);
        showError('Erro inesperado', 'Não foi possível carregar o pagamento. Tente novamente.');
    }

    // ====================================================================
    // RENDER
    // ====================================================================

    function renderCheckout(order) {
        const meta = order.metadata || {};
        const paymentMethods = order.payment_methods || ['credit_card'];

        // Product name
        const productName = order.product_name || meta.planName || 'Produto';
        document.getElementById('ck-product-name').textContent = productName;
        document.title = `${productName} — Checkout — AuthPack`;

        // Description
        const descEl = document.getElementById('ck-product-desc');
        if (order.product_description) {
            descEl.textContent = order.product_description;
            descEl.style.display = 'block';
        }

        // Billing badge
        const badge = document.getElementById('ck-billing-badge');
        badge.className = `ck-billing-badge ${order.billing_type}`;
        badge.textContent = order.billing_type === 'subscription' ? 'Assinatura mensal' : 'Pagamento único';

        // Price breakdown
        const totalCents = order.amount_cents || 0;
        const feeCents = meta.platformFeeCents || 0;
        const productCents = meta.productPriceCents || (totalCents - feeCents);

        document.getElementById('ck-breakdown-product-value').textContent = formatCurrency(productCents);
        document.getElementById('ck-breakdown-fee-value').textContent = formatCurrency(feeCents);
        document.getElementById('ck-breakdown-total-value').textContent = formatCurrency(totalCents);

        if (order.billing_type === 'subscription') {
            document.getElementById('ck-breakdown-product-label').textContent = 'Assinatura mensal';
        }

        // Submit button text
        updateSubmitButton();

        // Payment methods visibility
        const methodCard = document.getElementById('ck-method-card');
        const methodPix = document.getElementById('ck-method-pix');

        if (!paymentMethods.includes('credit_card')) {
            methodCard.style.display = 'none';
        }
        if (!paymentMethods.includes('pix')) {
            methodPix.style.display = 'none';
        }

        // If only one method, auto-select it
        if (paymentMethods.length === 1) {
            _selectedMethod = paymentMethods[0];
            document.querySelectorAll('.ck-method').forEach(m => m.classList.remove('active'));
            const activeBtn = document.querySelector(`.ck-method[data-method="${_selectedMethod}"]`);
            if (activeBtn) activeBtn.classList.add('active');
        }

        // Set the initial visible method
        switchPaymentMethod(_selectedMethod);
    }

    function updateSubmitButton() {
        const btn = document.getElementById('ck-submit');
        const totalStr = formatCurrency(_order.amount_cents || 0);

        if (_selectedMethod === 'pix') {
            btn.textContent = `Gerar Pix ${totalStr}`;
            btn.classList.add('ck-submit-pix');
        } else {
            btn.textContent = `Pagar ${totalStr}`;
            btn.classList.remove('ck-submit-pix');
        }
    }

    // ====================================================================
    // EVENTS
    // ====================================================================

    function setupEvents() {
        // Method switching
        document.querySelectorAll('.ck-method').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.ck-method').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                _selectedMethod = tab.dataset.method;
                switchPaymentMethod(_selectedMethod);
                updateSubmitButton();
                hideError();
            });
        });

        // Input formatting
        setupInputFormatting();

        // Submit
        document.getElementById('ck-submit').addEventListener('click', handleSubmit);

        // Pix code copy
        document.getElementById('ck-pix-copy-btn').addEventListener('click', () => {
            const code = document.getElementById('ck-pix-code').textContent;
            if (!code) return;
            navigator.clipboard.writeText(code).then(() => {
                const btn = document.getElementById('ck-pix-copy-btn');
                const original = btn.innerHTML;
                btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Copiado';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.innerHTML = original;
                    btn.classList.remove('copied');
                }, 2000);
            }).catch(() => { });
        });
    }

    function switchPaymentMethod(method) {
        const cardForm = document.getElementById('ck-card-form');
        const pixForm = document.getElementById('ck-pix-form');

        if (method === 'pix') {
            cardForm.style.display = 'none';
            pixForm.style.display = 'block';
        } else {
            cardForm.style.display = 'block';
            pixForm.style.display = 'none';
        }
    }

    function setupInputFormatting() {
        // Card number
        const cardInput = document.getElementById('ck-card-number');
        cardInput.addEventListener('input', () => {
            let val = cardInput.value.replace(/\D/g, '');
            val = val.replace(/(.{4})/g, '$1 ').trim();
            cardInput.value = val;
        });

        // Expiry
        const expiryInput = document.getElementById('ck-card-expiry');
        expiryInput.addEventListener('input', () => {
            let val = expiryInput.value.replace(/\D/g, '');
            if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
            expiryInput.value = val;
        });

        // Doc (CPF/CNPJ)
        const docInput = document.getElementById('ck-doc');
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

        // Phone
        const phoneInput = document.getElementById('ck-phone');
        phoneInput.addEventListener('input', () => {
            let val = phoneInput.value.replace(/\D/g, '');
            if (val.length > 2) val = '(' + val.substring(0, 2) + ') ' + val.substring(2);
            if (val.length > 9) val = val.substring(0, 10) + '-' + val.substring(10);
            phoneInput.value = val;
        });

        // Zip code (CEP)
        const zipInput = document.getElementById('ck-zip');
        if (zipInput) {
            zipInput.addEventListener('input', () => {
                let val = zipInput.value.replace(/\D/g, '');
                if (val.length > 5) val = val.substring(0, 5) + '-' + val.substring(5, 8);
                zipInput.value = val;
            });
        }
    }

    // ====================================================================
    // SUBMIT
    // ====================================================================

    async function handleSubmit() {
        hideError();

        // Validate customer fields
        const customerPayload = getCustomerPayload();
        if (!customerPayload) return;

        if (_selectedMethod === 'credit_card') {
            await handleCardPayment(customerPayload);
        } else {
            await handlePixPayment(customerPayload);
        }
    }

    async function handleCardPayment(customerPayload) {
        const btn = document.getElementById('ck-submit');
        const number = document.getElementById('ck-card-number').value.replace(/\s/g, '');
        const holder = document.getElementById('ck-card-holder').value.trim();
        const expiry = document.getElementById('ck-card-expiry').value.trim();
        const cvv = document.getElementById('ck-card-cvv').value.trim();

        // Validate
        if (number.length < 13) return displayError('Número do cartão inválido');
        if (!holder) return displayError('Nome no cartão é obrigatório');
        if (!/^\d{2}\/\d{2}$/.test(expiry)) return displayError('Validade inválida (MM/AA)');
        if (cvv.length < 3) return displayError('CVV inválido');

        const [expMonth, expYear] = expiry.split('/');

        // Billing address
        const billingAddress = getBillingAddressPayload();
        if (!billingAddress) return;

        btn.disabled = true;
        btn.innerHTML = '<div class="ck-btn-spinner"></div> Processando...';

        try {
            // 1) Tokenize card
            const cardToken = await tokenizeCard({
                number,
                holder_name: holder,
                exp_month: parseInt(expMonth, 10),
                exp_year: parseInt('20' + expYear, 10),
                cvv,
            });

            // 2) Pay order
            const res = await fetchManager.payCheckoutOrder(orderId, {
                payment_method: 'credit_card',
                customer: customerPayload,
                credit_card: {
                    card_token: cardToken,
                    billing_address: billingAddress,
                },
            });

            if (!res.ok) {
                const errMsg = getErrorMessage(res);
                throw new Error(errMsg);
            }

            // Gateway accepted the request — now wait for webhook confirmation
            if (res.result?.processing) {
                pollCheckoutOrder(res.result.orderId || orderId, {
                    onPaid: () => showPaidState(),
                    onFailed: () => {
                        displayError('Pagamento recusado. Tente novamente ou use outro método.');
                        btn.disabled = false;
                        updateSubmitButton();
                    },
                    onExpired: () => setElementState(container, 'expired'),
                    onTimeout: () => {
                        displayError('Estamos aguardando confirmação do gateway. Tente novamente em alguns instantes.');
                        btn.disabled = false;
                        updateSubmitButton();
                    },
                });
                return;
            }

            // Legacy fallback (direct success)
            showPaidState();
        } catch (err) {
            displayError(err.message || 'Erro ao processar pagamento');
            btn.disabled = false;
            updateSubmitButton();
        }
    }

    async function handlePixPayment(customerPayload) {
        const btn = document.getElementById('ck-submit');

        btn.disabled = true;
        btn.innerHTML = '<div class="ck-btn-spinner"></div> Gerando Pix...';

        try {
            const res = await fetchManager.payCheckoutOrder(orderId, {
                payment_method: 'pix',
                customer: customerPayload,
            });

            if (!res.ok) {
                const errMsg = getErrorMessage(res);
                throw new Error(errMsg);
            }

            // Check for Pix QR code in response (synchronous flow)
            const charges = res.result?.charges || [];
            const lastTx = charges[0]?.last_transaction;

            if (lastTx && lastTx.transaction_type === 'pix') {
                showPixQR(lastTx.qr_code_url, lastTx.qr_code);
                btn.style.display = 'none';
                // Poll in background so page auto-updates when Pix is paid
                pollCheckoutOrder(orderId, {
                    onPaid: () => showPaidState(),
                    onFailed: () => showError('Pagamento recusado', 'Houve um problema com seu Pix.'),
                    onExpired: () => setElementState(container, 'expired'),
                });
                return;
            }

            // Fallback if no QR
            showPaidState();
        } catch (err) {
            displayError(err.message || 'Erro ao gerar Pix');
            btn.disabled = false;
            updateSubmitButton();
        }
    }

    // ====================================================================
    // TOKENIZATION
    // ====================================================================

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
            throw new Error(errData?.message || 'Erro ao processar cartão');
        }

        const data = await res.json();
        return data.id;
    }

    // ====================================================================
    // CUSTOMER VALIDATION
    // ====================================================================

    function getCustomerPayload() {
        const rawDoc = document.getElementById('ck-doc').value.replace(/\D/g, '');
        const rawPhone = document.getElementById('ck-phone').value.replace(/\D/g, '');

        if (rawDoc.length < 11) {
            displayError('CPF ou CNPJ inválido');
            return null;
        }
        if (rawPhone.length < 10) {
            displayError('Celular inválido (inclua o DDD)');
            return null;
        }

        return {
            document: rawDoc,
            phones: {
                mobile_phone: {
                    country_code: '55',
                    area_code: rawPhone.substring(0, 2),
                    number: rawPhone.substring(2),
                },
            },
        };
    }

    function getBillingAddressPayload() {
        const zip = document.getElementById('ck-zip').value.replace(/\D/g, '');
        const line1 = document.getElementById('ck-line1').value.trim();
        const line2 = document.getElementById('ck-line2').value.trim();
        const city = document.getElementById('ck-city').value.trim();
        const state = document.getElementById('ck-state').value.trim();
        const country = document.getElementById('ck-country').value.trim().toUpperCase();

        if (!zip || zip.length < 8) {
            displayError('CEP inválido');
            return null;
        }
        if (!line1) {
            displayError('Endereço (rua, número e bairro) é obrigatório');
            return null;
        }
        if (!city) {
            displayError('Cidade é obrigatória');
            return null;
        }
        if (!state || state.length !== 2) {
            displayError('UF inválida');
            return null;
        }
        if (!country || country.length !== 2) {
            displayError('País inválido');
            return null;
        }

        const payload = {
            line_1: line1,
            zip_code: zip,
            city: city,
            state: state,
            country: country,
        };

        if (line2) payload.line_2 = line2;

        return payload;
    }

    // ====================================================================
    // EXPIRY TIMER
    // ====================================================================

    function startExpiryTimer() {
        if (!_order || !_order.expires_at) return;

        const expiryEl = document.getElementById('ck-expiry');
        const textEl = document.getElementById('ck-expiry-text');

        function update() {
            const now = Date.now();
            const expiresAt = new Date(_order.expires_at).getTime();
            const diff = expiresAt - now;

            if (diff <= 0) {
                clearInterval(_expiryInterval);
                setElementState(container, 'expired');
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            textEl.textContent = `Expira em ${formatted}`;

            // Urgent state when < 5 minutes
            if (minutes < 5) {
                expiryEl.classList.add('ck-expiry-urgent');
            }
        }

        update();
        _expiryInterval = setInterval(update, 1000);
    }

    // ====================================================================
    // HELPERS
    // ====================================================================

    function formatCurrency(cents) {
        return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function showError(title, msg) {
        document.getElementById('ck-error-title').textContent = title;
        document.getElementById('ck-error-msg').textContent = msg;
        setElementState(container, 'empty');
    }

    function displayError(msg) {
        const el = document.getElementById('ck-error');
        el.textContent = msg;
        el.classList.add('visible');
    }

    function hideError() {
        const el = document.getElementById('ck-error');
        el.classList.remove('visible');
        el.textContent = '';
    }

    // ====================================================================
    // PROCESSING & POLLING
    // ====================================================================

    function showProcessingState() {
        if (_expiryInterval) clearInterval(_expiryInterval);
        setElementState(container, 'processing');
    }

    function updateProcessingMessage(msg) {
        const el = document.getElementById('ck-processing-msg');
        if (el) el.textContent = msg;
    }

    /**
     * Polls the checkout order until it reaches a terminal state.
     * Uses progressive backoff to avoid hammering the server.
     * @param {string} pollOrderId
     * @param {Object} [callbacks] - Optional callbacks: onPaid, onFailed, onExpired, onTimeout
     */
    async function pollCheckoutOrder(pollOrderId, callbacks = null) {
        const maxAttempts = 60; // ~2 minutes total with backoff

        // Progressive backoff intervals (ms)
        const getInterval = (attempt) => {
            if (attempt < 2) return 2000;
            if (attempt < 4) return 3000;
            if (attempt < 6) return 5000;
            return 10000;
        };

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise((r) => setTimeout(r, getInterval(attempt)));

            try {
                const res = await fetchManager.getCheckoutOrder(pollOrderId);

                if (!res.ok) {
                    console.warn(`pollCheckoutOrder: HTTP ${res.status}, retrying...`);
                    continue;
                }

                const order = res.result?.data;
                const status = order?.status;

                if (status === 'paid') {
                    _order = order; // update local state
                    if (callbacks?.onPaid) { callbacks.onPaid(order); return; }
                    showPaidState();
                    return;
                }

                if (status === 'failed') {
                    if (callbacks?.onFailed) { callbacks.onFailed(order); return; }
                    showError('Pagamento recusado', 'Houve um problema ao processar seu pagamento. Tente novamente ou use outro método.');
                    return;
                }

                if (status === 'expired') {
                    if (callbacks?.onExpired) { callbacks.onExpired(order); return; }
                    setElementState(container, 'expired');
                    return;
                }

                if (status === 'processing' && attempt === 3 && !callbacks) {
                    updateProcessingMessage('Aguardando confirmação do gateway de pagamento...');
                }

                // "pending" or "processing" -> keep polling
            } catch (err) {
                console.warn('pollCheckoutOrder: network error, retrying...', err.message);
            }
        }

        // Timeout
        if (callbacks?.onTimeout) { callbacks.onTimeout(); return; }
        updateProcessingMessage(
            'Estamos aguardando a confirmação do gateway. ' +
            'Você será notificado assim que o pagamento for confirmado.'
        );
    }

    function showPaidState() {
        if (_expiryInterval) clearInterval(_expiryInterval);

        if (_order.origin === 'marketplace') {
            document.getElementById('ck-paid-msg').textContent =
                _order.billing_type === 'subscription'
                    ? 'Sua assinatura foi realizada! Seu acesso será ativado assim que o pagamento for confirmado.'
                    : 'Seu acesso já está ativo.';
        } else {
            document.getElementById('ck-paid-msg').textContent =
                'Sua assinatura do AuthPack Plus está ativa!';
        }

        setElementState(container, 'paid');
    }

    function showPixQR(qrCodeUrl, qrCode) {
        document.getElementById('ck-pix-info').style.display = 'none';
        const resultEl = document.getElementById('ck-pix-result');
        resultEl.classList.add('visible');

        if (qrCodeUrl) {
            document.getElementById('ck-pix-qr-img').src = qrCodeUrl;
        }
        if (qrCode) {
            document.getElementById('ck-pix-code').textContent = qrCode;
        }

        const waitingEl = document.getElementById('ck-pix-waiting');
        const paidEl = document.getElementById('ck-pix-paid');
        if (waitingEl) waitingEl.style.display = 'flex';
        if (paidEl) paidEl.style.display = 'none';
    }

    function getErrorMessage(res) {
        const err = res.result?.error;
        if (err === 'ALREADY_HAS_ACCESS') return 'Você já possui acesso a este produto.';
        if (err === 'PRODUCT_SOLD_OUT') return 'Este produto está esgotado.';
        if (err === 'CHECKOUT_ORDER_EXPIRED') return 'Este pagamento expirou. Realize uma nova compra.';
        if (err === 'ALREADY_SUBSCRIBED_TO_THIS_PLAN') return 'Você já possui uma assinatura ativa.';
        return err || 'Erro ao processar pagamento.';
    }
})();
