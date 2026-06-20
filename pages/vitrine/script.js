// ============================================================================
// Public Storefront (Vitrine) — all products from a single seller
// Loaded via /pages/vitrine/?loja={vitrineId}
// ============================================================================

(async function () {
    const container = document.getElementById('vitrine-state');

    const params = new URLSearchParams(window.location.search);
    const vitrineId = params.get('loja');

    if (!vitrineId) {
        setElementState(container, 'empty');
        return;
    }

    let PRODUCTS = [];
    let activeSort = 'featured';
    let query = '';

    // ── Static assets (declared up-front to avoid temporal-dead-zone access
    //    during the initial render) ──
    const AVATAR_PALETTES = [
        ['#ef4444', '#b91c1c'], ['#f97316', '#c2410c'], ['#f59e0b', '#b45309'],
        ['#10b981', '#047857'], ['#06b6d4', '#0e7490'], ['#3b82f6', '#1d4ed8'],
        ['#6366f1', '#4338ca'], ['#8b5cf6', '#6d28d9'], ['#ec4899', '#be185d'],
        ['#14b8a6', '#0f766e'], ['#84cc16', '#4d7c0f'], ['#0ea5e9', '#0369a1'],
    ];

    const ARROW = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
    const STAR_WHITE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="m12 17.3 6.18 3.7-1.64-7 5.46-4.73-7.19-.61L12 2 9.19 8.66 2 9.27l5.46 4.73L5.82 21z"/></svg>`;

    const ICONS = {
        whatsapp: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.52 0-3.01-.41-4.3-1.18l-.31-.18-3.12.82.83-3.04-.2-.32a8.21 8.21 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.24 3.69 8.24 8.23s-3.71 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01s-.43.06-.66.31c-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.28z"/></svg>`,
        telegram: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
        instagram: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
        site: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    };

    try {
        const res = await fetchManager.getVitrine(vitrineId);

        if (!res.ok || !res.result?.vitrine) {
            setElementState(container, 'empty');
            return;
        }

        const { vitrine, stats, products } = res.result;
        PRODUCTS = products || [];

        renderSeller(vitrine, stats);
        setElementState(container, 'content');
        renderCatalog();
    } catch (err) {
        console.error('Error loading vitrine:', err);
        setElementState(container, 'empty');
        return;
    }

    // ========================================================================
    // SELLER HERO
    // ========================================================================

    function renderSeller(v, stats) {
        document.title = `${v.display_name} — Vitrine · AuthPack`;

        // Avatar: image override → user picture → gradient initial
        const avatarEl = document.getElementById('seller-avatar');
        if (v.avatar_url) {
            const img = document.createElement('img');
            img.src = v.avatar_url;
            img.alt = v.display_name;
            img.onerror = function () { this.remove(); avatarEl.textContent = initialFor(v.display_name); };
            avatarEl.textContent = '';
            avatarEl.appendChild(img);
        } else {
            const [c1, c2] = paletteFor(v.display_name);
            avatarEl.style.background = `linear-gradient(150deg, ${c1}, ${c2})`;
            avatarEl.textContent = initialFor(v.display_name);
        }

        document.getElementById('seller-name').textContent = v.display_name;

        if (v.verified) document.getElementById('verified-badge').style.display = '';

        const bioEl = document.getElementById('seller-bio');
        if (v.bio) {
            bioEl.textContent = v.bio;
            bioEl.style.display = '';
        }

        renderContacts(v.contacts || {});

        // Stats (real data only)
        document.getElementById('stat-clients').textContent = fmtNum(stats.active_clients);
        document.getElementById('stat-products').textContent = fmtNum(stats.products_count);
        document.getElementById('stat-sales').textContent = discreetCount(stats.total_sales);
        if (stats.since_year) {
            document.getElementById('stat-since').textContent = `desde ${stats.since_year}`;
        } else {
            document.getElementById('stat-since-wrap').style.display = 'none';
        }
    }

    function renderContacts(contacts) {
        const wrap = document.getElementById('seller-links');
        const items = [];

        if (contacts.whatsapp) {
            items.push(link(`https://wa.me/${contacts.whatsapp}`, ICONS.whatsapp, 'WhatsApp'));
        }
        if (contacts.telegram) {
            items.push(link(`https://t.me/${contacts.telegram}`, ICONS.telegram, 'Telegram'));
        }
        if (contacts.instagram) {
            items.push(link(`https://instagram.com/${contacts.instagram}`, ICONS.instagram, 'Instagram'));
        }
        if (contacts.website) {
            items.push(link(contacts.website, ICONS.site, 'Site'));
        }

        wrap.innerHTML = items.join('');
    }

    function link(href, icon, label) {
        return `<a class="seller-link" href="${href}" target="_blank" rel="noopener noreferrer nofollow">${icon}${label}</a>`;
    }

    // ========================================================================
    // CATALOG
    // ========================================================================

    function renderCatalog() {
        renderProducts();

        document.getElementById('tabs').addEventListener('click', e => {
            const btn = e.target.closest('.tab');
            if (!btn) return;
            activeSort = btn.dataset.sort;
            document.querySelectorAll('#tabs .tab').forEach(t => t.classList.toggle('active', t === btn));
            renderProducts();
        });

        document.getElementById('search-input').addEventListener('input', e => {
            query = e.target.value;
            renderProducts();
        });
    }

    function matchesQuery(p) {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        const name = (p.name || p.package_name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const inServices = (p.sessions || []).some(s => (s.name || '').toLowerCase().includes(q) || (s.url || '').toLowerCase().includes(q));
        return name.includes(q) || desc.includes(q) || inServices;
    }

    function sortProducts(list) {
        const arr = [...list];
        if (activeSort === 'bestseller') {
            arr.sort((a, b) => salesOf(b) - salesOf(a));
        } else if (activeSort === 'recent') {
            arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else {
            arr.sort((a, b) => salesOf(b) - salesOf(a));
        }
        return arr;
    }

    function renderProducts() {
        let list = PRODUCTS.filter(matchesQuery);
        list = sortProducts(list);

        const featBlock = document.getElementById('featured-block');
        // Featured: only on Destaques tab, no search, and only when there's a
        // clear best-seller (>1 product). The top seller becomes the hero card.
        const showFeatured = activeSort === 'featured' && !query.trim() && list.length > 1 && salesOf(list[0]) > 0;

        if (showFeatured) {
            const feat = list[0];
            featBlock.style.display = 'grid';
            featBlock.innerHTML = featuredHtml(feat);
            wireBuy(featBlock);
            list = list.slice(1);
        } else {
            featBlock.style.display = 'none';
            featBlock.innerHTML = '';
        }

        const grid = document.getElementById('product-grid');
        grid.innerHTML = list.map(cardHtml).join('');

        const total = list.length + (showFeatured ? 1 : 0);
        const empty = document.getElementById('empty-state');
        empty.style.display = total === 0 ? 'block' : 'none';
        document.getElementById('empty-query').textContent = query.trim();

        const cnt = document.getElementById('result-count');
        if (query.trim()) {
            cnt.textContent = `· ${total} ${total === 1 ? 'resultado' : 'resultados'}`;
        } else {
            cnt.textContent = `· ${PRODUCTS.length} ${PRODUCTS.length === 1 ? 'disponível' : 'disponíveis'}`;
        }
    }

    // ========================================================================
    // CARD RENDERERS
    // ========================================================================

    function cardHtml(p) {
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

    function featuredHtml(p) {
        const billing = p.billing_type || 'one_time';
        const period = billing === 'subscription' ? `<span class="price-per">/mês</span>` : '';
        return `
        <div class="featured-main">
            <span class="featured-flag">${STAR_WHITE} Mais vendido</span>
            <h3 class="featured-name">${esc(nameOf(p))}</h3>
            <p class="featured-desc">${esc(p.description || '')}</p>
            <div class="featured-services">${servicesIcons(p, 8, 34)}</div>
            ${stockHtml(p)}
        </div>
        <div class="featured-aside">
            <div class="featured-price-row"><span class="price-cur">R$</span><span class="featured-price-amt">${formatBRL(p.price_cents)}</span>${period}</div>
            <div class="featured-billing">${billing === 'subscription' ? 'Assinatura mensal' : 'Pagamento único'}<span class="dot"></span>Acesso imediato</div>
            <a class="featured-cta" href="${productUrl(p)}">Ver produto ${ARROW}</a>
            <div class="featured-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                Garantia de 7 dias · ${discreetCount(salesOf(p))} vendas
            </div>
        </div>`;
    }

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

    // ── Stock ──
    function stockState(p) {
        if (p.stock == null) return { state: 'ok', remaining: null };
        const remaining = Math.max(0, Number(p.stock) - Number(p.active_access_count || 0));
        if (remaining <= 0) return { state: 'out', remaining: 0 };
        if (remaining <= 5) return { state: 'warn', remaining };
        return { state: 'limited', remaining };
    }

    function stockHtml(p) {
        const s = stockState(p);
        if (s.state === 'ok') return `<div class="stock ok"><span class="stock-dot"></span><span>Sem limite de vagas</span></div>`;
        if (s.state === 'limited') return `<div class="stock ok"><span class="stock-dot"></span><span><b>${s.remaining}</b> vagas restantes</span></div>`;
        if (s.state === 'warn') return `<div class="stock warn"><span class="stock-dot"></span><span>Últimas <b>${s.remaining}</b> vagas</span></div>`;
        return `<div class="stock out"><span class="stock-dot"></span><b>Esgotado</b></div>`;
    }

    function wireBuy() { /* anchors handle navigation natively */ }

    // ========================================================================
    // HELPERS
    // ========================================================================

    function nameOf(p) { return p.name || p.package_name || 'Produto'; }
    function salesOf(p) { return Number(p.total_sales_count || 0); }
    function productUrl(p) { return `/pages/product/?product=${p.id}`; }

    function formatBRL(cents) {
        return (Number(cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function fmtNum(n) { return Number(n || 0).toLocaleString('pt-BR'); }

    // Discreet sales display: exact under 10, otherwise rounded down to one
    // significant figure with a "+" (e.g. 11 → "10+", 470 → "400+", 12483 → "10.000+").
    function discreetCount(n) {
        n = Number(n || 0);
        if (n < 10) return String(n);
        const step = Math.pow(10, Math.floor(Math.log10(n)));
        return (Math.floor(n / step) * step).toLocaleString('pt-BR') + '+';
    }

    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function extractDomain(url) {
        if (!url) return '';
        try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
    }

    function initialFor(str) {
        return String(str || '?').replace(/^www\./, '').charAt(0).toUpperCase();
    }

    function paletteFor(str) {
        let h = 0;
        for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) | 0;
        return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length];
    }
})();
