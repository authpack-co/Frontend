// ============================================================================
// Public Vitrine — Single Product Page
// Loaded via /pages/vitrine/?slug=product-slug-xxx
// ============================================================================

(async function () {
    const container = document.getElementById('vitrine-state');

    // Get slug from URL path or query
    const params = new URLSearchParams(window.location.search);
    let slug = params.get('slug');

    // Also support /pages/vitrine/slug-here via path
    if (!slug) {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const vitrineIdx = pathParts.indexOf('vitrine');
        if (vitrineIdx !== -1 && pathParts[vitrineIdx + 1]) {
            slug = pathParts[vitrineIdx + 1];
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
        document.title = `${p.name} — AuthPack`;

        // Stacked icons header (show max 4 + "+N more")
        const header = document.getElementById('vt-icons-header');
        const sessions = p.sessions || [];
        header.innerHTML = '';
        const maxIcons = 4;
        const visibleSessions = sessions.slice(0, maxIcons);
        const remaining = sessions.length - maxIcons;

        visibleSessions.forEach(s => {
            const el = document.createElement('div');
            el.className = 'vt-stacked-icon';
            const img = document.createElement('img');
            img.src = s.icon;
            img.alt = s.name;
            el.appendChild(img);
            header.appendChild(el);
        });

        if (remaining > 0) {
            const more = document.createElement('div');
            more.className = 'vt-more-badge';
            more.innerHTML = `<span class="vt-more-num">+${remaining}</span><span class="vt-more-text">more</span>`;
            header.appendChild(more);
        }

        // Apply gradient tint from the most vibrant icon's darkPalette
        const vibrant = getMostVibrantPalette(visibleSessions);
        if (vibrant) {
            const [r, g, b] = vibrant;
            header.style.background = `linear-gradient(180deg, rgba(${r},${g},${b},0.25), #181a1e, #1c2129)`;
        }

        // Product name
        document.getElementById('vt-product-name').textContent = p.name;

        // Description
        const descEl = document.getElementById('vt-product-desc');
        if (p.description) {
            descEl.textContent = p.description;
            descEl.style.display = '';
        } else {
            descEl.style.display = 'none';
        }

        // Stock badge
        const stockBadge = document.getElementById('vt-stock-badge');
        if (p.stock != null) {
            const sold = p.active_access_count || 0;
            const remaining = Math.max(0, p.stock - sold);
            stockBadge.textContent = `${remaining} de ${p.stock} disponíveis`;
            stockBadge.classList.add('visible');
            if (remaining === 0) {
                stockBadge.classList.add('out-of-stock');
                stockBadge.textContent = 'Esgotado';
            }
        }

        // Price
        const billingType = p.billing_type || 'one_time';
        const priceVal = (p.price_cents || 0) / 100;
        const priceStr = priceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const priceEl = document.getElementById('vt-price');

        if (billingType === 'subscription') {
            priceEl.innerHTML = `R$ ${priceStr} <span class="vt-price-period">/ mês</span>`;
        } else {
            priceEl.textContent = `R$ ${priceStr}`;
        }

        // Billing badge
        const badge = document.getElementById('vt-billing-badge');
        badge.className = `vt-billing-badge ${billingType}`;
        badge.textContent = billingType === 'subscription' ? 'Assinatura mensal' : 'Pagamento único';

        // Seller
        const sellerName = p.creator_name || '';
        const sellerPic = p.creator_picture || '';
        document.getElementById('vt-seller-name').textContent = sellerName;
        const picEl = document.getElementById('vt-seller-pic');
        if (sellerPic) {
            picEl.src = sellerPic;
        } else {
            picEl.style.display = 'none';
        }

        // Marquee — Includes list
        const track = document.getElementById('vt-marquee-track');
        const wrap = document.querySelector('.vt-marquee-wrap');
        const includesSection = document.getElementById('vt-includes-section');
        if (sessions.length === 0) {
            includesSection.style.display = 'none';
        } else {
            track.innerHTML = '';
            const useMarquee = sessions.length > 4;

            // Build one set of items
            const buildItems = () => {
                const frag = document.createDocumentFragment();
                sessions.forEach(s => {
                    const item = document.createElement('div');
                    item.className = 'vt-marquee-item';

                    const iconWrap = document.createElement('div');
                    iconWrap.className = 'vt-marquee-icon';
                    const img = document.createElement('img');
                    img.src = s.icon;
                    img.alt = s.name;
                    iconWrap.appendChild(img);

                    const name = document.createElement('span');
                    name.className = 'vt-marquee-name';
                    // Always show domain host from URL
                    name.textContent = extractDomain(s.url);

                    item.appendChild(iconWrap);
                    item.appendChild(name);
                    frag.appendChild(item);
                });
                return frag;
            };

            track.appendChild(buildItems());

            if (useMarquee) {
                // Duplicate for seamless looping
                track.appendChild(buildItems());
            } else {
                // Static — no animation, no edge fades
                track.style.animation = 'none';
                wrap.classList.add('vt-marquee-static');
            }
        }

        // CTA button text
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

    /**
     * Among the given sessions, find the one whose darkPalette is the most
     * vibrant (highest chroma = max(r,g,b) - min(r,g,b)).
     * Returns [r, g, b] or null.
     */
    function getMostVibrantPalette(sessions) {
        let best = null;
        let bestChroma = -1;
        for (const s of sessions) {
            if (!s.darkPalette) continue;
            try {
                const [r, g, b] = JSON.parse(s.darkPalette);
                const chroma = Math.max(r, g, b) - Math.min(r, g, b);
                if (chroma > bestChroma) {
                    bestChroma = chroma;
                    best = [r, g, b];
                }
            } catch { /* skip malformed */ }
        }
        return best;
    }

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
            btn.textContent = 'Redirecionando...';

            try {
                const res = await fetchManager.startCheckout({
                    productId: product.id,
                });

                if (res.ok && res.result?.url) {
                    window.location.href = res.result.url;
                } else {
                    console.warn('Checkout response:', res);
                    btn.textContent = 'Erro — tente novamente';
                    btn.disabled = false;
                }
            } catch (err) {
                console.error('Checkout error:', err);
                btn.textContent = 'Erro — tente novamente';
                btn.disabled = false;
            }
        });
    }
})();
