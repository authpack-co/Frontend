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

        if (!accountRes.ok || !accountRes.result?.connected || !accountRes.result?.data?.charges_enabled) {
            // Not connected or not fully onboarded
            setElementState(container, 'vitrine-connect');
            vitrineLoaded = true;
            return;
        }

        // Connected — fetch products
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
    card.className = 'vitrine-product-card';
    card.dataset.productId = product.id;

    // Header: name + actions
    const header = document.createElement('div');
    header.className = 'vitrine-product-card-header';

    const name = document.createElement('h3');
    name.className = 'vitrine-product-name';
    name.textContent = product.name;

    const actions = document.createElement('div');
    actions.className = 'vitrine-product-actions';

    const copyBtn = document.createElement('button');
    copyBtn.title = 'Copiar link';
    copyBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
    `;
    copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slug = product.slug || product.id;
        const url = `${window.location.origin}/pages/vitrine/?slug=${slug}`;
        navigator.clipboard.writeText(url).then(() => {
            notify('success', 'Link copiado!');
        });
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.title = 'Desativar';
    deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
    `;
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteProductModal(product);
    });

    actions.appendChild(copyBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(name);
    header.appendChild(actions);

    // Icons (from package sessions)
    const icons = document.createElement('div');
    icons.className = 'vitrine-product-icons';
    const sessions = product.sessions || [];
    sessions.slice(0, 4).forEach(session => {
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'stack-icon';
        const img = document.createElement('img');
        img.src = session.icon;
        img.alt = session.name;
        iconWrapper.appendChild(img);
        icons.appendChild(iconWrapper);
    });

    // Footer: price + type badge
    const footer = document.createElement('div');
    footer.className = 'vitrine-product-footer';

    const price = document.createElement('div');
    price.className = 'vitrine-product-price';
    const priceValue = parseFloat(product.price_cents || product.price_amount || product.priceAmount || 0) / 100;
    price.innerHTML = `<span class="currency">R$</span> ${priceValue.toFixed(2)}`;

    const typeBadge = document.createElement('span');
    const billingType = product.billing_type || product.billingType || 'one_time';
    typeBadge.className = `vitrine-product-type ${billingType}`;
    typeBadge.textContent = billingType === 'subscription' ? 'Assinatura' : 'Único';

    footer.appendChild(price);
    footer.appendChild(typeBadge);

    card.appendChild(header);
    if (sessions.length > 0) card.appendChild(icons);
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
        nextBtn.innerHTML = '🚀 Publicar produto';
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
