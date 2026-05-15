// ============================================================================
// Public Product Page — Single Product
// Loaded via /pages/product/?slug=product-slug-xxx
// ============================================================================

(async function () {
    const container = document.getElementById('product-state');

    // Get slug from URL path or query
    const params = new URLSearchParams(window.location.search);
    let slug = params.get('slug');

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
        document.title = `${p.package_name || p.name} — AuthPack`;

        const sessions = p.sessions || [];
        const billingType = p.billing_type || 'one_time';

        // Must match backend PLATFORM_FEE_CENTS
        const SERVICE_FEE = 99;
        const priceVal = (p.price_cents || 0) / 100;
        const totalCents = (p.price_cents || 0) + SERVICE_FEE;
        const totalVal = totalCents / 100;
        const fmt = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // === Category ===
        // Leave empty when absent — CSS :empty hides it and removes margin
        const catEl = document.getElementById('vt-category');
        if (p.category) {
            catEl.textContent = p.category;
        }

        // === Title ===
        document.getElementById('vt-title').textContent = p.package_name || p.name;

        // === Description (clamp + read-more) ===
        const descEl = document.getElementById('vt-desc');
        const readMoreBtn = document.getElementById('vt-read-more');
        if (p.description) {
            descEl.textContent = p.description;
            // Show read-more only for long descriptions
            const isLong = p.description.length > 200;
            if (isLong) {
                readMoreBtn.style.display = 'block';
                let open = false;
                readMoreBtn.addEventListener('click', () => {
                    open = !open;
                    descEl.classList.toggle('clamp', !open);
                    readMoreBtn.textContent = open ? 'Ler menos' : 'Ler mais';
                });
            }
        } else {
            descEl.style.display = 'none';
        }

        // === Services ===
        const servicesSection = document.getElementById('vt-services-section');
        const servicesGrid = document.getElementById('vt-services-grid');
        const servicesLabel = document.getElementById('vt-services-label');
        const servicesCount = document.getElementById('vt-services-count');
        const searchWrap = document.getElementById('vt-search');
        const searchInput = document.getElementById('vt-search-input');
        const emptySearch = document.getElementById('vt-empty-search');

        if (sessions.length === 0) {
            servicesSection.style.display = 'none';
        } else {
            const many = sessions.length > 8;

            servicesLabel.textContent = sessions.length === 1
                ? 'Inclui acesso a'
                : `${sessions.length} serviços inclusos`;

            if (many) {
                servicesGrid.classList.add('scroll');
                searchWrap.style.display = 'flex';
                servicesCount.style.display = 'inline';
                servicesCount.textContent = `${sessions.length} de ${sessions.length}`;
            }

            const buildCards = (list) => {
                servicesGrid.innerHTML = '';
                if (list.length === 0) {
                    emptySearch.style.display = 'block';
                    return;
                }
                emptySearch.style.display = 'none';
                list.forEach(s => {
                    const domain = extractDomain(s.url) || s.name;
                    const card = document.createElement('div');
                    card.className = 'vt-service';

                    const iconWrap = document.createElement('div');
                    iconWrap.className = 'vt-service-icon';

                    const img = document.createElement('img');
                    img.src = s.icon;
                    img.alt = domain;
                    img.onerror = function () { this.src = '../../assets/images/fallback-session-icon.png'; this.onerror = null; };
                    iconWrap.appendChild(img);

                    const nameEl = document.createElement('span');
                    nameEl.className = 'vt-service-domain';
                    nameEl.textContent = domain;

                    card.appendChild(iconWrap);
                    card.appendChild(nameEl);
                    servicesGrid.appendChild(card);
                });
            };

            buildCards(sessions);

            if (many && searchInput) {
                searchInput.addEventListener('input', () => {
                    const q = searchInput.value.toLowerCase();
                    const filtered = sessions.filter(s => {
                        const d = extractDomain(s.url) || s.name;
                        return d.toLowerCase().includes(q);
                    });
                    if (many) {
                        servicesCount.textContent = `${filtered.length} de ${sessions.length}`;
                    }
                    buildCards(filtered);
                });
            }
        }

        // === Price ===
        document.getElementById('vt-price-amount').textContent = fmt(totalVal);
        const periodEl = document.getElementById('vt-price-period');
        if (billingType === 'subscription') periodEl.style.display = '';

        // Billing sub-label
        document.getElementById('vt-billing-type-label').textContent =
            billingType === 'subscription' ? 'Assinatura mensal' : 'Pagamento único';

        // === Breakdown ===
        document.getElementById('vt-brk-product-label').textContent =
            billingType === 'subscription' ? 'Assinatura' : 'Produto';
        document.getElementById('vt-brk-product-val').textContent = `R$ ${fmt(priceVal)}`;
        const totalSuffix = billingType === 'subscription' ? ' /mês' : '';
        document.getElementById('vt-brk-total-val').textContent = `R$ ${fmt(totalVal)}${totalSuffix}`;

        // === Seller ===
        const sellerName = p.creator_name || '';
        const sellerPic = p.creator_picture || '';
        document.getElementById('vt-seller-name').textContent = sellerName;
        const avatarEl = document.getElementById('vt-seller-avatar');

        if (sellerPic) {
            const img = document.createElement('img');
            img.src = sellerPic;
            img.alt = sellerName;
            avatarEl.appendChild(img);
        } else if (sellerName) {
            // Gradient initial fallback
            const [c1, c2] = paletteFor(sellerName);
            avatarEl.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
            avatarEl.textContent = sellerName.charAt(0).toUpperCase();
        }

        // === Stock ===
        renderStock(p);

        // === CTA text ===
        const ctaBtn = document.getElementById('vt-cta-btn');
        const arrowSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>`;

        if (p.stock != null) {
            const sold = p.active_access_count || 0;
            if (p.stock - sold <= 0) {
                ctaBtn.disabled = true;
                ctaBtn.innerHTML = 'Esgotado';
                return;
            }
        }

        ctaBtn.innerHTML = billingType === 'subscription'
            ? `Assinar agora ${arrowSvg}`
            : `Comprar agora ${arrowSvg}`;
    }

    function renderStock(p) {
        const stockSection = document.getElementById('vt-stock-section');
        stockSection.innerHTML = '';

        if (p.stock != null) {
            // Limited stock → progress bar style
            const sold = p.active_access_count || 0;
            const remaining = Math.max(0, p.stock - sold);
            const pct = Math.min(100, (sold / p.stock) * 100);

            const wrap = document.createElement('div');
            wrap.className = 'vt-stock-progress';

            const track = document.createElement('div');
            track.className = 'vt-stock-track';
            const fill = document.createElement('div');
            fill.className = 'vt-stock-fill';
            fill.style.width = `${pct}%`;
            if (pct >= 100) fill.classList.add('depleted');
            else if (pct >= 80) fill.classList.add('warning');
            track.appendChild(fill);

            const label = document.createElement('span');
            label.className = 'vt-stock-label';
            if (remaining === 0) {
                label.innerHTML = '<strong>Esgotado</strong>';
            } else {
                label.innerHTML = `<strong>${remaining}</strong> de ${p.stock} vagas restantes`;
            }

            wrap.appendChild(track);
            wrap.appendChild(label);
            stockSection.appendChild(wrap);
        } else {
            // Unlimited → dot badge
            const badge = document.createElement('div');
            badge.className = 'vt-stock ok';
            badge.innerHTML = `<span class="vt-stock-dot"></span><span>Disponível · <b>sem limite de vagas</b></span>`;
            stockSection.appendChild(badge);
        }
    }

    // ====================================================================
    // HELPERS
    // ====================================================================

    function extractDomain(url) {
        if (!url) return '';
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch { return ''; }
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
    // CHECKOUT
    // ====================================================================

    function setupCheckout(product) {
        const btn = document.getElementById('vt-cta-btn');

        btn.addEventListener('click', async () => {
            if (btn.disabled) return;

            btn.disabled = true;
            const originalHTML = btn.innerHTML;
            btn.innerHTML = 'Redirecionando...';

            try {
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
                    btn.innerHTML = originalHTML;
                    return;
                }

                const orderId = res.result?.id;
                if (!orderId) {
                    alert('Erro ao criar pedido. Tente novamente.');
                    btn.disabled = false;
                    btn.innerHTML = originalHTML;
                    return;
                }

                window.location.href = `/pages/checkout/?orderId=${orderId}`;
            } catch (err) {
                console.error('Checkout redirect error:', err);
                alert('Erro inesperado. Tente novamente.');
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            }
        });
    }
})();
