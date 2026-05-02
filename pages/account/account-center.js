/**
 * AuthPack – Account Center
 * State machine: 4 states based on { isConnected, isExtensionActive }
 *
 * State 1: !connected  && !extension  → pure onboarding
 * State 2: !connected  &&  extension  → extension active, no identity
 * State 3:  connected  && !extension  → logged in, no extension
 * State 4:  connected  &&  extension  → fully configured
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const GOOGLE_AUTH_URL = IS_DEV
    ? 'http://127.0.0.1:3000/api/auth/google'
    : 'https://api.authpack.co/api/auth/google';

const DASHBOARD_URL = IS_DEV
    ? 'http://127.0.0.1:5500/pages/dashboard'
    : 'https://authpack.co/pages/dashboard';

// ─── State ────────────────────────────────────────────────────────────────────

let userData = null;
let isExtensionActive = false;



// ─── Helpers ──────────────────────────────────────────────────────────────────

function el(id) {
    return document.getElementById(id);
}

function setVisible(element, visible) {
    if (!element) return;
    element.classList.toggle('hidden', !visible);
}

function getDeviceSVG(type) {
    switch (type) {
        case 'mobile':
            return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <rect x="5" y="2" width="14" height="20" rx="2"/>
                        <circle cx="12" cy="18" r="0.5" fill="currentColor"/>
                    </svg>`;
        case 'tablet':
            return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <rect x="4" y="2" width="16" height="20" rx="2"/>
                        <line x1="12" y1="18" x2="12.01" y2="18"/>
                    </svg>`;
        default:
            return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <polyline points="8 21 16 21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>`;
    }
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}



// ─── Render helpers ───────────────────────────────────────────────────────────

function renderDevices(devices) {
    const list = el('devices-list');
    const empty = el('devices-empty');
    if (!list) return;

    list.innerHTML = '';

    if (!devices || devices.length === 0) {
        setVisible(list, false);
        setVisible(empty, true);
        return;
    }

    setVisible(list, true);
    setVisible(empty, false);

    devices.forEach((device) => {
        const date = formatDate(device.createdAt);

        const row = document.createElement('div');
        row.className = 'device-row';
        row.dataset.deviceId = device.id;
        row.innerHTML = `
            <div class="device-row-main">
                <div class="device-type-icon">${getDeviceSVG(device.device)}</div>
                <div class="device-row-info">
                    <div class="device-row-name"></div>
                    <div class="device-row-meta"></div>
                </div>
                ${device.isCurrentDevice
                ? `<span class="device-row-badge device-row-badge--current">Este dispositivo</span>`
                : `<span class="device-row-badge device-row-badge--other">v${device.version}</span>`
            }
            </div>
            <div class="device-row-actions">
                <button class="btn btn-danger btn-remove-device" data-device-id="${device.id}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                    Remover dispositivo
                </button>
            </div>
        `;

        row.querySelector('.device-row-name').textContent =
            `${device.osName} • ${device.browserName}`;
        row.querySelector('.device-row-meta').textContent =
            `Registrado em ${date}`;

        // Toggle expand on row click (but not on the remove button itself)
        row.addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove-device')) return;
            row.classList.toggle('device-row--expanded');
        });

        // Remove button
        row.querySelector('.btn-remove-device').addEventListener('click', (e) => {
            e.stopPropagation();
            handleRemoveDevice(device.id, device.osName, device.browserName, row);
        });

        list.appendChild(row);
    });
}


function renderUserInfo(user) {
    // Header avatar
    const headerAvatar = el('header-avatar');
    if (headerAvatar) {
        headerAvatar.src = user.picture || '';
        setVisible(headerAvatar, true);
    }

    // Google account card
    const gcName = el('gc-name');
    const gcEmail = el('gc-email');
    const gcAvatar = el('gc-avatar');

    if (gcName) gcName.textContent = user.name;
    if (gcEmail) gcEmail.textContent = user.email;
    if (gcAvatar) gcAvatar.src = user.picture || '';
}

// ─── State renderer ───────────────────────────────────────────────────────────

function applyState(connected) {
    // Hide all state blocks first
    ['state-1', 'state-2', 'state-3-4'].forEach(id => setVisible(el(id), false));

    // Header elements
    const headerAvatar = el('header-avatar');
    const btnDashboard = el('btn-open-dashboard');

    // Always show dashboard button when connected
    setVisible(btnDashboard, connected);

    // Avatar → only if connected
    setVisible(headerAvatar, connected);

    if (connected) {
        setVisible(el('state-3-4'), true);
    }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {


    // 2. Wire up static buttons
    const googleAuthButtons = document.querySelectorAll('.js-connect-google');
    googleAuthButtons.forEach(btn => {
        btn.addEventListener('click', () => { window.location.href = GOOGLE_AUTH_URL; });
    });



    // Initialize Plus modal
    PlusModal.init();

    // Wire plan card buttons
    const cancelPlanBtn = el('btn-cancel-plan');
    if (cancelPlanBtn) cancelPlanBtn.addEventListener('click', handleCancelPlan);

    const reactivatePlanBtn = el('btn-reactivate-plan');
    if (reactivatePlanBtn) reactivatePlanBtn.addEventListener('click', handleReactivatePlan);

    const assinarPlusBtn = el('btn-assinar-plus');
    if (assinarPlusBtn) assinarPlusBtn.addEventListener('click', () => PlusModal.show());

    const dashBtn = el('btn-open-dashboard');
    if (dashBtn) dashBtn.addEventListener('click', () => { window.open(DASHBOARD_URL, '_self'); });

    const disconnectBtn = el('btn-disconnect');
    if (disconnectBtn) disconnectBtn.addEventListener('click', handleDisconnect);

    // 3. Fetch authenticated user
    const fetchUser = await fetchManager.getAuthenticatedUser();

    if (!fetchUser.ok) {
        // Not connected — redirect to login
        window.location.replace('/pages/login/?redirect=' + encodeURIComponent('/pages/account/'));
        return;
    }

    // 4. Connected
    userData = fetchUser.result.data;
    renderUserInfo(userData);
    renderDevices(userData.devices);
    renderPlanCard(userData);
    applyState(true);
});

// ─── Disconnect ───────────────────────────────────────────────────────────────

async function handleDisconnect() {
    const btn = el('btn-disconnect');
    if (!btn) return;

    if (!confirm('Tem certeza que deseja desconectar sua conta Google?')) return;

    btn.disabled = true;
    btn.textContent = 'Saindo...';

    try {
        await fetchManager.logout();
        window.location.reload();
    } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Desconectar';
        console.error('[AccountCenter] logout error:', err);
    }
}

// ─── Remove Device ────────────────────────────────────────────────────────────

async function handleRemoveDevice(deviceId, osName, browserName, rowEl) {
    const label = `${osName} • ${browserName}`;
    if (!confirm(`Remover "${label}" da sua conta?\n\nO acesso deste dispositivo será revogado.`)) return;

    const btn = rowEl.querySelector('.btn-remove-device');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Removendo...
        `;
    }

    try {
        const res = await fetchManager.removeDevice(deviceId);

        if (!res.ok) {
            alert('Não foi possível remover este dispositivo. Tente novamente.');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                    Remover dispositivo
                `;
            }
            return;
        }

        // Fade out and remove row
        rowEl.style.transition = 'opacity 0.3s ease, max-height 0.35s ease';
        rowEl.style.overflow = 'hidden';
        rowEl.style.maxHeight = rowEl.offsetHeight + 'px';
        requestAnimationFrame(() => {
            rowEl.style.opacity = '0';
            rowEl.style.maxHeight = '0';
            rowEl.style.paddingTop = '0';
            rowEl.style.paddingBottom = '0';
        });
        setTimeout(() => {
            rowEl.remove();
            // Show empty state if no devices left
            const list = el('devices-list');
            if (list && list.children.length === 0) {
                setVisible(list, false);
                setVisible(el('devices-empty'), true);
            }
        }, 350);

    } catch (err) {
        console.error('[AccountCenter] removeDevice error:', err);
        alert('Erro inesperado. Tente novamente.');
        if (btn) btn.disabled = false;
    }
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function renderPlanCard(user) {
    const plan = user.plan;            // 'free' | 'plus'
    const planStatus = user.plan_status; // 'active' | 'canceled'
    const expiresAt = user.plan_expires_at;

    // Hide all plan state blocks first
    ['plan-state-free', 'plan-state-plus', 'plan-state-canceled'].forEach(id => setVisible(el(id), false));

    if (plan === 'plus' && planStatus === 'canceled') {
        // Estado Plus Cancelado
        setVisible(el('plan-state-canceled'), true);
        const untilEl = el('plan-canceled-until');
        if (untilEl && expiresAt) {
            untilEl.textContent = `Você continuará no plano Plus até: ${formatDate(expiresAt)}`;
        }

    } else if (plan === 'plus' && planStatus === 'active') {
        // Estado Plus Ativo
        setVisible(el('plan-state-plus'), true);
        const renewEl = el('plan-renews-at');
        if (renewEl && expiresAt) {
            renewEl.textContent = `Renova em: ${formatDate(expiresAt)}`;
        }

    } else {
        // Estado Free (fallback)
        setVisible(el('plan-state-free'), true);
    }
}

async function handleCancelPlan() {
    const btn = el('btn-cancel-plan');
    if (!btn) return;

    if (!confirm('Tem certeza que deseja cancelar sua assinatura Plus?\n\nVocê continuará com acesso Plus até o fim do período pago.')) return;

    btn.disabled = true;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Cancelando...`;

    try {
        const res = await fetchManager.cancelBilling();
        if (!res.ok) {
            alert('Não foi possível cancelar a assinatura. Tente novamente.');
            btn.disabled = false;
            btn.textContent = 'Cancelar assinatura';
            return;
        }
        // Atualiza estado localmente (sem esperar o webhook)
        if (userData) userData.plan_status = 'canceled';
        renderPlanCard(userData);
    } catch (err) {
        console.error('[AccountCenter] cancelBilling error:', err);
        btn.disabled = false;
        btn.textContent = 'Cancelar assinatura';
    }
}

async function handleReactivatePlan() {
    const btn = el('btn-reactivate-plan');
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Reativando...`;

    try {
        const res = await fetchManager.reactivateBilling();
        if (!res.ok) {
            alert('Não foi possível reativar a assinatura. Tente novamente.');
            btn.disabled = false;
            btn.textContent = 'Reativar assinatura';
            return;
        }
        // Atualiza estado localmente (sem esperar o webhook)
        if (userData) userData.plan_status = 'active';
        renderPlanCard(userData);
    } catch (err) {
        console.error('[AccountCenter] reactivateBilling error:', err);
        btn.disabled = false;
        btn.textContent = 'Reativar assinatura';
    }
}

// ─── Plus Modal ───────────────────────────────────────────────────────────────

const PlusModal = (() => {
    const overlay = () => el('plusSubscribeModal');

    function show() {
        const ov = overlay();
        if (!ov) return;
        ov.offsetHeight; // force reflow
        ov.classList.add('show');
        ov.removeAttribute('aria-hidden');
    }

    function hide() {
        const ov = overlay();
        if (!ov) return;
        ov.classList.remove('show');
        ov.setAttribute('aria-hidden', 'true');
    }

    async function handleCta() {
        const ctaBtn = el('plus-modal-ac-cta');
        if (ctaBtn) {
            ctaBtn.disabled = true;
            ctaBtn.textContent = 'Redirecionando...';
        }

        try {
            const res = await fetchManager.createCheckoutOrder({ origin: 'platform' });

            if (!res.ok) {
                const msg = res.result?.error === 'ALREADY_SUBSCRIBED_TO_THIS_PLAN'
                    ? 'Você já possui uma assinatura ativa.'
                    : res.result?.error || 'Erro ao iniciar checkout.';
                alert(msg);
                if (ctaBtn) {
                    ctaBtn.disabled = false;
                    ctaBtn.textContent = 'Assinar Plus';
                }
                return;
            }

            const orderId = res.result?.id;
            if (!orderId) {
                alert('Erro ao criar pedido. Tente novamente.');
                if (ctaBtn) {
                    ctaBtn.disabled = false;
                    ctaBtn.textContent = 'Assinar Plus';
                }
                return;
            }

            window.location.href = `/pages/checkout/?orderId=${orderId}`;
        } catch (err) {
            console.error('Plus checkout redirect error:', err);
            alert('Erro inesperado. Tente novamente.');
            if (ctaBtn) {
                ctaBtn.disabled = false;
                ctaBtn.textContent = 'Assinar Plus';
            }
        }
    }

    function init() {
        const closeBtn = el('plus-modal-ac-close');
        if (closeBtn) closeBtn.addEventListener('click', hide);

        const ctaBtn = el('plus-modal-ac-cta');
        if (ctaBtn) ctaBtn.addEventListener('click', handleCta);

        const ov = overlay();
        if (ov) ov.addEventListener('click', (e) => { if (e.target === ov) hide(); });
    }

    return { init, show, hide };
})();



