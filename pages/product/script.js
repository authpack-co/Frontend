// ============================================================================
// Public Product Page — Single Product
// Loaded via /pages/product/?product={productId}
// ============================================================================

(async function () {
    const container = document.getElementById('product-state');

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');

    if (!productId) {
        setElementState(container, 'empty');
        return;
    }

    try {
        const res = await fetchManager.getProductById(productId);

        if (!res.ok || !res.result?.product) {
            setElementState(container, 'empty');
            return;
        }

        const product = res.result.product;
        renderProduct(product);
        setElementState(container, 'content');
        setupCheckout(product);
        // Vitrine context (band + related) — fetched after main content, non-blocking
        loadVitrineContext(product);
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
                    img.alt = domain;
                    AuthPackFavicon.apply(img, { icon: s.icon, url: s.url });
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
    // VITRINE CONTEXT (band + related products)
    // ====================================================================

    async function loadVitrineContext(product) {
        if (!product.vitrine_id) return;

        let res;
        try {
            res = await fetchManager.getVitrine(product.vitrine_id);
        } catch (err) {
            console.error('Error loading vitrine context:', err);
            return;
        }

        if (!res.ok || !res.result?.vitrine) return;

        const vitrine = res.result.vitrine;
        const products = res.result.products || [];
        const vitrineUrl = `/pages/vitrine/?loja=${vitrine.id}`;

        renderVitrineCrumb(vitrine, vitrineUrl, product);
        renderVitrineBand(vitrine, vitrineUrl, products.length);
        renderRelated(selectRelated(product, products), vitrineUrl);
    }

    // Pick which sibling products to show. Categories come from the vitrine's own
    // taxonomy (category_ids), which only the vitrine response carries — so we read
    // this product's categories from its entry in that list. If it shares at least
    // one category, show those siblings; otherwise just a few best-sellers. Both
    // lists are ordered by sales (best first).
    function selectRelated(product, allProducts) {
        const siblings = allProducts.filter(p => p.id !== product.id);
        const bySalesDesc = (a, b) => salesOf(b) - salesOf(a);

        const self = allProducts.find(p => p.id === product.id);
        const myCats = (self && self.category_ids) || [];

        if (myCats.length) {
            return siblings
                .filter(p => (p.category_ids || []).some(id => myCats.includes(id)))
                .sort(bySalesDesc);
        }

        // No category on this product → a few best-sellers
        return siblings.sort(bySalesDesc).slice(0, 3);
    }

    // Reveal the in-header breadcrumb — "│ Vitrine › Produto". The store chunk
    // links to the vitrine. Only shown for published vitrines.
    function renderVitrineCrumb(v, url, product) {
        const crumb = document.getElementById('vt-crumb');
        if (!crumb) return;

        document.getElementById('vt-crumb-store').setAttribute('href', url);

        // Avatar — same fallback chain as the checkout band
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

        // Breadcrumb tail = the current product (links to its page)
        const currentEl = document.getElementById('vt-crumb-current');
        currentEl.textContent = nameOf(product);
        currentEl.setAttribute('href', productUrl(product));

        crumb.hidden = false;
    }

    // Upgrade the seller block into a clickable vitrine band.
    function renderVitrineBand(v, url, productsCount) {
        const band = document.getElementById('vt-seller');
        band.setAttribute('href', url);
        band.classList.add('is-vitrine');

        // Avatar — vitrine identity overrides the raw creator picture
        const avatarEl = document.getElementById('vt-seller-avatar');
        avatarEl.innerHTML = '';
        avatarEl.style.background = '';
        avatarEl.textContent = '';
        if (v.avatar_url) {
            const img = document.createElement('img');
            img.src = v.avatar_url;
            img.alt = v.display_name;
            img.onerror = function () { this.remove(); fillInitial(avatarEl, v.display_name); };
            avatarEl.appendChild(img);
        } else {
            fillInitial(avatarEl, v.display_name);
        }

        document.getElementById('vt-seller-name').textContent = v.display_name;
        const count = Number(productsCount || 0);
        document.getElementById('vt-seller-meta').textContent = count > 0
            ? `${count} ${count === 1 ? 'produto' : 'produtos'}${v.verified ? ' · vitrine verificada' : ''}`
            : 'Vitrine';
        if (v.verified) document.getElementById('vt-seller-verified').style.display = '';
        document.getElementById('vt-seller-go').style.display = '';
    }

    function renderRelated(siblings, vitrineUrl) {
        if (!siblings.length) return;

        const section = document.getElementById('vt-related');
        const track = document.getElementById('vt-related-track');
        document.getElementById('vt-related-all').setAttribute('href', vitrineUrl);

        track.innerHTML = siblings.slice(0, 8).map(relatedCardHtml).join('');
        section.hidden = false;
    }

    // Identical to the vitrine's card renderer (pages/vitrine/script.js cardHtml).
    // Keep in sync with the vitrine until these are extracted into a shared module.
    function relatedCardHtml(p) {
        const billing = p.billing_type || 'one_time';
        const soldout = stockState(p).state === 'out';
        const period = billing === 'subscription' ? `<span class="price-per">/mês</span>` : '';
        const btn = soldout
            ? `<span class="buy-btn ghost">Esgotado</span>`
            : `<a class="buy-btn" href="${productUrl(p)}">Ver produto ${ARROW}</a>`;

        return `
        <article class="pcard">
            <div class="pcard-top">
                <span class="pcat">${billing === 'subscription' ? 'Assinatura' : 'Acesso'}</span>
                <span class="billing-badge ${billing}">${billing === 'subscription' ? 'Assinatura' : 'Único'}</span>
            </div>
            <h3 class="pname">${esc(nameOf(p))}</h3>
            <p class="pdesc">${esc(p.description || '')}</p>
            <div class="pservices">${servicesIcons(p, 5)}</div>
            ${stockHtml(p)}
            <div class="pcard-foot">
                <div>
                    <div class="price-row"><span class="price-cur">R$</span><span class="price-amt">${formatBRL(p.price_cents)}</span>${period}</div>
                    <div class="psales"><b>${discreetCount(salesOf(p))}</b> ${salesOf(p) === 1 ? 'venda' : 'vendas'}</div>
                </div>
                ${btn}
            </div>
        </article>`;
    }

    // Stock dot + text for cards — identical to the vitrine's stockHtml.
    function stockHtml(p) {
        const s = stockState(p);
        if (s.state === 'ok') return `<div class="stock ok"><span class="stock-dot"></span><span>Sem limite de vagas</span></div>`;
        if (s.state === 'limited') return `<div class="stock ok"><span class="stock-dot"></span><span><b>${s.remaining}</b> vagas restantes</span></div>`;
        if (s.state === 'warn') return `<div class="stock warn"><span class="stock-dot"></span><span>Últimas <b>${s.remaining}</b> vagas</span></div>`;
        return `<div class="stock out"><span class="stock-dot"></span><b>Esgotado</b></div>`;
    }

    function fillInitial(el, name) {
        const [c1, c2] = paletteFor(name || '?');
        el.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
        el.textContent = initialFor(name);
    }

    // ====================================================================
    // HELPERS
    // ====================================================================

    const ARROW = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;

    function nameOf(p) { return p.name || p.package_name || 'Produto'; }
    function salesOf(p) { return Number(p.total_sales_count || 0); }
    function productUrl(p) { return `/pages/product/?product=${p.id}`; }

    function formatBRL(cents) {
        return (Number(cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Discreet sales display: exact under 10, otherwise rounded down to one
    // significant figure with a "+" (e.g. 11 → "10+", 470 → "400+"). Mirrors vitrine.
    function discreetCount(n) {
        n = Number(n || 0);
        if (n < 10) return String(n);
        const step = Math.pow(10, Math.floor(Math.log10(n)));
        return (Math.floor(n / step) * step).toLocaleString('pt-BR') + '+';
    }

    function initialFor(str) {
        return String(str || '?').replace(/^www\./, '').charAt(0).toUpperCase();
    }

    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function stockState(p) {
        if (p.stock == null) return { state: 'ok', remaining: null };
        const remaining = Math.max(0, Number(p.stock) - Number(p.active_access_count || 0));
        if (remaining <= 0) return { state: 'out', remaining: 0 };
        if (remaining <= 5) return { state: 'warn', remaining };
        return { state: 'limited', remaining };
    }

    // Service-icon row — identical to the vitrine's servicesIcons. Relies on the
    // global AuthPackFavicon helper (faviconManager.js) for original→Google→initial.
    function servicesIcons(p, max, size) {
        const sessions = p.sessions || [];
        const shown = sessions.slice(0, max);
        const extra = sessions.length - shown.length;
        const sizeStyle = size ? `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px` : '';
        const icons = shown.map(s => {
            const label = esc(s.name || extractDomain(s.url) || '?');
            if (s.icon) {
                const initial = initialFor(s.name || extractDomain(s.url));
                const google = AuthPackFavicon.googleUrl(s.url);
                return `<div class="svc-icon" title="${label}" style="${sizeStyle}"><img src="${s.icon}" alt="${label}" data-fav-google="${google}" data-fav-initial="${initial}" onerror="AuthPackFavicon.inlineError(this)"></div>`;
            }
            const [c1, c2] = paletteFor(s.name || s.url || '?');
            return `<div class="svc-icon" title="${label}" style="background:linear-gradient(150deg,${c1},${c2});${sizeStyle}">${initialFor(s.name || extractDomain(s.url))}</div>`;
        }).join('');
        return icons + (extra > 0 ? `<span class="svc-more">+${extra}</span>` : '');
    }

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
                const authRes = await fetchManager.getAuthenticatedUser();
                if (!authRes.ok) {
                    const redirectPath = window.location.pathname + window.location.search;
                    window.location.href = '/pages/login/?redirect=' + encodeURIComponent(redirectPath);
                    return;
                }

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
