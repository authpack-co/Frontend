// ============================================================================
// VITRINE MANAGER
// Handles all vitrine tab logic: sidebar nav, state management, product CRUD
// ============================================================================

let vitrineProducts = [];
let vitrineLoaded = false;
let createProductState = {
    step: 1,
    packageId: null,
    packageName: '',
    sessions: [],
    name: '',
    description: '',
    billingType: 'one_time',
    price: '',
    stock: '',
};

/**
 * Among the given sessions, find the one whose darkPalette is the most
 * vibrant (highest chroma = max(r,g,b) - min(r,g,b)).
 * Returns [r, g, b] or null.
 */
function getMostVibrantPaletteFromSessions(sessions) {
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

// ============================================================================
// SIDEBAR NAV — VIEW SWITCHING
// ============================================================================

(function initVitrineNav() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    const inicioSections = [
        document.getElementById('setup-alert'),
        document.querySelector('#packages-list')?.closest('.content-card'),
        document.getElementById('package-details'),
    ].filter(Boolean);

    // Find parent sections more reliably
    const packagesSection = document.querySelector('.content-card:has(#packages-list)') ||
        document.querySelector('#packages-list')?.closest('section');
    const packageDetails = document.getElementById('package-details');
    const vitrineSection = document.getElementById('vitrine-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Skip if already active
            if (item.classList.contains('active')) return;

            // Update active state
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            const view = item.dataset.view;

            if (view === 'inicio') {
                // Show inicio sections
                if (packagesSection) packagesSection.style.display = '';
                if (packageDetails) packageDetails.style.display = '';
                const setupAlert = document.getElementById('setup-alert');
                // Don't force-show setup alert; let its own logic manage visibility

                // Hide vitrines
                if (vitrineSection) vitrineSection.style.display = 'none';
            } else if (view === 'vitrines') {
                // Hide inicio sections
                if (packagesSection) packagesSection.style.display = 'none';
                if (packageDetails) packageDetails.style.display = 'none';
                const setupAlert = document.getElementById('setup-alert');
                if (setupAlert) setupAlert.style.display = 'none';

                // Show vitrines
                if (vitrineSection) vitrineSection.style.display = '';

                // Load vitrine data if not yet loaded
                if (!vitrineLoaded) {
                    loadVitrineTab();
                }
            }
        });
    });
})();

// ============================================================================
// VITRINE TAB LOADING
// ============================================================================

async function loadVitrineTab() {
    const container = document.getElementById('vitrine-container');
    setElementState(container, 'loading');

    // Check if user is Plus
    if (!currentUserInfo || currentUserInfo.plan !== 'plus') {
        setElementState(container, 'vitrine-locked');
        vitrineLoaded = true;
        return;
    }

    // User is Plus — check Stripe connected account status
    try {
        const accountRes = await fetchManager.getSellerAccountStatus();
        console.log('[Vitrine] Account status:', accountRes);

        // State 1: No connected account at all
        if (!accountRes.ok || !accountRes.result?.connected) {
            setElementState(container, 'vitrine-connect');
            vitrineLoaded = true;
            return;
        }

        const accountData = accountRes.result.data;

        // State 2: Account exists but onboarding incomplete
        if (!accountData?.charges_enabled) {
            // Show pending onboarding state
            setElementState(container, 'vitrine-pending');
            vitrineLoaded = true;
            return;
        }

        // State 3: Account fully active — show products
        updateStripeStatusBar(true);

        const productsRes = await fetchManager.getSellerProducts();
        console.log('[Vitrine] Products:', productsRes);
        vitrineProducts = productsRes.ok ? (productsRes.result?.products || []) : [];

        if (vitrineProducts.length === 0) {
            setElementState(container, 'vitrine-empty');
        } else {
            renderVitrineProducts(vitrineProducts);
            setElementState(container, 'vitrine-content');
        }

        vitrineLoaded = true;
    } catch (err) {
        console.error('Error loading vitrine:', err);
        setElementState(container, 'vitrine-connect');
        vitrineLoaded = true;
    }
}

function updateStripeStatusBar(active) {
    const bars = document.querySelectorAll('.vt-stripe-bar');
    bars.forEach(bar => {
        bar.style.display = active ? 'flex' : 'none';
    });
}

// ============================================================================
// PRODUCT RENDERING
// ============================================================================

function renderVitrineProducts(products) {
    const grid = document.getElementById('vitrine-products-grid');
    if (!grid) return;
    grid.innerHTML = '';

    products.forEach(product => {
        const card = createVitrineProductCard(product);
        grid.appendChild(card);
    });
}

function createVitrineProductCard(product) {
    const card = document.createElement('div');
    card.className = 'vp-card';
    if (product.status === 'inactive') card.classList.add('vp-inactive');
    card.dataset.productId = product.id;

    const sessions = product.sessions || [];
    const billingType = product.billing_type || product.billingType || 'one_time';
    const priceValue = parseFloat(product.price_cents || 0) / 100;
    const priceStr = priceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const slug = product.slug || product.id;
    const isInactive = product.status === 'inactive';

    // === Icon header with layered blur effect ===
    const iconHeader = document.createElement('div');
    iconHeader.className = 'vp-icon-header';

    // Layer 1 — background icons (blurred under the overlay, no layout influence)
    const iconBackground = document.createElement('div');
    iconBackground.className = 'vp-icon-background';
    sessions.slice(0, 4).forEach(s => {
        const icon = document.createElement('div');
        icon.className = 'vp-icon';
        const img = document.createElement('img');
        img.src = s.icon;
        img.alt = s.name;
        icon.appendChild(img);
        iconBackground.appendChild(icon);
    });
    iconHeader.appendChild(iconBackground);

    // Apply dynamic gradient from the most vibrant icon's darkPalette
    const vibrant = getMostVibrantPaletteFromSessions(sessions.slice(0, 4));
    if (vibrant) {
        const [r, g, b] = vibrant;
        iconHeader.style.background = `linear-gradient(180deg, rgba(${r},${g},${b},0.25), transparent)`;
    }

    // Layer 2 — frosted blur overlay
    const blurOverlay = document.createElement('div');
    blurOverlay.className = 'vp-blur-overlay';
    iconHeader.appendChild(blurOverlay);

    // Layer 3 — foreground icons (crisp, above the blur)
    const iconForeground = document.createElement('div');
    iconForeground.className = 'vp-icon-foreground';
    sessions.slice(0, 4).forEach(s => {
        const icon = document.createElement('div');
        icon.className = 'vp-icon';
        const img = document.createElement('img');
        img.src = s.icon;
        img.alt = s.name;
        icon.appendChild(img);
        iconForeground.appendChild(icon);
    });
    iconHeader.appendChild(iconForeground);

    // Inactive badge
    if (isInactive) {
        const inactiveBadge = document.createElement('span');
        inactiveBadge.className = 'vp-inactive-badge';
        inactiveBadge.textContent = 'Inativo';
        iconHeader.appendChild(inactiveBadge);
    }

    // Overlay actions (visible on hover)
    const overlay = document.createElement('div');
    overlay.className = 'vp-overlay-actions';

    // Copy link button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'vp-copy-btn';
    copyBtn.title = 'Copiar link';
    copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
    copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = `${window.location.origin}/pages/vitrine/?slug=${slug}`;
        navigator.clipboard.writeText(url).then(() => notify('success', 'Link copiado!'));
    });

    // Options button (⋯) — follows package-options pattern
    const optionsBtn = document.createElement('button');
    optionsBtn.className = 'product-options-btn';
    optionsBtn.textContent = '⋯';

    // Product options menu
    const productOptions = document.createElement('div');
    productOptions.className = 'product-options hidden';

    // Edit option
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-product-btn';
    editBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
        </svg>
    `;
    editBtn.appendChild(document.createTextNode('Editar'));
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        productOptions.classList.add('hidden');
        openEditProductModal(product);
    });

    productOptions.appendChild(editBtn);

    if (isInactive) {
        // Reactivate option
        const reactivateBtn = document.createElement('button');
        reactivateBtn.className = 'reactivate-product-btn';
        reactivateBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6"></path>
                <path d="M21.34 15.57a10 10 0 1 1-.57-8.38"></path>
            </svg>
        `;
        reactivateBtn.appendChild(document.createTextNode('Reativar'));
        reactivateBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            productOptions.classList.add('hidden');
            try {
                const res = await fetchManager.reactivateProduct(product.id);
                if (res.ok) {
                    notify('success', 'Produto reativado');
                    vitrineLoaded = false;
                    await loadVitrineTab();
                } else {
                    notify('error', 'Erro ao reativar');
                }
            } catch (err) {
                console.error('Reactivate error:', err);
                notify('error', 'Erro de conexão');
            }
        });
        productOptions.appendChild(reactivateBtn);
    } else {
        // Deactivate option
        const deactivateBtn = document.createElement('button');
        deactivateBtn.className = 'deactivate-product-btn';
        deactivateBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="m15 9-6 6"/>
                <path d="m9 9 6 6"/>
            </svg>
        `;
        deactivateBtn.appendChild(document.createTextNode('Desativar'));
        deactivateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            productOptions.classList.add('hidden');
            openDeleteProductModal(product);
        });
        productOptions.appendChild(deactivateBtn);
    }

    // Delete option (hard delete)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-product-btn';
    deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
    `;
    deleteBtn.appendChild(document.createTextNode('Excluir'));
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        productOptions.classList.add('hidden');
        openHardDeleteProductModal(product);
    });
    productOptions.appendChild(deleteBtn);

    // Toggle handler for options button
    optionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close all other open product-options
        document.querySelectorAll('.product-options:not(.hidden)').forEach(opt => {
            if (opt !== productOptions) opt.classList.add('hidden');
        });
        productOptions.classList.toggle('hidden');
    });

    overlay.appendChild(copyBtn);
    overlay.appendChild(optionsBtn);
    iconHeader.appendChild(overlay);
    iconHeader.appendChild(productOptions);

    // === Body ===
    const body = document.createElement('div');
    body.className = 'vp-body';

    const name = document.createElement('h3');
    name.className = 'vp-name';
    name.textContent = product.name;

    const desc = document.createElement('p');
    desc.className = 'vp-desc';
    desc.textContent = product.description || product.package_name || '';

    body.appendChild(name);
    body.appendChild(desc);

    // === Footer: price + stock ===
    const footer = document.createElement('div');
    footer.className = 'vp-footer';

    const priceRow = document.createElement('div');
    priceRow.className = 'vp-price-row';

    const priceEl = document.createElement('span');
    priceEl.className = 'vp-price';
    if (billingType === 'subscription') {
        priceEl.innerHTML = `R$ ${priceStr} <span class="vp-period">/ mês</span>`;
    } else {
        priceEl.textContent = `R$ ${priceStr}`;
    }

    priceRow.appendChild(priceEl);

    // Stock badge
    if (product.stock != null) {
        const sold = product.active_access_count || 0;
        const remaining = Math.max(0, product.stock - sold);
        const stockBadge = document.createElement('span');
        stockBadge.className = 'vp-stock';
        stockBadge.textContent = `${remaining} de ${product.stock} disponíveis`;
        if (remaining === 0) {
            stockBadge.classList.add('out');
            stockBadge.textContent = 'Esgotado';
        }
        priceRow.appendChild(stockBadge);
    } else if (billingType === 'subscription') {
        const typeBadge = document.createElement('span');
        typeBadge.className = 'vp-billing-badge';
        typeBadge.textContent = 'Assinatura mensal';
        priceRow.appendChild(typeBadge);
    }

    // View button
    const viewBtn = document.createElement('a');
    viewBtn.className = 'vp-view-btn';
    viewBtn.href = `/pages/vitrine/?slug=${slug}`;
    viewBtn.target = '_blank';
    viewBtn.textContent = 'Ver página do produto';

    footer.appendChild(priceRow);
    footer.appendChild(viewBtn);

    card.appendChild(iconHeader);
    card.appendChild(body);
    card.appendChild(footer);

    return card;
}


// ============================================================================
// STRIPE CONNECT
// ============================================================================

document.getElementById('btn-connect-stripe')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-connect-stripe');
    btn.disabled = true;
    btn.textContent = 'Conectando...';

    try {
        const res = await fetchManager.startSellerOnboarding();
        console.log('[Vitrine] Onboarding response:', res);
        if (res.ok && res.result?.url) {
            window.location.href = res.result.url;
        } else {
            console.warn('[Vitrine] Onboarding failed, response:', res);
            btn.textContent = 'Erro — tente novamente';
            btn.disabled = false;
        }
    } catch (err) {
        console.error('Stripe onboarding error:', err);
        btn.textContent = 'Erro — tente novamente';
        btn.disabled = false;
    }
});

// Continue onboarding (pending state)
document.getElementById('btn-continue-onboarding')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-continue-onboarding');
    btn.disabled = true;
    btn.textContent = 'Redirecionando...';

    try {
        const res = await fetchManager.startSellerOnboarding();
        if (res.ok && res.result?.url) {
            window.location.href = res.result.url;
        } else {
            btn.textContent = 'Erro — tente novamente';
            btn.disabled = false;
        }
    } catch (err) {
        console.error('Continue onboarding error:', err);
        btn.textContent = 'Erro — tente novamente';
        btn.disabled = false;
    }
});

// ============================================================================
// CREATE PRODUCT MODAL
// ============================================================================

function openCreateProductModal() {
    // Reset state
    createProductState = {
        step: 1,
        packageId: null,
        packageName: '',
        sessions: [],
        name: '',
        description: '',
        billingType: 'one_time',
        price: '',
        stock: '',
    };

    // Reset UI
    document.getElementById('product-name').value = '';
    document.getElementById('product-description').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-stock').value = '';

    // Reset billing options
    document.querySelectorAll('.billing-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.type === 'one_time');
    });
    document.querySelector('.subscription-note').style.display = 'none';

    // Hide error
    const errorEl = document.getElementById('create-product-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    // Render packages list
    renderStepPackages();

    // Show step 1
    goToStep(1);

    // Reset button
    const nextBtn = document.getElementById('product-step-next');
    nextBtn.textContent = 'Próximo';

    const btnContainer = nextBtn.closest('.buttonContent');
    setElementState(btnContainer, 'content');

    // Open modal
    const modal = document.getElementById('createProductModal');
    modal.classList.add('show');
}

function closeCreateProductModal() {
    const modal = document.getElementById('createProductModal');
    modal.classList.remove('show');
}

function renderStepPackages() {
    const list = document.getElementById('step-packages-list');
    const emptyEl = document.getElementById('step-empty-packages');

    const packages = packagesList?.userCollection || [];

    if (packages.length === 0) {
        list.style.display = 'none';
        emptyEl.style.display = '';
        return;
    }

    list.style.display = '';
    emptyEl.style.display = 'none';
    list.innerHTML = '';

    packages.forEach(pkg => {
        const item = document.createElement('div');
        item.className = 'step-package-item';
        item.dataset.packageId = pkg.id;

        // Icons
        const icons = document.createElement('div');
        icons.className = 'step-package-icons';
        (pkg.sessions || []).slice(0, 3).forEach(s => {
            const iconWrap = document.createElement('div');
            iconWrap.className = 'stack-icon';
            const img = document.createElement('img');
            img.src = s.icon;
            img.alt = s.name;
            iconWrap.appendChild(img);
            icons.appendChild(iconWrap);
        });

        const name = document.createElement('span');
        name.className = 'step-package-name';
        name.textContent = pkg.name;

        item.appendChild(icons);
        item.appendChild(name);

        item.addEventListener('click', () => {
            list.querySelectorAll('.step-package-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            createProductState.packageId = pkg.id;
            createProductState.packageName = pkg.name;
            createProductState.sessions = pkg.sessions || [];
        });

        list.appendChild(item);
    });
}

function goToStep(stepNum) {
    createProductState.step = stepNum;

    // Update step dots
    document.querySelectorAll('.step-dot').forEach(dot => {
        const dotStep = parseInt(dot.dataset.step);
        dot.classList.remove('active', 'completed');
        if (dotStep === stepNum) dot.classList.add('active');
        else if (dotStep < stepNum) dot.classList.add('completed');
    });

    // Update step panels
    document.querySelectorAll('.product-step').forEach(panel => {
        panel.classList.toggle('active', parseInt(panel.dataset.step) === stepNum);
    });

    // Update back button
    document.getElementById('product-step-back').style.display = stepNum > 1 ? '' : 'none';

    // Update next button text
    const nextBtn = document.getElementById('product-step-next');
    if (stepNum === 6) {
        nextBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>Publicar produto';
    } else {
        nextBtn.textContent = 'Próximo';
    }
}

function showCreateProductError(msg) {
    const errorEl = document.getElementById('create-product-error');
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
}

function hideCreateProductError() {
    const errorEl = document.getElementById('create-product-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
}

function renderReviewSummary() {
    const container = document.getElementById('review-summary');
    const s = createProductState;

    const typeLabel = s.billingType === 'subscription' ? 'Assinatura mensal' : 'Pagamento único';

    container.innerHTML = `
        <div class="review-row">
            <span class="review-label">Pacote</span>
            <span class="review-value">${escapeHtml(s.packageName)}</span>
        </div>
        <div class="review-row">
            <span class="review-label">Nome</span>
            <span class="review-value">${escapeHtml(s.name)}</span>
        </div>
        <div class="review-row">
            <span class="review-label">Tipo</span>
            <span class="review-value">${typeLabel}</span>
        </div>
        <div class="review-row">
            <span class="review-label">Preço</span>
            <span class="review-value">R$ ${parseFloat(s.price).toFixed(2)}</span>
        </div>
        <div class="review-row">
            <span class="review-label">Quantidade</span>
            <span class="review-value">${s.stock ? s.stock : 'Ilimitado'}</span>
        </div>
    `;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Step navigation
document.getElementById('product-step-next')?.addEventListener('click', async () => {
    hideCreateProductError();
    const step = createProductState.step;

    // Validate current step
    switch (step) {
        case 1:
            if (!createProductState.packageId) {
                showCreateProductError('Selecione um pacote');
                return;
            }
            break;
        case 2:
            createProductState.name = document.getElementById('product-name').value.trim();
            createProductState.description = document.getElementById('product-description').value.trim();
            if (!createProductState.name) {
                showCreateProductError('Digite o nome do produto');
                return;
            }
            break;
        case 3:
            // billingType already set via click handler
            break;
        case 4:
            createProductState.price = document.getElementById('product-price').value;
            if (!createProductState.price || parseFloat(createProductState.price) < 1) {
                showCreateProductError('Defina um preço válido (mínimo R$ 1,00)');
                return;
            }
            break;
        case 5:
            const stockVal = document.getElementById('product-stock').value.trim();
            createProductState.stock = stockVal || null;
            if (stockVal && parseInt(stockVal) < 1) {
                showCreateProductError('Quantidade deve ser pelo menos 1');
                return;
            }
            // Prepare review
            renderReviewSummary();
            break;
        case 6:
            // SUBMIT
            await submitCreateProduct();
            return;
    }

    goToStep(step + 1);
});

document.getElementById('product-step-back')?.addEventListener('click', () => {
    hideCreateProductError();
    if (createProductState.step > 1) {
        goToStep(createProductState.step - 1);
    }
});

// Billing type selection
document.querySelectorAll('.billing-option').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.billing-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        createProductState.billingType = opt.dataset.type;

        const subNote = document.querySelector('.subscription-note');
        subNote.style.display = opt.dataset.type === 'subscription' ? '' : 'none';
    });
});

// Submit product creation
async function submitCreateProduct() {
    const nextBtn = document.getElementById('product-step-next');
    const btnContainer = nextBtn.closest('.buttonContent');
    setElementState(btnContainer, 'loading');

    try {
        const s = createProductState;
        const res = await fetchManager.createProduct({
            package_id: s.packageId,
            name: s.name,
            description: s.description,
            billing_type: s.billingType,
            price_cents: Math.round(parseFloat(s.price) * 100),
            currency: 'brl',
            stock: s.stock ? parseInt(s.stock) : null,
        });

        if (res.ok) {
            closeCreateProductModal();
            notify('success', 'Produto criado com sucesso!');

            // Reload vitrine
            vitrineLoaded = false;
            await loadVitrineTab();
        } else {
            showCreateProductError(res.result?.error || 'Erro ao criar produto');
            setElementState(btnContainer, 'content');
        }
    } catch (err) {
        console.error('Create product error:', err);
        showCreateProductError('Erro de conexão');
        setElementState(btnContainer, 'content');
    }
}

// Modal open/close handlers
document.getElementById('btn-create-product')?.addEventListener('click', openCreateProductModal);
document.getElementById('btn-create-product-empty')?.addEventListener('click', openCreateProductModal);

// Close modal handlers
document.getElementById('createProductModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCreateProductModal();
});
document.querySelector('#createProductModal .close-btn')?.addEventListener('click', closeCreateProductModal);

// ============================================================================
// DELETE PRODUCT MODAL
// ============================================================================

let deleteProductId = null;

function openDeleteProductModal(product) {
    deleteProductId = product.id;
    document.getElementById('delete-product-name').textContent = product.name;

    const btnContainer = document.querySelector('#deleteProductModal .buttonContent');
    setElementState(btnContainer, 'content');

    const modal = document.getElementById('deleteProductModal');
    modal.classList.add('show');
}

function closeDeleteProductModal() {
    const modal = document.getElementById('deleteProductModal');
    modal.classList.remove('show');
    deleteProductId = null;
}

document.getElementById('confirm-delete-product')?.addEventListener('click', async () => {
    if (!deleteProductId) return;

    const btnContainer = document.querySelector('#deleteProductModal .buttonContent');
    setElementState(btnContainer, 'loading');

    try {
        const res = await fetchManager.deleteProduct(deleteProductId);
        if (res.ok) {
            closeDeleteProductModal();
            notify('success', 'Produto desativado');

            // Reload
            vitrineLoaded = false;
            await loadVitrineTab();
        } else {
            notify('error', 'Erro ao desativar produto');
            setElementState(btnContainer, 'content');
        }
    } catch (err) {
        console.error('Delete product error:', err);
        notify('error', 'Erro de conexão');
        setElementState(btnContainer, 'content');
    }
});

document.getElementById('deleteProductModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDeleteProductModal();
});
document.querySelector('#deleteProductModal .cancel-btn')?.addEventListener('click', closeDeleteProductModal);

// ============================================================================
// EDIT PRODUCT MODAL
// ============================================================================

let editProductData = null;

function openEditProductModal(product) {
    editProductData = product;
    document.getElementById('edit-product-name').value = product.name || '';
    document.getElementById('edit-product-desc').value = product.description || '';

    const btnContainer = document.querySelector('#editProductModal .buttonContent');
    if (btnContainer) setElementState(btnContainer, 'content');

    const modal = document.getElementById('editProductModal');
    modal.classList.add('show');
}

function closeEditProductModal() {
    const modal = document.getElementById('editProductModal');
    modal.classList.remove('show');
    editProductData = null;
}

document.getElementById('confirm-edit-product')?.addEventListener('click', async () => {
    if (!editProductData) return;

    const name = document.getElementById('edit-product-name').value.trim();
    const description = document.getElementById('edit-product-desc').value.trim();

    if (!name) {
        notify('error', 'O nome é obrigatório');
        return;
    }

    const btnContainer = document.querySelector('#editProductModal .buttonContent');
    setElementState(btnContainer, 'loading');

    try {
        const res = await fetchManager.updateProduct(editProductData.id, { name, description });
        if (res.ok) {
            closeEditProductModal();
            notify('success', 'Produto atualizado');

            vitrineLoaded = false;
            await loadVitrineTab();
        } else {
            notify('error', res.result?.error || 'Erro ao atualizar');
            setElementState(btnContainer, 'content');
        }
    } catch (err) {
        console.error('Edit product error:', err);
        notify('error', 'Erro de conexão');
        setElementState(btnContainer, 'content');
    }
});

document.getElementById('editProductModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeEditProductModal();
});
document.querySelector('#editProductModal .close-btn')?.addEventListener('click', closeEditProductModal);
document.querySelector('#editProductModal .cancel-btn')?.addEventListener('click', closeEditProductModal);

// ============================================================================
// HARD DELETE PRODUCT MODAL
// ============================================================================

let hardDeleteProductId = null;

function openHardDeleteProductModal(product) {
    hardDeleteProductId = product.id;
    document.getElementById('hard-delete-product-name').textContent = product.name;

    const btnContainer = document.querySelector('#hardDeleteProductModal .buttonContent');
    setElementState(btnContainer, 'content');

    const modal = document.getElementById('hardDeleteProductModal');
    modal.classList.add('show');
}

function closeHardDeleteProductModal() {
    const modal = document.getElementById('hardDeleteProductModal');
    modal.classList.remove('show');
    hardDeleteProductId = null;
}

document.getElementById('confirm-hard-delete-product')?.addEventListener('click', async () => {
    if (!hardDeleteProductId) return;

    const btnContainer = document.querySelector('#hardDeleteProductModal .buttonContent');
    setElementState(btnContainer, 'loading');

    try {
        const res = await fetchManager.hardDeleteProduct(hardDeleteProductId);
        if (res.ok) {
            closeHardDeleteProductModal();
            notify('success', 'Produto excluído permanentemente');

            vitrineLoaded = false;
            await loadVitrineTab();
        } else {
            notify('error', 'Erro ao excluir produto');
            setElementState(btnContainer, 'content');
        }
    } catch (err) {
        console.error('Hard delete product error:', err);
        notify('error', 'Erro de conexão');
        setElementState(btnContainer, 'content');
    }
});

document.getElementById('hardDeleteProductModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeHardDeleteProductModal();
});
document.querySelector('#hardDeleteProductModal .cancel-btn')?.addEventListener('click', closeHardDeleteProductModal);
