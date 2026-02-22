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
    ? 'http://127.0.0.1:5500'
    : 'https://dashboard.authpack.co';

// ─── State ────────────────────────────────────────────────────────────────────

let userData = null;
let isExtensionActive = false;

// ─── FingerprintJS ────────────────────────────────────────────────────────────

const fpPromise = import('https://fp.authpack.co/web/v3/WhjnKdImdrIFK4nCzKLI')
    .then(FingerprintJS => FingerprintJS.load({
        endpoint: ['https://fp.authpack.co', FingerprintJS.defaultEndpoint]
    }));

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

// ─── Download extension ───────────────────────────────────────────────────────

async function downloadExtension() {
    if (!userData) return;

    const btn = el('btn-download');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
            <path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Preparando...`;
    }

    try {
        const fp = await fpPromise;
        const result = await fp.get({ extendedResult: true });
        const { visitorId, requestId } = result;

        const response = await fetchManager.downloadExtension({ visitorId, requestId });

        if (!response.ok) {
            const error = await response.json();
            if (error.errorMessage === 'Limite de dispositivos atingido para esta conta') {
                showDeviceLimitError();
            } else {
                alert('Erro ao baixar a extensão. Tente novamente.');
            }
            resetDownloadButton();
            return;
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'AuthPack.zip';
        if (contentDisposition) {
            const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
            if (match && match[1]) filename = match[1].replace(/['"]/g, '');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        if (btn) {
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/></svg> Baixado!`;
            setTimeout(resetDownloadButton, 3000);
        }

    } catch (err) {
        console.error('[AccountCenter] download error:', err);
        resetDownloadButton();
    }
}

function resetDownloadButton() {
    const btn = el('btn-download');
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/>
    </svg> Baixar Extensão`;
}

function showDeviceLimitError() {
    const notice = el('ext-limit-notice');
    setVisible(notice, true);

    const btn = el('btn-download');
    if (btn) btn.classList.add('disabled');
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

    devices.forEach((device, idx) => {
        const isFirst = idx === 0;          // Most recent = current (heuristic)
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
                ${isFirst
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
        const img = headerAvatar.querySelector('img');
        if (img) img.src = user.picture || '';
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

function applyState(connected, extensionActive) {
    // Hide all state blocks first
    ['state-1', 'state-2', 'state-3-4'].forEach(id => setVisible(el(id), false));

    // Header elements
    const extStatusEl = el('ext-status');
    const headerAvatar = el('header-avatar');
    const btnDashboard = el('btn-open-dashboard');

    // Extension status badge
    if (extStatusEl) {
        extStatusEl.className = extensionActive
            ? 'ext-status ext-status--active'
            : 'ext-status ext-status--inactive';
        extStatusEl.innerHTML = extensionActive
            ? `<span class="ext-dot"></span> Extensão: Ativa ✅`
            : `<span class="ext-dot"></span> Extensão: Não detectada ❌`;
    }

    // Open Dashboard button  → only if extension active
    setVisible(btnDashboard, extensionActive);

    // Avatar → only if connected
    setVisible(headerAvatar, connected);

    if (!connected && !extensionActive) {
        // ── STATE 1 ──────────────────────────────────────────
        setVisible(el('state-1'), true);

    } else if (!connected && extensionActive) {
        // ── STATE 2 ──────────────────────────────────────────
        setVisible(el('state-2'), true);

    } else {
        // Connected (State 3 or 4) – shared layout
        setVisible(el('state-3-4'), true);

        // Extension section: detected vs not
        const extActive = el('ext-active-section');
        const extInstall = el('ext-install-section');
        setVisible(extActive, extensionActive);
        setVisible(extInstall, !extensionActive);

        // Reinstall button visible only in State 4
        const btnReinstall = el('btn-reinstall');
        setVisible(btnReinstall, extensionActive);
    }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {

    // 1. Detect extension
    isExtensionActive = document.documentElement.hasAttribute('data-authpack-active');

    // 2. Wire up static buttons
    const googleAuthButtons = document.querySelectorAll('.js-connect-google');
    googleAuthButtons.forEach(btn => {
        btn.addEventListener('click', () => { window.location.href = GOOGLE_AUTH_URL; });
    });

    const downloadBtn = el('btn-download');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadExtension);

    const reinstallBtn = el('btn-reinstall');
    if (reinstallBtn) reinstallBtn.addEventListener('click', downloadExtension);

    const dashBtn = el('btn-open-dashboard');
    if (dashBtn) dashBtn.addEventListener('click', () => { window.open(DASHBOARD_URL, '_self'); });

    const disconnectBtn = el('btn-disconnect');
    if (disconnectBtn) disconnectBtn.addEventListener('click', handleDisconnect);

    // 3. Fetch authenticated user
    const fetchUser = await fetchManager.getAuthenticatedUser();

    if (!fetchUser.ok) {
        // Not connected
        applyState(false, isExtensionActive);
        return;
    }

    // 4. Connected
    userData = fetchUser.result.data;
    renderUserInfo(userData);
    renderDevices(userData.devices);
    applyState(true, isExtensionActive);

    // 5. Check device limit for download button (State 3)
    if (!isExtensionActive && userData.devices && userData.devices.length >= 2) {
        showDeviceLimitError();
    }
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

