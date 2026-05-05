// ============================================================================
// Public Product Page — Single Product
// Loaded via /pages/product/?slug=product-slug-xxx
// ============================================================================

(async function () {
    const container = document.getElementById('product-state');

    // Get slug from URL path or query
    const params = new URLSearchParams(window.location.search);
    let slug = params.get('slug');

    // Also support /pages/product/slug-here via path
    if (!slug) {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const productIdx = pathParts.indexOf('product');
        if (productIdx !== -1 && pathParts[productIdx + 1]) {
            slug = pathParts[productIdx + 1];
        }
    }

    if (!slug) {
        setElementState(container, 'empty');
        return;
    }

    try {
        const res = await fetchManager.getProductBySlug(slug);

        if (!res.ok || !res.result?.product) {
            setElementState(container, 'empty');
            return;
        }

        const product = res.result.product;
        renderProduct(product);
        setElementState(container, 'content');
        setupCheckout(product);
    } catch (err) {
        console.error('Error loading product:', err);
        setElementState(container, 'empty');
    }

    // ====================================================================
    // RENDER
    // ====================================================================

    function renderProduct(p) {
        // Page title
        document.title = `${p.package_name || p.name} — AuthPack`;

        const sessions = p.sessions || [];
        const billingType = p.billing_type || 'one_time';
        const priceVal = (p.price_cents || 0) / 100;
        const priceStr = priceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // === Product Name ===
        document.getElementById('vt-product-name').textContent = p.package_name || p.name;

        // === Description ===
        const descEl = document.getElementById('vt-product-desc');
        if (p.description) {
            descEl.textContent = p.description;
            descEl.style.display = '';
        } else {
            descEl.style.display = 'none';
        }

        // === Services Grid ===
        const servicesSection = document.getElementById('vt-services-section');
        const servicesGrid = document.getElementById('vt-services-grid');
        if (sessions.length === 0) {
            servicesSection.style.display = 'none';
        } else {
            servicesGrid.innerHTML = '';
            sessions.forEach(s => {
                const card = document.createElement('div');
                card.className = 'vt-service-card';

                const iconWrap = document.createElement('div');
                iconWrap.className = 'vt-service-icon';
                const img = document.createElement('img');
                img.src = s.icon;
                img.alt = s.name;
                iconWrap.appendChild(img);

                const name = document.createElement('span');
                name.className = 'vt-service-name';
                name.textContent = extractDomain(s.url) || s.name;

                card.appendChild(iconWrap);
                card.appendChild(name);
                servicesGrid.appendChild(card);
            });
        }

        // === Price (total = product + R$0,99 service fee) ===
        // Must match backend PLATFORM_FEE_CENTS in checkoutRoutes.js
        const SERVICE_FEE = 99; // R$0.99 in cents
        const totalCents = (p.price_cents || 0) + SERVICE_FEE;
        const totalVal = totalCents / 100;
        const totalStr = totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const priceEl = document.getElementById('vt-price');
        if (billingType === 'subscription') {
            priceEl.innerHTML = `R$ ${totalStr} <span class="vt-price-period">/ mês</span>`;
        } else {
            priceEl.textContent = `R$ ${totalStr}`;
        }

        // === Price Breakdown (iFood-style) ===
        const productPriceStr = priceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('vt-breakdown-product-value').textContent = `R$ ${productPriceStr}`;
        document.getElementById('vt-breakdown-total-value').textContent = `R$ ${totalStr}`;
        if (billingType === 'subscription') {
            document.getElementById('vt-breakdown-product-label').textContent = 'Assinatura mensal';
        }

        // === Billing Badge ===
        const badge = document.getElementById('vt-billing-badge');
        badge.className = `vt-billing-badge ${billingType}`;
        badge.textContent = billingType === 'subscription' ? 'Assinatura mensal' : 'Pagamento único';

        // === Seller ===
        const sellerName = p.creator_name || '';
        const sellerPic = p.creator_picture || '';
        document.getElementById('vt-seller-name').textContent = sellerName;
        const picEl = document.getElementById('vt-seller-pic');
        if (sellerPic) {
            picEl.src = sellerPic;
        } else {
            picEl.style.display = 'none';
        }

        // === Stock ===
        const stockSection = document.getElementById('vt-stock-section');
        stockSection.innerHTML = '';

        if (p.stock != null) {
            const sold = p.active_access_count || 0;
            const remainingStock = Math.max(0, p.stock - sold);
            const pct = Math.min(100, (sold / p.stock) * 100);

            stockSection.className = 'vt-stock-section';

            const track = document.createElement('div');
            track.className = 'vt-stock-track';
            const fill = document.createElement('div');
            fill.className = 'vt-stock-fill';
            fill.style.width = `${pct}%`;
            if (pct >= 100) fill.classList.add('depleted');
            else if (pct >= 80) fill.classList.add('warning');
            track.appendChild(fill);
            stockSection.appendChild(track);

            const label = document.createElement('span');
            label.className = 'vt-stock-label';
            if (remainingStock === 0) {
                label.innerHTML = `<strong>Esgotado</strong>`;
            } else {
                label.innerHTML = `<strong>${remainingStock}</strong> de ${p.stock} vagas restantes`;
            }
            stockSection.appendChild(label);
        } else {
            const unlimited = document.createElement('div');
            unlimited.className = 'vt-stock-unlimited';
            unlimited.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8Z"/></svg> Sem limite de vagas`;
            stockSection.appendChild(unlimited);
        }

        // === CTA Button Text ===
        const ctaBtn = document.getElementById('vt-cta-btn');
        if (billingType === 'subscription') {
            ctaBtn.textContent = 'Assinar agora';
        } else {
            ctaBtn.textContent = 'Comprar agora';
        }

        // Disable if out of stock
        if (p.stock != null) {
            const sold = p.active_access_count || 0;
            if (p.stock - sold <= 0) {
                ctaBtn.disabled = true;
                ctaBtn.textContent = 'Esgotado';
            }
        }
    }

    // ====================================================================
    // HELPERS
    // ====================================================================

    function extractDomain(url) {
        if (!url) return '';
        try {
            const u = new URL(url);
            return u.hostname.replace(/^www\./, '');
        } catch {
            return '';
        }
    }

    // ====================================================================
    // CHECKOUT
    // ====================================================================

    function setupCheckout(product) {
        const btn = document.getElementById('vt-cta-btn');

        btn.addEventListener('click', async () => {
            if (btn.disabled) return;

            btn.disabled = true;
            const originalText = btn.textContent;
            btn.textContent = 'Redirecionando...';

            try {
                // Create a checkout order via the API
                const res = await fetchManager.createCheckoutOrder({
                    productId: product.id,
                    origin: 'marketplace',
                });

                if (!res.ok) {
                    const errMsg = res.result?.error === 'ALREADY_HAS_ACCESS'
                        ? 'Você já possui acesso a este produto.'
                        : res.result?.error === 'PRODUCT_SOLD_OUT'
                            ? 'Este produto está esgotado.'
                            : res.result?.error || 'Erro ao iniciar checkout.';
                    alert(errMsg);
                    btn.disabled = false;
                    btn.textContent = originalText;
                    return;
                }

                const orderId = res.result?.id;
                if (!orderId) {
                    alert('Erro ao criar pedido. Tente novamente.');
                    btn.disabled = false;
                    btn.textContent = originalText;
                    return;
                }

                // Redirect to checkout page
                window.location.href = `/pages/checkout/?orderId=${orderId}`;
            } catch (err) {
                console.error('Checkout redirect error:', err);
                alert('Erro inesperado. Tente novamente.');
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }
})();
