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

    let scBillingData   = null;
    let scBillingLoaded = false;

    // Fallback price for the AuthPack Plus plan (R$ 16,90/mês), used when there
    // are no invoices yet to read the real amount from.
    const PLUS_PRICE_CENTS = 1690;

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

    function scFormatMoney(cents, currency) {
        const value = (Number(cents) || 0) / 100;
        return value.toLocaleString('pt-BR', { style: 'currency', currency: currency || 'BRL' });
    }

    // "Junho de 2026" (capitalized) — used as the billing-period title.
    function scMonthLabel(dateStr) {
        const d = new Date(dateStr);
        const s = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function scAddMonthISO(dateStr) {
        const d = new Date(dateStr);
        d.setMonth(d.getMonth() + 1);
        return d.toISOString();
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
        const role       = user.role;

        const elFree     = scEl('sc-plan-state-free');
        const elPlus     = scEl('sc-plan-state-plus');
        const elCanceled = scEl('sc-plan-state-canceled');
        const elRole     = scEl('sc-plan-state-role');

        scHide(elFree);
        scHide(elPlus);
        scHide(elCanceled);
        scHide(elRole);

        // Vendedor/admin têm os benefícios do Plus pelo papel — não assinam.
        // Whitelist explícita (espelha PLUS_BENEFIT_ROLES no backend).
        const PLUS_BENEFIT_ROLES = ['seller', 'admin'];
        if (PLUS_BENEFIT_ROLES.includes(role)) {
            scShow(elRole);
            const lbl = scEl('sc-plan-role-label');
            if (lbl) lbl.textContent = role === 'admin' ? 'Administrador' : 'Vendedor';
            return;
        }

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
            // Billing view shows plan status too — force a fresh reload next time.
            scBillingLoaded = false;
        } catch (err) {
            console.error('[Settings] cancelBilling error:', err);
            btn.disabled    = false;
            btn.textContent = 'Cancelar assinatura';
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

    // ─── Billing: plano vigente ───────────────────────────────────────────────────

    function scSetStatusBadge(el, text, kind) {
        if (!el) return;
        el.textContent = text;
        el.className = `bl-status-badge bl-status-badge--${kind}`;
        el.style.display = '';
    }

    function scRenderBillingPlan(billing) {
        const nameEl  = scEl('bl-plan-name');
        const badgeEl = scEl('bl-plan-badge');
        const priceEl = scEl('bl-plan-price');
        const renewEl = scEl('bl-plan-renew');
        const noteEl  = scEl('bl-plan-note');

        // Vendedor/admin: benefícios Plus inclusos pelo papel — sem cobrança.
        const role = scUserData && scUserData.role;
        if (role === 'seller' || role === 'admin') {
            if (nameEl)  nameEl.textContent = 'Benefícios Plus inclusos';
            scSetStatusBadge(badgeEl, role === 'admin' ? 'Administrador' : 'Vendedor', 'paid');
            if (priceEl) priceEl.textContent = 'Incluso';
            if (renewEl) renewEl.textContent = '';
            if (noteEl) {
                noteEl.textContent = 'Seu papel já inclui todos os recursos do Plus. Nenhuma assinatura é necessária.';
                scShow(noteEl);
            }
            return;
        }

        const plan      = billing.plan;
        const status    = billing.plan_status;
        const sub       = billing.subscription;
        const invoices  = billing.invoices || [];
        // Plus without a subscription row = courtesy/trial grant (no charges).
        const isTrial   = plan === 'plus' && !sub;
        const priceCents = invoices.length ? invoices[0].amount_paid : PLUS_PRICE_CENTS;
        const currency   = (invoices[0] && invoices[0].currency) || 'BRL';

        if (renewEl) renewEl.textContent = '';
        if (noteEl)  scHide(noteEl);

        if (plan === 'plus') {
            if (nameEl) nameEl.textContent = 'AuthPack Plus';

            if (isTrial) {
                scSetStatusBadge(badgeEl, 'Cortesia', 'trial');
                if (priceEl) priceEl.textContent = 'Gratuito';
                if (renewEl && billing.plan_expires_at) {
                    renewEl.textContent = `Ativo até ${scFormatDate(billing.plan_expires_at)}`;
                }
                if (noteEl) {
                    noteEl.textContent = 'Período promocional gratuito — nenhuma cobrança será feita.';
                    scShow(noteEl);
                }
            } else if (status === 'canceled') {
                scSetStatusBadge(badgeEl, 'Cancelada', 'overdue');
                if (priceEl) priceEl.textContent = `${scFormatMoney(priceCents, currency)} / mês`;
                if (renewEl && billing.plan_expires_at) {
                    renewEl.textContent = `Acesso até ${scFormatDate(billing.plan_expires_at)}`;
                }
                if (noteEl) {
                    noteEl.textContent = 'Assinatura cancelada — não será renovada. O acesso Plus permanece até o fim do período pago.';
                    scShow(noteEl);
                }
            } else {
                scSetStatusBadge(badgeEl, 'Ativa', 'paid');
                if (priceEl) priceEl.textContent = `${scFormatMoney(priceCents, currency)} / mês`;
                if (renewEl && sub && sub.current_period_end) {
                    renewEl.textContent = `Renova em ${scFormatDate(sub.current_period_end)}`;
                }
            }
        } else {
            if (nameEl)  nameEl.textContent = 'Plano Free';
            if (badgeEl) scHide(badgeEl);
            if (priceEl) priceEl.textContent = 'Gratuito';
            if (noteEl) {
                noteEl.textContent = 'Você está no plano Free. Assine o Plus para ter pacotes, sessões e usuários sem limites.';
                scShow(noteEl);
            }
        }
    }

    // ─── Billing: timeline de meses ────────────────────────────────────────────────

    // Constrói a lista de períodos (meses) a partir das faturas pagas e da
    // próxima cobrança em aberto/atrasada da assinatura.
    function scBuildPeriods(billing) {
        const periods  = [];
        const invoices = billing.invoices || [];
        const sub      = billing.subscription;

        // Ciclos já pagos (uma fatura por ciclo).
        invoices.forEach((inv) => {
            periods.push({
                status:      'paid',
                periodStart: inv.period_start || inv.paid_at,
                periodEnd:   inv.period_end,
                dueDate:     inv.period_start || inv.paid_at,
                amount:      inv.amount_paid,
                currency:    inv.currency || 'BRL',
                paidAt:      inv.paid_at,
            });
        });

        // Próxima cobrança — apenas quando a assinatura está ativa e vai renovar.
        // A cobrança ocorre em current_period_end (fim do ciclo já pago).
        if (billing.plan === 'plus' && sub && sub.status === 'active'
            && !sub.cancel_at_period_end && sub.current_period_end) {
            const dueTime = new Date(sub.current_period_end).getTime();
            periods.push({
                status:      dueTime > Date.now() ? 'open' : 'overdue',
                periodStart: sub.current_period_end,
                periodEnd:   scAddMonthISO(sub.current_period_end),
                dueDate:     sub.current_period_end,
                amount:      invoices.length ? invoices[0].amount_paid : PLUS_PRICE_CENTS,
                currency:    (invoices[0] && invoices[0].currency) || 'BRL',
                paidAt:      null,
            });
        }

        // Mais recente primeiro.
        periods.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
        return periods;
    }

    const SC_STATUS_META = {
        paid:    { label: 'Pago',      icon: '<path d="M20 6 9 17l-5-5"/>' },
        open:    { label: 'Em aberto', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
        overdue: { label: 'Atrasada',  icon: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
    };

    function scBuildPeriodRow(p) {
        const meta = SC_STATUS_META[p.status] || SC_STATUS_META.open;

        let metaText = '';
        if (p.status === 'paid') {
            metaText = p.paidAt ? `Pago em ${scFormatDate(p.paidAt)}` : 'Pagamento confirmado';
        } else if (p.status === 'open') {
            metaText = `Vence em ${scFormatDate(p.dueDate)}`;
        } else {
            metaText = `Vencido em ${scFormatDate(p.dueDate)}`;
        }

        const row = document.createElement('div');
        row.className = `bl-period-row bl-period-row--${p.status}`;
        row.innerHTML = `
            <div class="bl-period-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${meta.icon}</svg>
            </div>
            <div class="bl-period-info">
                <div class="bl-period-title"></div>
                <div class="bl-period-meta"></div>
            </div>
            <div class="bl-period-right">
                <div class="bl-period-amount">${scFormatMoney(p.amount, p.currency)}</div>
                <span class="bl-status-badge bl-status-badge--${p.status}">${meta.label}</span>
            </div>
        `;
        row.querySelector('.bl-period-title').textContent = scMonthLabel(p.periodStart);
        row.querySelector('.bl-period-meta').textContent  = metaText;
        return row;
    }

    function scRenderPeriods(periods) {
        const list  = scEl('bl-periods-list');
        const empty = scEl('bl-periods-empty');
        if (!list) return;

        list.innerHTML = '';

        if (!periods.length) {
            scHide(list);
            scShow(empty);
            return;
        }

        scShow(list);
        scHide(empty);
        periods.forEach((p) => list.appendChild(scBuildPeriodRow(p)));
    }

    async function scLoadBilling() {
        if (scBillingLoaded) return;

        const list = scEl('bl-periods-list');
        if (list) {
            list.innerHTML = '<div class="sc-loading" style="min-height:120px"><div class="spinner large"></div></div>';
        }

        try {
            const res = await fetchManager.getBilling();
            if (!res.ok || !res.result || !res.result.data) {
                if (list) {
                    list.innerHTML = '<p class="bl-error">Não foi possível carregar suas informações de cobrança.</p>';
                }
                return;
            }

            scBillingData   = res.result.data;
            scBillingLoaded = true;

            scRenderBillingPlan(scBillingData);
            scRenderPeriods(scBuildPeriods(scBillingData));
        } catch (err) {
            console.error('[Settings] scLoadBilling error:', err);
            if (list) {
                list.innerHTML = '<p class="bl-error">Erro ao carregar cobrança. Tente novamente.</p>';
            }
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

                if (view === 'cobranca') scLoadBilling();
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
        const assinarPlusBtn   = scEl('sc-btn-assinar-plus');

        if (disconnectBtn)  disconnectBtn.addEventListener('click',  scHandleDisconnect);
        if (cancelPlanBtn)  cancelPlanBtn.addEventListener('click',  scHandleCancelPlan);
        if (assinarPlusBtn) assinarPlusBtn.addEventListener('click', scHandleAssinarPlus);
    });

})();
