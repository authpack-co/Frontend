// Public Product Detail Page
(async function () {
    const container = document.getElementById('product-state');

    // Get slug from URL
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (!slug) {
        setElementState(container, 'empty');
        return;
    }

    try {
        const res = await fetchManager.getProductBySlug(slug);

        if (!res.ok || !res.result?.data) {
            setElementState(container, 'empty');
            return;
        }

        const product = res.result.data;
        renderProductDetail(product);
        setElementState(container, 'content');

        // Setup purchase button
        document.getElementById('btn-purchase')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-purchase');
            btn.disabled = true;
            btn.textContent = 'Redirecionando...';

            try {
                const checkoutRes = await fetchManager.startCheckout({
                    product_id: product.id,
                });

                if (checkoutRes.ok && checkoutRes.result?.data?.url) {
                    window.location.href = checkoutRes.result.data.url;
                } else {
                    btn.textContent = 'Erro — tente novamente';
                    btn.disabled = false;
                }
            } catch (err) {
                console.error('Checkout error:', err);
                btn.textContent = 'Erro — tente novamente';
                btn.disabled = false;
            }
        });
    } catch (err) {
        console.error('Error loading product:', err);
        setElementState(container, 'empty');
    }

    function renderProductDetail(product) {
        // Update page title
        document.title = `${product.name} — AuthPack`;

        // Type badge
        const billingType = product.billing_type || product.billingType || 'one_time';
        const badge = document.getElementById('product-type-badge');
        badge.className = `product-type-badge ${billingType}`;
        badge.textContent = billingType === 'subscription' ? 'Assinatura mensal' : 'Pagamento único';

        // Name
        document.getElementById('product-detail-name').textContent = product.name;

        // Description
        const descEl = document.getElementById('product-detail-desc');
        descEl.textContent = product.description || '';
        descEl.style.display = product.description ? '' : 'none';

        // Price
        const priceVal = parseFloat(product.price_amount || product.priceAmount || 0) / 100;
        document.getElementById('product-detail-price').textContent = priceVal.toFixed(2);

        // Billing type text
        const billingEl = document.getElementById('product-detail-billing');
        billingEl.textContent = billingType === 'subscription' ? 'por mês' : 'pagamento único';

        // Sessions
        const sessionsContainer = document.getElementById('product-detail-sessions');
        const sessions = product.sessions || [];

        if (sessions.length === 0) {
            sessionsContainer.style.display = 'none';
            return;
        }

        sessionsContainer.innerHTML = '';
        sessions.forEach(s => {
            const item = document.createElement('div');
            item.className = 'session-item';

            const icon = document.createElement('div');
            icon.className = 'session-item-icon';
            const img = document.createElement('img');
            img.src = s.icon;
            img.alt = s.name;
            icon.appendChild(img);

            const name = document.createElement('span');
            name.className = 'session-item-name';
            name.textContent = s.name;

            item.appendChild(icon);
            item.appendChild(name);
            sessionsContainer.appendChild(item);
        });
    }
})();
