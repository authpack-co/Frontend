/**
 * AuthPack – Settings Modal (Dashboard)
 *
 * Responsabilidades:
 *  - Menu popup do perfil na sidebar (Configurações / Sair)
 *  - Modal de configurações com sidebar própria
 *  - Seção "Conta": conta Google, plano atual, dispositivos
 */

(function () {
    'use strict';

    // ─── State ────────────────────────────────────────────────────────────────────

    let scUserData = null;
    let scDataLoaded = false;

    // ─── Helpers ──────────────────────────────────────────────────────────────────

    function scEl(id) {
        return document.getElementById(id);
    }

    function scShow(el) {
        if (el) el.style.display = '';
    }

    function scHide(el) {
        if (el) el.style.display = 'none';
    }

    function scFormatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function scGetDeviceSVG(type) {
        switch (type) {
            case 'mobile':
                return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                            <rect x="5" y="2" width="14" height="20" rx="2"/>
                            <circle cx="12" cy="18" r="0.5" fill="currentColor"/>
                        </svg>`;
            case 'tablet':
                return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                            <rect x="4" y="2" width="16" height="20" rx="2"/>
                            <line x1="12" y1="18" x2="12.01" y2="18"/>
                        </svg>`;
            default:
                return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                            <rect x="2" y="3" width="20" height="14" rx="2"/>
                            <polyline points="8 21 16 21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>`;
        }
    }

    // ─── Render: Conta Google ──────────────────────────────────────────────────────

    function scRenderAccountInfo(user) {
        const avatar = scEl('sc-gc-avatar');
        const name   = scEl('sc-gc-name');
        const email  = scEl('sc-gc-email');
        if (avatar) avatar.src = user.picture || '';
        if (name)   name.textContent  = user.name  || '—';
        if (email)  email.textContent = user.email || '—';
    }

    // ─── Render: Plano ────────────────────────────────────────────────────────────

    function scRenderPlanCard(user) {
        const plan       = user.plan;
        const planStatus = user.plan_status;
        const expiresAt  = user.plan_expires_at;

        const elFree     = scEl('sc-plan-state-free');
        const elPlus     = scEl('sc-plan-state-plus');
        const elCanceled = scEl('sc-plan-state-canceled');

        scHide(elFree);
        scHide(elPlus);
        scHide(elCanceled);

        if (plan === 'plus' && planStatus === 'canceled') {
            scShow(elCanceled);
            const untilEl = scEl('sc-plan-canceled-until');
            if (untilEl && expiresAt) {
                untilEl.textContent = `Você continua no Plus até: ${scFormatDate(expiresAt)}`;
            }

        } else if (plan === 'plus' && planStatus === 'active') {
            scShow(elPlus);
            const renewEl = scEl('sc-plan-renews-at');
            if (renewEl && expiresAt) {
                renewEl.textContent = `Renova em: ${scFormatDate(expiresAt)}`;
            }

        } else {
            scShow(elFree);
        }
    }

    // ─── Render: Dispositivos ─────────────────────────────────────────────────────

    function scRenderDevices(devices) {
        const list  = scEl('sc-devices-list');
        const empty = scEl('sc-devices-empty');
        if (!list) return;

        list.innerHTML = '';

        if (!devices || devices.length === 0) {
            scHide(list);
            scShow(empty);
            return;
        }

        scShow(list);
        scHide(empty);

        devices.forEach((device) => {
            const date = scFormatDate(device.createdAt);
            const row  = document.createElement('div');
            row.className       = 'device-row';
            row.dataset.deviceId = device.id;

            row.innerHTML = `
                <div class="device-row-main">
                    <div class="device-type-icon">${scGetDeviceSVG(device.device)}</div>
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
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                        </svg>
                        Remover
                    </button>
                </div>
            `;

            row.querySelector('.device-row-name').textContent =
                `${device.osName} • ${device.browserName}`;
            row.querySelector('.device-row-meta').textContent =
                `Registrado em ${date}`;

            // Expand / collapse ao clicar na linha
            row.addEventListener('click', (e) => {
                if (e.target.closest('.btn-remove-device')) return;
                row.classList.toggle('device-row--expanded');
            });

            // Remover dispositivo
            row.querySelector('.btn-remove-device').addEventListener('click', (e) => {
                e.stopPropagation();
                scHandleRemoveDevice(device.id, device.osName, device.browserName, row);
            });

            list.appendChild(row);
        });
    }

    // ─── Carregamento de dados ────────────────────────────────────────────────────

    async function scLoadData() {
        const loadingEl = scEl('sc-loading');
        const viewEl    = scEl('settings-view-conta');

        if (loadingEl) scShow(loadingEl);
        if (viewEl)    viewEl.classList.remove('active');

        try {
            const res = await fetchManager.getAuthenticatedUser();
            if (!res.ok) return;

            scUserData   = res.result.data;
            scDataLoaded = true;

            scRenderAccountInfo(scUserData);
            scRenderPlanCard(scUserData);
            scRenderDevices(scUserData.devices);

            if (loadingEl) scHide(loadingEl);
            if (viewEl)    viewEl.classList.add('active');

        } catch (err) {
            console.error('[Settings] scLoadData error:', err);
        }
    }

    // ─── Action: Desconectar conta ────────────────────────────────────────────────

    async function scHandleDisconnect() {
        const btn = scEl('sc-btn-disconnect');
        if (!btn) return;
        if (!confirm('Tem certeza que deseja desconectar sua conta Google?')) return;

        btn.disabled    = true;
        btn.textContent = 'Saindo...';

        try {
            await fetchManager.logout();
            window.location.reload();
        } catch (err) {
            console.error('[Settings] disconnect error:', err);
            btn.disabled    = false;
            btn.textContent = 'Desconectar';
        }
    }

    // ─── Action: Remover dispositivo ──────────────────────────────────────────────

    async function scHandleRemoveDevice(deviceId, osName, browserName, rowEl) {
        const label = `${osName} • ${browserName}`;
        if (!confirm(`Remover "${label}" da sua conta?\n\nO acesso deste dispositivo será revogado.`)) return;

        const btn = rowEl.querySelector('.btn-remove-device');
        if (btn) {
            btn.disabled    = true;
            btn.textContent = 'Removendo...';
        }

        try {
            const res = await fetchManager.removeDevice(deviceId);

            if (!res.ok) {
                alert('Não foi possível remover este dispositivo. Tente novamente.');
                if (btn) { btn.disabled = false; btn.textContent = 'Remover'; }
                return;
            }

            // Anima saída da linha
            rowEl.style.transition  = 'opacity 0.3s ease, max-height 0.3s ease';
            rowEl.style.overflow    = 'hidden';
            rowEl.style.maxHeight   = rowEl.offsetHeight + 'px';
            requestAnimationFrame(() => {
                rowEl.style.opacity       = '0';
                rowEl.style.maxHeight     = '0';
                rowEl.style.paddingTop    = '0';
                rowEl.style.paddingBottom = '0';
            });
            setTimeout(() => {
                rowEl.remove();
                const list = scEl('sc-devices-list');
                if (list && list.children.length === 0) {
                    scHide(list);
                    scShow(scEl('sc-devices-empty'));
                }
            }, 320);

        } catch (err) {
            console.error('[Settings] removeDevice error:', err);
            alert('Erro inesperado. Tente novamente.');
            if (btn) btn.disabled = false;
        }
    }

    // ─── Action: Cancelar assinatura ──────────────────────────────────────────────

    async function scHandleCancelPlan() {
        const btn = scEl('sc-btn-cancel-plan');
        if (!btn) return;
        if (!confirm('Cancelar sua assinatura Plus?\n\nVocê mantém o acesso até o fim do período pago.')) return;

        btn.disabled    = true;
        btn.textContent = 'Cancelando...';

        try {
            const res = await fetchManager.cancelBilling();
            if (!res.ok) {
                alert('Não foi possível cancelar a assinatura. Tente novamente.');
                btn.disabled    = false;
                btn.textContent = 'Cancelar assinatura';
                return;
            }
            if (scUserData) scUserData.plan_status = 'canceled';
            scRenderPlanCard(scUserData);
        } catch (err) {
            console.error('[Settings] cancelBilling error:', err);
            btn.disabled    = false;
            btn.textContent = 'Cancelar assinatura';
        }
    }

    // ─── Action: Reativar assinatura ──────────────────────────────────────────────

    async function scHandleReactivatePlan() {
        const btn = scEl('sc-btn-reactivate-plan');
        if (!btn) return;

        btn.disabled    = true;
        btn.textContent = 'Reativando...';

        try {
            const res = await fetchManager.reactivateBilling();
            if (!res.ok) {
                alert('Não foi possível reativar a assinatura. Tente novamente.');
                btn.disabled    = false;
                btn.textContent = 'Reativar';
                return;
            }
            if (scUserData) scUserData.plan_status = 'active';
            scRenderPlanCard(scUserData);
        } catch (err) {
            console.error('[Settings] reactivateBilling error:', err);
            btn.disabled    = false;
            btn.textContent = 'Reativar';
        }
    }

    // ─── Action: Assinar Plus (fecha settings, abre Plus modal) ──────────────────

    function scHandleAssinarPlus() {
        scCloseModal();
        // Usa o utils do dashboard para abrir o Plus modal
        if (typeof utils !== 'undefined' && utils.showModal) {
            utils.showModal('plusSubscribe');
        }
    }

    // ─── Action: Logout ───────────────────────────────────────────────────────────

    async function scHandleLogout() {
        try {
            await fetchManager.logout();
            window.location.reload();
        } catch (err) {
            console.error('[Settings] logout error:', err);
        }
    }

    // ─── Modal open / close ───────────────────────────────────────────────────────

    function scOpenModal() {
        const overlay = scEl('settingsModal');
        if (!overlay) return;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';

        // Carrega dados na primeira abertura
        if (!scDataLoaded) {
            scLoadData();
        }
    }

    function scCloseModal() {
        const overlay = scEl('settingsModal');
        if (!overlay) return;
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    // ─── Profile menu toggle ──────────────────────────────────────────────────────

    function initProfileMenu() {
        const profileBtn = scEl('sidebar-profile');
        const menu       = scEl('sidebar-profile-menu');
        if (!profileBtn || !menu) return;

        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.contains('open');
            menu.classList.toggle('open', !isOpen);
            profileBtn.classList.toggle('menu-open', !isOpen);
        });

        // Fecha ao clicar fora
        document.addEventListener('click', () => {
            menu.classList.remove('open');
            profileBtn.classList.remove('menu-open');
        });

        // Evita fechar ao clicar dentro do menu
        menu.addEventListener('click', (e) => e.stopPropagation());

        const settingsBtn = scEl('btn-open-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                menu.classList.remove('open');
                profileBtn.classList.remove('menu-open');
                scOpenModal();
            });
        }

        const logoutBtn = scEl('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', scHandleLogout);
        }
    }

    // ─── Settings nav (troca de seção) ───────────────────────────────────────────

    function initSettingsNav() {
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const view = item.dataset.view;
                document.querySelectorAll('.settings-view').forEach(v => v.classList.remove('active'));
                const target = scEl(`settings-view-${view}`);
                if (target) target.classList.add('active');
            });
        });
    }

    // ─── Init ─────────────────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', () => {
        initProfileMenu();
        initSettingsNav();

        // Fechar modal
        const closeBtn = scEl('settings-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', scCloseModal);

        // Clicar no overlay escuro fecha
        const overlay = scEl('settingsModal');
        if (overlay) overlay.addEventListener('click', (e) => {
            if (e.target === overlay) scCloseModal();
        });

        // ESC fecha
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') scCloseModal();
        });

        // Botões de ação
        const disconnectBtn    = scEl('sc-btn-disconnect');
        const cancelPlanBtn    = scEl('sc-btn-cancel-plan');
        const reactivateBtn    = scEl('sc-btn-reactivate-plan');
        const assinarPlusBtn   = scEl('sc-btn-assinar-plus');

        if (disconnectBtn)  disconnectBtn.addEventListener('click',  scHandleDisconnect);
        if (cancelPlanBtn)  cancelPlanBtn.addEventListener('click',  scHandleCancelPlan);
        if (reactivateBtn)  reactivateBtn.addEventListener('click',  scHandleReactivatePlan);
        if (assinarPlusBtn) assinarPlusBtn.addEventListener('click', scHandleAssinarPlus);
    });

})();
