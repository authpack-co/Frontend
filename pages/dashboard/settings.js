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

    // Fallback price for the AuthPack Plus plan (R$ 39,90/mês), used when there
    // are no invoices yet to read the real amount from.
    const PLUS_PRICE_CENTS = 3990;

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

        // Apenas papéis com benefício ilimitado (admin) não assinam.
        const PLUS_BENEFIT_ROLES = ['admin'];
        if (PLUS_BENEFIT_ROLES.includes(role)) {
            scShow(elRole);
            const lbl = scEl('sc-plan-role-label');
            if (lbl) lbl.textContent = 'Administrador';
            return;
        }

        const isPaid = !!plan && plan !== 'free';
        if (isPaid && planStatus === 'canceled') {
            scShow(elCanceled);
            const untilEl = scEl('sc-plan-canceled-until');
            if (untilEl && expiresAt) {
                untilEl.textContent = `Você continua no plano até: ${scFormatDate(expiresAt)}`;
            }

        } else if (isPaid && planStatus === 'active') {
            scShow(elPlus);
            const renewEl = scEl('sc-plan-renews-at');
            if (renewEl && expiresAt) {
                renewEl.textContent = `Renova em: ${scFormatDate(expiresAt)}`;
            }

        } else {
            scShow(elFree);
        }
    }


    // ─── Extensão neste navegador ─────────────────────────────────────────────────

    // Não há mais o que sincronizar: a extensão usa o mesmo cookie de sessão do site.
    // A única pergunta que sobra é se ela está instalada neste navegador.
    function scRenderSyncRow(result) {
        const row    = scEl('sc-sync');
        const title  = scEl('sc-sync-title');
        const status = scEl('sc-sync-status');
        if (!row || !title || !status) return;

        const state = !result ? 'checking'
            : result.status === extensionState.STATUS.READY ? 'synced'
            : 'missing';

        row.dataset.state = state;

        switch (state) {
            case 'synced':
                title.textContent  = 'Extensão instalada';
                status.textContent = 'Este navegador pode abrir as sessões da sua conta.';
                break;
            case 'missing':
                title.textContent  = 'Extensão não instalada';
                status.textContent = 'Instale a extensão do AuthPack para conectar às suas sessões.';
                break;
            default:
                title.textContent  = 'Verificando extensão…';
                status.textContent = 'Conferindo se ela está instalada neste navegador.';
        }
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

            // Memoizado: se o dashboard já verificou, isto não custa nada.
            scRenderSyncRow(extensionState.getLastResult());
            extensionState.check().then(scRenderSyncRow);

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

    // ─── Action: Portal de cobrança da Stripe ────────────────────────────────────
    // Trocar cartão, baixar faturas e cancelar acontecem no portal hospedado —
    // nenhum dado de pagamento passa por aqui.

    async function scHandleBillingPortal() {
        const btn = scEl('bl-btn-portal');
        if (!btn) return;

        btn.disabled    = true;
        const original  = btn.textContent;
        btn.textContent = 'Abrindo...';

        try {
            const res = await fetchManager.createBillingPortal();
            const url = res.ok && res.result?.url;
            if (!url) {
                alert('Não foi possível abrir o portal de cobrança. Tente novamente.');
                btn.disabled    = false;
                btn.textContent = original;
                return;
            }
            window.location.href = url;
        } catch (err) {
            console.error('[Settings] billingPortal error:', err);
            btn.disabled    = false;
            btn.textContent = original;
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
        const portalEl = scEl('bl-btn-portal');

        if (portalEl) scHide(portalEl);

        // Admin: benefícios inclusos pelo papel — sem cobrança.
        const role = scUserData && scUserData.role;
        if (role === 'admin') {
            if (nameEl)  nameEl.textContent = 'Benefícios inclusos';
            scSetStatusBadge(badgeEl, 'Administrador', 'paid');
            if (priceEl) priceEl.textContent = 'Incluso';
            if (renewEl) renewEl.textContent = '';
            if (noteEl) {
                noteEl.textContent = 'Seu papel de administrador já inclui todos os recursos. Nenhuma assinatura é necessária.';
                scShow(noteEl);
            }
            return;
        }

        const plan      = billing.plan;
        const status    = billing.plan_status;
        const sub       = billing.subscription;
        const invoices  = billing.invoices || [];
        const isPaid    = !!plan && plan !== 'free';
        const planLabel = isPaid ? `AuthPack ${plan.charAt(0).toUpperCase()}${plan.slice(1)}` : 'Plano Free';
        // Plano pago sem subscription row = cortesia/trial (sem cobrança).
        const isTrial   = isPaid && !sub;
        // Mensalidade = preço do plano, NUNCA a última fatura: depois de um
        // upgrade a última fatura é a diferença proporcional (ex.: R$ 59,90),
        // que não é o valor recorrente.
        const priceCents = (sub && sub.unit_amount != null)
            ? sub.unit_amount
            : (invoices.length ? invoices[0].amount_paid : PLUS_PRICE_CENTS);
        const currency   = (sub && sub.currency) || (invoices[0] && invoices[0].currency) || 'BRL';

        if (renewEl) renewEl.textContent = '';
        if (noteEl)  scHide(noteEl);

        // O portal só existe para quem tem um customer na Stripe — cortesia e
        // Free não têm nada para gerenciar lá.
        if (portalEl && sub && sub.has_billing_account) scShow(portalEl);

        if (isPaid) {
            if (nameEl) nameEl.textContent = planLabel;

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
            } else if (sub && sub.pending_plan) {
                // Downgrade agendado: o plano maior continua valendo até a data.
                const pendingLabel = `AuthPack ${sub.pending_plan.charAt(0).toUpperCase()}${sub.pending_plan.slice(1)}`;
                scSetStatusBadge(badgeEl, 'Mudança agendada', 'trial');
                if (priceEl) priceEl.textContent = `${scFormatMoney(priceCents, currency)} / mês`;
                if (renewEl && sub.pending_change_at) {
                    renewEl.textContent = `Muda em ${scFormatDate(sub.pending_change_at)}`;
                }
                if (noteEl) {
                    noteEl.textContent = `Seu plano muda para ${pendingLabel} em `
                        + `${scFormatDate(sub.pending_change_at)}. Até lá você continua no ${planLabel} `
                        + `com todos os limites atuais.`;
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
                noteEl.textContent = 'Você está no plano Free. Assine o Plus para compartilhar acesso com muito mais pessoas.';
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

        // Ciclos já pagos (uma fatura por ciclo). Faturas de troca de plano
        // (billing_reason='subscription_update') são ajustes proporcionais, não
        // mensalidades — ficam marcadas para não parecerem um mês normal.
        invoices.forEach((inv) => {
            periods.push({
                status:      'paid',
                periodStart: inv.period_start || inv.paid_at,
                periodEnd:   inv.period_end,
                dueDate:     inv.period_start || inv.paid_at,
                amount:      inv.amount_paid,
                currency:    inv.currency || 'BRL',
                paidAt:      inv.paid_at,
                isAdjustment: inv.billing_reason === 'subscription_update',
            });
        });

        // Próxima cobrança — apenas quando a assinatura está ativa e vai renovar.
        // A cobrança ocorre em current_period_end (fim do ciclo já pago).
        if (billing.plan && billing.plan !== 'free' && sub && sub.status === 'active'
            && !sub.cancel_at_period_end && sub.current_period_end) {
            const dueTime = new Date(sub.current_period_end).getTime();
            periods.push({
                status:      dueTime > Date.now() ? 'open' : 'overdue',
                periodStart: sub.current_period_end,
                periodEnd:   scAddMonthISO(sub.current_period_end),
                dueDate:     sub.current_period_end,
                // Próxima cobrança = mensalidade do plano, não a última fatura.
                amount:      (sub.unit_amount != null)
                    ? sub.unit_amount
                    : (invoices.length ? invoices[0].amount_paid : PLUS_PRICE_CENTS),
                currency:    sub.currency || (invoices[0] && invoices[0].currency) || 'BRL',
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
            if (p.isAdjustment) metaText += ' · ajuste proporcional por troca de plano';
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

    function scGoToView(view) {
        document.querySelectorAll('.settings-nav-item').forEach((item) => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        document.querySelectorAll('.settings-view').forEach((v) => v.classList.remove('active'));
        const target = scEl(`settings-view-${view}`);
        if (target) target.classList.add('active');
        if (view === 'cobranca') scLoadBilling();
    }

    // Abre as configurações já na seção pedida.
    function scOpenAt(view) {
        scOpenModal();
        scGoToView(view || 'conta');
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
            item.addEventListener('click', () => scGoToView(item.dataset.view));
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
        const billingPortalBtn = scEl('bl-btn-portal');

        if (disconnectBtn)     disconnectBtn.addEventListener('click',     scHandleDisconnect);
        if (cancelPlanBtn)     cancelPlanBtn.addEventListener('click',     scHandleCancelPlan);
        if (assinarPlusBtn)    assinarPlusBtn.addEventListener('click',    scHandleAssinarPlus);
        if (billingPortalBtn)  billingPortalBtn.addEventListener('click',  scHandleBillingPortal);

        // A verificação da extensão termina de forma assíncrona; a linha de status
        // segue o resultado mais recente.
        extensionState.onChange(scRenderSyncRow);
    });

    window.settingsModal = { openAt: scOpenAt };

})();
