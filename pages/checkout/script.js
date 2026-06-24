// ============================================================================
// Checkout Page — /pages/checkout/?orderId=...
//
// Flow (3-step slide):
//   Step 1 "Método"    — user picks payment method (card | pix)
//   Step 2 "Dados"     — customer details + card/pix fields
//   Step 3 "Pagamento" — result screen:
//      Card → Processing spinner → Success | Error
//      Pix  → QR Code + copy + polling until confirmed
//
// Submit button lives in the right summary column.
// ============================================================================

(async function () {
    const container = document.getElementById('checkout-state');
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    let _order = null;
    let _selectedMethod = 'credit_card';
    let _expiryInterval = null;
    let _currentStep = 1;

    // ====================================================================
    // BOOT
    // ====================================================================

    if (!orderId) {
        showGlobalError('Pedido não encontrado', 'Nenhum ID de pagamento foi informado na URL.');
        return;
    }

    try {
        const res = await fetchManager.getCheckoutOrder(orderId);

        if (!res.ok) {
            if (res.status === 403) showGlobalError('Acesso negado', 'Este link de pagamento não pertence à sua conta.');
            else if (res.status === 401) { window.location.href = '/pages/login/?redirect=' + encodeURIComponent(window.location.pathname + window.location.search); return; }
            else showGlobalError('Pedido não encontrado', 'Este link de pagamento é inválido ou foi removido.');
            return;
        }

        _order = res.result?.data;
        if (!_order) { showGlobalError('Pedido não encontrado', 'Este link de pagamento é inválido ou foi removido.'); return; }

        // Reveal the header breadcrumb into the vitrine (non-blocking)
        loadVitrineCrumb(_order);

        switch (_order.status) {
            case 'expired': setElementState(container, 'expired'); return;
            case 'paid': setElementState(container, 'paid'); return;
            case 'failed': showGlobalError('Pagamento falhou', 'Houve um erro ao processar este pagamento.'); return;
            case 'canceled': showGlobalError('Pagamento cancelado', 'Este pagamento foi cancelado.'); return;
            case 'processing':
                showGlobalProcessing();
                pollOrder(orderId);
                return;
            case 'pending':
                renderCheckout(_order);
                setupEvents();
                setElementState(container, 'content');
                // Set initial slide height after content is visible
                requestAnimationFrame(() => updateSlideHeight());
                startExpiryTimer();
                break;
            default:
                showGlobalError('Status desconhecido', 'Este pagamento possui um status inesperado.');
        }
    } catch (err) {
        console.error('[checkout] init error:', err);
        showGlobalError('Erro inesperado', 'Não foi possível carregar o pagamento. Tente novamente.');
    }

    // ====================================================================
    // RENDER
    // ====================================================================

    function renderCheckout(order) {
        const meta = order.metadata || {};
        const paymentMethods = order.payment_methods || ['credit_card'];
        const totalCents = order.amount_cents || 0;
        const feeCents = meta.platformFeeCents || 0;
        const productCents = meta.productPriceCents || (totalCents - feeCents);

        // Product name
        const productName = order.product_name || meta.planName || 'Produto';
        document.getElementById('ck-product-name').textContent = productName;
        document.title = `${productName} — Checkout`;

        // Price line (e.g. "R$ 997,00 /ano" or "Pagamento único")
        const priceLine = document.getElementById('ck-product-price-line');
        if (order.billing_type === 'subscription') {
            priceLine.textContent = `${formatCurrency(totalCents)} /mês`;
        } else {
            priceLine.textContent = 'Pagamento único';
        }

        // Breakdown
        document.getElementById('ck-breakdown-product-value').textContent = formatCurrency(productCents);
        document.getElementById('ck-breakdown-fee-value').textContent = formatCurrency(feeCents);
        document.getElementById('ck-breakdown-total-value').textContent = formatCurrency(totalCents);
        if (order.billing_type === 'subscription') {
            document.getElementById('ck-breakdown-product-label').textContent = 'Assinatura mensal';
        }

        // Payment methods visibility
        if (!paymentMethods.includes('credit_card')) document.getElementById('ck-m-card-label').style.display = 'none';
        if (!paymentMethods.includes('pix')) document.getElementById('ck-m-pix-label').style.display = 'none';

        // If only one method available, auto-select + skip step 1
        if (paymentMethods.length === 1) {
            _selectedMethod = paymentMethods[0];
            document.getElementById('ck-methods').style.display = 'none';
        }

        // Installments select (one-time + card + allowInstallments)
        const installRow = document.getElementById('ck-installments-row');
        if (order.billing_type !== 'subscription' && meta.allowInstallments) {
            populateInstallmentSelect(totalCents);
            installRow.style.display = '';
        } else {
            installRow.style.display = 'none';
        }

        switchMethod(_selectedMethod);

        // If single method, start on step 2 directly
        if (paymentMethods.length === 1) {
            showStep(2);
        } else {
            updateCTA();
        }
    }

    // ====================================================================
    // EVENTS
    // ====================================================================

    function setupEvents() {
        // Method switching
        document.querySelectorAll('.ck-method').forEach(label => {
            label.addEventListener('click', () => {
                const radio = label.querySelector('input[type="radio"]');
                if (!radio) return;
                document.querySelectorAll('.ck-method').forEach(l => l.classList.remove('ck-method--active'));
                label.classList.add('ck-method--active');
                _selectedMethod = radio.value;
                switchMethod(_selectedMethod);
                updateCTA();
                hideFormError();
            });
        });

        // Input masks
        setupMasks();

        // Installment select
        const installSelect = document.getElementById('ck-installments-select');
        if (installSelect) installSelect.addEventListener('change', () => updateCTA());

        // CTA button (right column)
        document.getElementById('ck-submit').addEventListener('click', handleSubmit);

        // Retry button — go back to step 2 (data) so user can fix card info
        document.getElementById('ck-btn-retry').addEventListener('click', () => {
            showStep(2);
            resetRightColumn();
        });

        // Back button — go to previous step
        document.getElementById('ck-btn-back').addEventListener('click', () => {
            if (_currentStep === 2) {
                showStep(1);
            }
        });

        // Pix copy
        document.getElementById('ck-pix-copy-btn').addEventListener('click', () => {
            const code = document.getElementById('ck-pix-code').textContent;
            if (!code) return;
            navigator.clipboard.writeText(code).then(() => {
                const btn = document.getElementById('ck-pix-copy-btn');
                const orig = btn.innerHTML;
                btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Copiado!`;
                btn.classList.add('copied');
                setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
            }).catch(() => { });
        });
    }

    function switchMethod(method) {
        const cardForm = document.getElementById('ck-card-form');
        const pixNotice = document.getElementById('ck-pix-info-panel');
        const installRow = document.getElementById('ck-installments-row');
        if (method === 'pix') {
            cardForm.style.display = 'none';
            pixNotice.style.display = '';
            if (installRow) installRow.style.display = 'none';
        } else {
            cardForm.style.display = '';
            pixNotice.style.display = 'none';
            const meta = _order?.metadata || {};
            if (_order && _order.billing_type !== 'subscription' && meta.allowInstallments) {
                installRow.style.display = '';
            }
        }
        requestAnimationFrame(() => updateSlideHeight());
    }

    function updateCTA() {
        if (!_order) return;
        const label = document.getElementById('ck-cta-label');
        const icon = document.getElementById('ck-cta-icon');

        if (_currentStep === 1) {
            // Step 1: just "Continue"
            label.textContent = 'Continuar';
        } else if (_currentStep === 2) {
            // Step 2: show payment amount
            if (_selectedMethod === 'pix') {
                label.textContent = `Gerar Pix · ${formatCurrency(_order.amount_cents)}`;
            } else {
                const inst = getSelectedInstallments();
                if (inst > 1) {
                    const per = Math.ceil(_order.amount_cents / inst);
                    label.textContent = `Pagar ${inst}x de ${formatCurrency(per)}`;
                } else {
                    label.textContent = `Pagar ${formatCurrency(_order.amount_cents)}`;
                }
            }
        }
        if (icon) icon.style.display = '';
    }

    // ====================================================================
    // STEP NAVIGATION (3-step slide)
    // ====================================================================

    function showStep(step) {
        const track = document.getElementById('ck-slide-track');
        const s1 = document.getElementById('ck-s1');
        const s2 = document.getElementById('ck-s2');
        const s3 = document.getElementById('ck-s3');
        const line1 = document.getElementById('ck-step-line-1');
        const line2 = document.getElementById('ck-step-line-2');

        _currentStep = step;

        // Slide the track
        track.style.transform = `translateX(-${(step - 1) * 100}%)`;

        // Adapt container height to active panel (after DOM reflow)
        requestAnimationFrame(() => updateSlideHeight());

        // Stepper indicators
        if (step === 1) {
            s1.className = 'ck-step ck-step--active';
            s2.className = 'ck-step ck-step--pending';
            s3.className = 'ck-step ck-step--pending';
            line1.classList.remove('ck-step__line--done');
            line2.classList.remove('ck-step__line--done');
        } else if (step === 2) {
            s1.className = 'ck-step ck-step--done';
            s2.className = 'ck-step ck-step--active';
            s3.className = 'ck-step ck-step--pending';
            line1.classList.add('ck-step__line--done');
            line2.classList.remove('ck-step__line--done');
        } else if (step === 3) {
            s1.className = 'ck-step ck-step--done';
            s2.className = 'ck-step ck-step--done';
            s3.className = 'ck-step ck-step--active';
            line1.classList.add('ck-step__line--done');
            line2.classList.add('ck-step__line--done');
        }

        // Back button visibility (show on step 2 only, if multiple methods)
        const backBtn = document.getElementById('ck-btn-back');
        const paymentMethods = _order?.payment_methods || ['credit_card'];
        backBtn.style.display = (step === 2 && paymentMethods.length > 1) ? 'flex' : 'none';

        // CTA visibility per step
        const submitBtn = document.getElementById('ck-submit');
        if (step === 3) {
            submitBtn.style.display = 'none';
        } else {
            submitBtn.style.display = '';
        }

        // Update CTA label based on step
        updateCTA();
    }

    /** Measures the active slide panel and sets an explicit height on the container */
    function updateSlideHeight() {
        // Ensure DOM has fully reflowed and painted before measuring
        setTimeout(() => {
            const slideContainer = document.querySelector('.ck-slide-container');
            const panels = document.querySelectorAll('.ck-slide');
            const activePanel = panels[_currentStep - 1];
            if (!slideContainer || !activePanel) return;
            const h = activePanel.offsetHeight;
            slideContainer.style.height = h + 'px';
        }, 10);
    }

    // ====================================================================
    // SUBMIT HANDLER
    // ====================================================================

    async function handleSubmit() {
        hideFormError();

        // Step 1 → Step 2: advance to data entry
        if (_currentStep === 1) {
            showStep(2);
            return;
        }

        // Step 2 → Step 3: validate data & pay
        if (_currentStep === 2) {
            const customer = getCustomerPayload();
            if (!customer) return;

            if (_selectedMethod === 'credit_card') {
                await doCardPayment(customer);
            } else {
                await doPixPayment(customer);
            }
        }
    }

    // ── Card Payment ──────────────────────────────────────────────────
    async function doCardPayment(customer) {
        const number = document.getElementById('ck-card-number').value.replace(/\s/g, '');
        const holder = document.getElementById('ck-card-holder').value.trim();
        const expiry = document.getElementById('ck-card-expiry').value.trim();
        const cvv = document.getElementById('ck-card-cvv').value.trim();

        if (number.length < 13) return showFormError('Número do cartão inválido.');
        if (!holder) return showFormError('Nome no cartão é obrigatório.');
        if (!/^\d{2}\/\d{2}$/.test(expiry)) return showFormError('Validade inválida (MM/AA).');
        if (cvv.length < 3) return showFormError('CVV inválido.');

        const billing = getBillingAddress();
        if (!billing) return;

        const [expM, expY] = expiry.split('/');

        showStep(3);
        showResultState('processing');
        setCTALoading(true);

        let cardToken;
        try {
            cardToken = await tokenizeCard({ number, holder_name: holder, exp_month: parseInt(expM), exp_year: parseInt('20' + expY), cvv });
        } catch (err) {
            showCardError(err.message || 'Erro ao processar cartão.');
            return;
        }

        const installments = getSelectedInstallments();
        await executeCardPayment(customer, cardToken, billing, installments);
    }

    async function executeCardPayment(customer, cardToken, billing, installments) {
        showResultState('processing');
        setCTALoading(true);

        try {
            const res = await fetchManager.payCheckoutOrder(orderId, {
                payment_method: 'credit_card',
                customer,
                installments,
                credit_card: { card_token: cardToken, billing_address: billing },
            });

            if (!res.ok) {
                if (res.status === 410) { setElementState(container, 'expired'); return; }
                throw new Error(getErrMsg(res));
            }

            if (res.result?.processing) {
                pollOrder(res.result.orderId || orderId, {
                    onPaid: () => showCardSuccess(),
                    onFailed: (msg) => showCardError(msg),
                    onExpired: () => setElementState(container, 'expired'),
                    onTimeout: () => showCardError('Aguardando confirmação do gateway. Tente novamente em instantes.'),
                });
                return;
            }

            showCardSuccess();

        } catch (err) {
            showCardError(err.message || 'Erro ao processar pagamento.');
        }
    }

    // ── Installment Select ─────────────────────────────────────────
    function populateInstallmentSelect(totalCents) {
        const select = document.getElementById('ck-installments-select');
        if (!select) return;
        const minPerInstallment = 500;
        const maxCount = Math.max(1, Math.min(12, Math.floor(totalCents / minPerInstallment)));
        select.innerHTML = '';
        for (let i = 1; i <= maxCount; i++) {
            const per = Math.ceil(totalCents / i);
            const label = i === 1
                ? `1x de ${formatCurrency(per)} sem juros`
                : `${i}x de ${formatCurrency(per)} sem juros`;
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = label;
            select.appendChild(opt);
        }
        select.value = '1';
    }

    function getSelectedInstallments() {
        const select = document.getElementById('ck-installments-select');
        if (!select || select.closest('.ck-installments-row')?.style.display === 'none') return 1;
        return parseInt(select.value, 10) || 1;
    }

    /**
     * Finds the Pix transaction (with QR fields) anywhere in a pay response,
     * regardless of how the gateway/backend nests it.
     * Pagar.me v5 shape: { charges: [{ last_transaction: { qr_code, qr_code_url } }] }
     */
    function extractPixTransaction(body) {
        if (!body || typeof body !== 'object') return null;

        const charges = body.charges || body.transactions || [];
        for (const charge of charges) {
            const tx = charge?.last_transaction || charge;
            if (tx && (tx.qr_code_url || tx.qr_code)) return tx;
        }

        // Some integrations put the QR fields directly on the order/response.
        if (body.qr_code_url || body.qr_code) return body;
        if (body.pix && (body.pix.qr_code_url || body.pix.qr_code)) return body.pix;

        return null;
    }

    // ── Pix Payment ───────────────────────────────────────────────────
    async function doPixPayment(customer) {
        // → Step 3: processing spinner
        showStep(3);
        showResultState('processing');
        setCTALoading(true);

        try {
            const res = await fetchManager.payCheckoutOrder(orderId, {
                payment_method: 'pix',
                customer,
            });

            if (!res.ok) {
                if (res.status === 410) { setElementState(container, 'expired'); return; }
                throw new Error(getErrMsg(res));
            }

            // The pay endpoint may wrap the order under `data`/`order` or return it flat.
            const body = res.result?.data || res.result?.order || res.result || {};
            const pix = extractPixTransaction(body);

            if (pix && (pix.qr_code_url || pix.qr_code)) {
                showPixQR(pix.qr_code_url, pix.qr_code);
                hideCTA();

                pollOrder(orderId, {
                    onPaid: () => showPixConfirmed(),
                    onFailed: () => showGlobalError('Pix recusado', 'Houve um problema com seu Pix.'),
                    onExpired: () => setElementState(container, 'expired'),
                });
                return;
            }

            // No QR in the response — surface it instead of silently "succeeding".
            console.error('[checkout] Pix response without QR code:', res.result);
            throw new Error('O QR Code do Pix não foi retornado pelo gateway. Tente novamente.');

        } catch (err) {
            // Back to step 2 on pix generation error
            showStep(2);
            showFormError(err.message || 'Erro ao gerar Pix.');
            resetRightColumn();
        }
    }

    // ====================================================================
    // RESULT STATE HELPERS
    // ====================================================================

    function showResultState(state) {
        const processing = document.getElementById('ck-state-processing');
        const success = document.getElementById('ck-state-success');
        const error = document.getElementById('ck-state-error');
        const pix = document.getElementById('ck-state-pix');

        processing.style.display = state === 'processing' ? 'flex' : 'none';
        success.style.display = state === 'success' ? 'flex' : 'none';
        error.style.display = state === 'error' ? 'flex' : 'none';
        pix.style.display = state === 'pix' ? 'block' : 'none';

        // Recalculate height after content change
        requestAnimationFrame(() => updateSlideHeight());
    }

    function showCardSuccess() {
        if (_expiryInterval) clearInterval(_expiryInterval);

        let msg = 'Seu acesso já está ativo.';
        if (_order?.origin === 'marketplace') {
            msg = _order.billing_type === 'subscription'
                ? 'Sua assinatura foi realizada! O acesso será ativado assim que o pagamento for confirmado.'
                : 'Seu acesso já está ativo.';
        } else {
            msg = 'Sua assinatura do AuthPack Plus está ativa!';
        }

        document.getElementById('ck-success-msg').textContent = msg;
        showResultState('success');
        showDashboardButton();
    }

    function showCardError(msg) {
        document.getElementById('ck-error-detail').textContent = msg || 'Verifique os dados e tente novamente.';
        showResultState('error');
        showRetryButton();
    }

    function showPixQR(qrUrl, qrCode) {
        showResultState('pix');
        const img = document.getElementById('ck-pix-qr-img');
        // Re-measure the slide height once the QR image has actually loaded,
        // so the container doesn't collapse/clip while the image is fetching.
        img.onload = () => updateSlideHeight();
        if (qrUrl) img.src = qrUrl;
        if (qrCode) document.getElementById('ck-pix-code').textContent = qrCode;
        document.getElementById('ck-pix-waiting').classList.add('visible');
    }

    function showPixConfirmed() {
        if (_expiryInterval) clearInterval(_expiryInterval);
        document.getElementById('ck-pix-waiting').classList.remove('visible');
        document.getElementById('ck-pix-paid').classList.add('visible');
        showDashboardButton();
    }

    // ====================================================================
    // RIGHT-COLUMN BUTTON STATE
    // ====================================================================

    function setCTALoading(loading) {
        const btn = document.getElementById('ck-submit');
        const label = document.getElementById('ck-cta-label');
        const icon = document.getElementById('ck-cta-icon');
        const spinner = document.getElementById('ck-cta-spinner');

        btn.disabled = loading;
        label.textContent = loading ? 'Processando...' : '';
        icon.style.display = loading ? 'none' : '';
        spinner.style.display = loading ? 'flex' : 'none';

        if (!loading) updateCTA();
    }

    function hideCTA() {
        document.getElementById('ck-submit').style.display = 'none';
    }

    function showRetryButton() {
        const submit = document.getElementById('ck-submit');
        const retry = document.getElementById('ck-btn-retry');
        submit.style.display = 'none';
        retry.style.display = 'flex';
    }

    function showDashboardButton() {
        const submit = document.getElementById('ck-submit');
        const dashboard = document.getElementById('ck-btn-dashboard');
        submit.style.display = 'none';

        if (_order?.origin === 'marketplace') {
            const pkgId = _order.package_id || _order.metadata?.packageId;
            if (pkgId) {
                dashboard.href = `/pages/dashboard/?newProduct=${pkgId}`;
            }
        }

        dashboard.style.display = 'flex';
    }

    function resetRightColumn() {
        document.getElementById('ck-submit').style.display = '';
        document.getElementById('ck-btn-retry').style.display = 'none';
        document.getElementById('ck-btn-dashboard').style.display = 'none';
        const btn = document.getElementById('ck-submit');
        btn.disabled = false;
        document.getElementById('ck-cta-spinner').style.display = 'none';
        document.getElementById('ck-cta-icon').style.display = '';
        const select = document.getElementById('ck-installments-select');
        if (select) select.value = '1';
        updateCTA();
    }

    // ====================================================================
    // VALIDATION
    // ====================================================================

    function getCustomerPayload() {
        const rawDoc = document.getElementById('ck-doc').value.replace(/\D/g, '');
        const rawPhone = document.getElementById('ck-phone').value.replace(/\D/g, '');

        if (rawDoc.length < 11) { showFormError('CPF ou CNPJ inválido.'); return null; }
        if (rawPhone.length < 10) { showFormError('Celular inválido (inclua o DDD).'); return null; }

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

    function getBillingAddress() {
        const zip = document.getElementById('ck-zip').value.replace(/\D/g, '');
        const line1 = document.getElementById('ck-line1').value.trim();
        const line2 = document.getElementById('ck-line2').value.trim();
        const city = document.getElementById('ck-city').value.trim();
        const state = document.getElementById('ck-state').value.trim();
        const country = document.getElementById('ck-country').value.trim().toUpperCase();

        if (!zip || zip.length < 8) { showFormError('CEP inválido.'); return null; }
        if (!line1) { showFormError('Endereço (rua, número e bairro) é obrigatório.'); return null; }
        if (!city) { showFormError('Cidade é obrigatória.'); return null; }
        if (!state || state.length !== 2) { showFormError('UF inválida.'); return null; }
        if (!country || country.length !== 2) { showFormError('País inválido.'); return null; }

        const payload = { line_1: line1, zip_code: zip, city, state, country };
        if (line2) payload.line_2 = line2;
        return payload;
    }

    // ====================================================================
    // INPUT MASKS
    // ====================================================================

    function setupMasks() {
        // Card number
        document.getElementById('ck-card-number').addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '');
            v = v.replace(/(.{4})/g, '$1 ').trim();
            this.value = v;
        });

        // Expiry MM/AA
        document.getElementById('ck-card-expiry').addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '');
            if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
            this.value = v;
        });

        // CPF/CNPJ
        document.getElementById('ck-doc').addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '');
            if (v.length <= 11) {
                v = v.replace(/(\d{3})(\d)/, '$1.$2');
                v = v.replace(/(\d{3})(\d)/, '$1.$2');
                v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            } else {
                v = v.replace(/^(\d{2})(\d)/, '$1.$2');
                v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
                v = v.replace(/(\d{4})(\d)/, '$1-$2');
            }
            this.value = v;
        });

        // Phone
        document.getElementById('ck-phone').addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '');
            if (v.length > 2) v = '(' + v.substring(0, 2) + ') ' + v.substring(2);
            if (v.length > 9) v = v.substring(0, 10) + '-' + v.substring(10);
            this.value = v;
        });

        // CEP
        const zipEl = document.getElementById('ck-zip');
        if (zipEl) zipEl.addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '');
            if (v.length > 5) v = v.substring(0, 5) + '-' + v.substring(5, 8);
            this.value = v;
        });
    }

    // ====================================================================
    // TOKENIZATION
    // ====================================================================

    async function tokenizeCard(card) {
        const res = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${PAGARME_PUBLIC_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'card', card }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.message || 'Erro ao processar cartão.');
        }
        return (await res.json()).id;
    }

    // ====================================================================
    // POLLING
    // ====================================================================

    async function pollOrder(id, cbs = {}) {
        const maxAttempts = 60;
        const interval = (n) => n < 2 ? 2000 : n < 4 ? 3000 : n < 6 ? 5000 : 10000;

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, interval(i)));
            try {
                const res = await fetchManager.getCheckoutOrder(id);
                if (!res.ok) continue;

                const status = res.result?.data?.status;
                _order = res.result?.data || _order;

                if (status === 'paid') { (cbs.onPaid || showCardSuccess)(); return; }
                if (status === 'failed') { (cbs.onFailed || (() => showCardError()))(); return; }
                if (status === 'expired') { (cbs.onExpired || (() => setElementState(container, 'expired')))(); return; }

            } catch { /* retry */ }
        }

        (cbs.onTimeout || (() => showCardError('Aguardando confirmação. Você será notificado assim que o pagamento for confirmado.')))();
    }

    // ====================================================================
    // EXPIRY TIMER
    // ====================================================================

    function startExpiryTimer() {
        if (!_order?.expires_at) return;
        const el = document.getElementById('ck-expiry');
        const text = document.getElementById('ck-expiry-text');

        const LOCK_MS = 60000; // disable CTA 60s before expiry (reserve last minute for processing)

        const tick = () => {
            const diff = new Date(_order.expires_at).getTime() - Date.now();
            if (diff <= 0) { clearInterval(_expiryInterval); setElementState(container, 'expired'); return; }
            const m = Math.floor(diff / 60000), s = Math.floor((diff % 60000) / 1000);
            text.textContent = `Expira em ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            if (m < 5) el.classList.add('ck-expiry--urgent');

            // Disable CTA in the last 60s — reserve that window for in-flight payments
            const ctaBtn = document.getElementById('ck-submit');
            if (ctaBtn && !ctaBtn.disabled) {
                ctaBtn.disabled = diff <= LOCK_MS;
            }
        };
        tick();
        _expiryInterval = setInterval(tick, 1000);
    }

    // ====================================================================
    // GLOBAL STATES
    // ====================================================================

    function showGlobalError(title, msg) {
        document.getElementById('ck-error-title').textContent = title;
        document.getElementById('ck-error-msg').textContent = msg;
        setElementState(container, 'empty');
    }

    function showGlobalProcessing() {
        if (_expiryInterval) clearInterval(_expiryInterval);
        setElementState(container, 'processing');
    }

    function updateProcessingMsg(msg) {
        const el = document.getElementById('ck-processing-msg');
        if (el) el.textContent = msg;
    }

    // ====================================================================
    // ERROR HELPERS
    // ====================================================================

    function showFormError(msg) {
        const el = document.getElementById('ck-error');
        el.textContent = msg;
        el.classList.add('visible');
        requestAnimationFrame(() => updateSlideHeight());
    }

    function hideFormError() {
        const el = document.getElementById('ck-error');
        el.classList.remove('visible');
        el.textContent = '';
        requestAnimationFrame(() => updateSlideHeight());
    }

    function getErrMsg(res) {
        const body = res.result || res.error || {};
        return body.message || body.error || 'Erro ao processar pagamento.';
    }

    // ====================================================================
    // VITRINE BREADCRUMB (header) — mirrors the product page
    // ====================================================================

    // For marketplace orders, resolve the product → vitrine and reveal the
    // in-header breadcrumb. Non-blocking; silently skips if anything is missing.
    async function loadVitrineCrumb(order) {
        if (!order || order.origin !== 'marketplace' || !order.product_id) return;

        let pRes;
        try { pRes = await fetchManager.getProductById(order.product_id); }
        catch { return; }
        if (!pRes.ok || !pRes.result?.product) return;

        const product = pRes.result.product;
        if (!product.vitrine_id) return;

        let vRes;
        try { vRes = await fetchManager.getVitrine(product.vitrine_id); }
        catch { return; }
        if (!vRes.ok || !vRes.result?.vitrine) return;

        const vitrine = vRes.result.vitrine;
        renderVitrineCrumb(vitrine, `/pages/vitrine/?loja=${vitrine.id}`, product);
    }

    // Reveal the in-header breadcrumb — "│ Vitrine › Produto". The store chunk
    // links to the vitrine, the product chunk links back to the product page.
    function renderVitrineCrumb(v, url, product) {
        const crumb = document.getElementById('vt-crumb');
        if (!crumb) return;

        document.getElementById('vt-crumb-store').setAttribute('href', url);

        const avatarEl = document.getElementById('vt-crumb-avatar');
        if (v.avatar_url) {
            const img = document.createElement('img');
            img.src = v.avatar_url;
            img.alt = v.display_name;
            img.onerror = function () { this.remove(); fillInitial(avatarEl, v.display_name); };
            avatarEl.appendChild(img);
        } else {
            fillInitial(avatarEl, v.display_name);
        }

        document.getElementById('vt-crumb-name').textContent = v.display_name;
        if (v.verified) document.getElementById('vt-crumb-verified').style.display = '';

        const currentEl = document.getElementById('vt-crumb-current');
        currentEl.textContent = nameOf(product);
        currentEl.setAttribute('href', productUrl(product));

        crumb.hidden = false;
    }

    function nameOf(p) { return p.name || p.package_name || 'Produto'; }
    function productUrl(p) { return `/pages/product/?product=${p.id}`; }

    function fillInitial(el, name) {
        const [c1, c2] = paletteFor(name || '?');
        el.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
        el.textContent = initialFor(name);
    }

    function initialFor(str) {
        return String(str || '?').replace(/^www\./, '').charAt(0).toUpperCase();
    }

    const AVATAR_PALETTES = [
        ['#ef4444', '#b91c1c'], ['#f97316', '#c2410c'], ['#f59e0b', '#b45309'],
        ['#10b981', '#047857'], ['#06b6d4', '#0e7490'], ['#3b82f6', '#1d4ed8'],
        ['#6366f1', '#4338ca'], ['#8b5cf6', '#6d28d9'], ['#ec4899', '#be185d'],
        ['#14b8a6', '#0f766e'], ['#84cc16', '#4d7c0f'], ['#0ea5e9', '#0369a1'],
    ];

    function paletteFor(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
        return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length];
    }

    // ====================================================================
    // HELPERS
    // ====================================================================

    function formatCurrency(cents) {
        return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

})();
