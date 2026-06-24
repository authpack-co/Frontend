/* ============================================================================
   AuthPack Admin — core
   Shared helpers (API, formatting, nav, drawer, toast) exposed on window.AP.
   Section files (financial/users/sellers/admins) register a view via
   AP.registerView(name, { onShow }) and are lazily initialized on first open.
   ============================================================================ */
window.AP = (function () {
    'use strict';

    const isDev = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const serverURL = isDev ? 'http://127.0.0.1:3000' : 'https://api.authpack.co';

    // ── API ──────────────────────────────────────────────
    async function api(path, opts = {}) {
        try {
            const res = await fetch(serverURL + path, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                ...opts,
            });
            let json = null;
            try { json = await res.json(); } catch (e) { /* no body */ }
            return {
                ok: res.ok,
                status: res.status,
                data: json ? json.data : null,
                errorMessage: json ? json.errorMessage : 'Erro inesperado',
                details: json ? json.details : null,
            };
        } catch (e) {
            return { ok: false, status: 0, data: null, errorMessage: 'Falha de conexão' };
        }
    }
    const get = (path) => api('/api/admin' + path);
    const send = (path, method, body) => api('/api/admin' + path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
    });

    // ── Formatting ───────────────────────────────────────
    const fmtBRL = (cents) => ((Number(cents) || 0) / 100)
        .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    function fmtDate(s) {
        if (!s) return '—';
        const d = new Date(s);
        if (isNaN(d)) return '—';
        return d.toLocaleDateString('pt-BR');
    }
    function fmtDateTime(s) {
        if (!s) return '—';
        const d = new Date(s);
        if (isNaN(d)) return '—';
        return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }
    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ── Badges ───────────────────────────────────────────
    function roleBadge(role) {
        const map = { user: ['badge-user', 'Usuário'], seller: ['badge-seller', 'Vendedor'], admin: ['badge-admin', 'Admin'] };
        const [cls, label] = map[role] || map.user;
        return `<span class="admin-badge ${cls}">${label}</span>`;
    }
    function statusBadge(status) {
        return status === 'suspended'
            ? '<span class="admin-badge badge-suspended">Suspenso</span>'
            : '<span class="admin-badge badge-active">Ativo</span>';
    }
    function avatar(picture, name) {
        const initial = escapeHtml((name || '?').trim().charAt(0).toUpperCase());
        return picture
            ? `<img class="admin-avatar" src="${escapeHtml(picture)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'admin-avatar',style:'display:grid;place-items:center;font-weight:600;font-size:.8rem',textContent:'${initial}'}))">`
            : `<div class="admin-avatar" style="display:grid;place-items:center;font-weight:600;font-size:.8rem">${initial}</div>`;
    }

    // ── State helpers ────────────────────────────────────
    const loadingHTML = '<div class="admin-loading"><div class="admin-spinner"></div>Carregando…</div>';
    const emptyHTML = (msg) => `<div class="admin-empty">${escapeHtml(msg || 'Nada por aqui ainda.')}</div>`;
    const errorHTML = (msg) => `<div class="admin-empty admin-error">${escapeHtml(msg || 'Erro ao carregar.')}</div>`;

    // ── Toast ────────────────────────────────────────────
    let toastTimer = null;
    function toast(msg, type = 'info') {
        let t = document.getElementById('ap-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'ap-toast';
            t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:200;padding:12px 18px;border-radius:10px;font-size:.88rem;font-weight:600;box-shadow:var(--ap-shadow-lg);max-width:90vw;transition:opacity .2s';
            document.body.appendChild(t);
        }
        const colors = {
            info: ['var(--ap-bg-card)', 'var(--ap-text-primary)'],
            success: ['var(--ap-success-light)', 'var(--ap-success-text)'],
            error: ['var(--ap-danger-light)', 'var(--ap-danger-text)'],
        };
        const [bg, fg] = colors[type] || colors.info;
        t.style.background = bg; t.style.color = fg; t.style.border = '1px solid var(--ap-border)';
        t.textContent = msg;
        t.style.opacity = '1';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 3200);
    }

    // ── Drawer ───────────────────────────────────────────
    const drawer = document.getElementById('admin-drawer');
    const drawerBody = document.getElementById('admin-drawer-body');
    function openDrawer(html) { drawerBody.innerHTML = html; drawer.classList.add('open'); }
    function setDrawer(html) { drawerBody.innerHTML = html; }
    function closeDrawer() { drawer.classList.remove('open'); }
    document.getElementById('admin-drawer-close').addEventListener('click', closeDrawer);
    drawer.addEventListener('click', (e) => { if (e.target === drawer) closeDrawer(); });

    // ── View registry & navigation ───────────────────────
    const views = {};
    function registerView(name, handlers) { views[name] = handlers; }

    let currentView = null;
    function showView(name) {
        if (!views[name] && name !== 'leads' && name !== 'financeiro') { /* allow built-ins */ }
        document.querySelectorAll('.admin-nav-item[data-view]').forEach((b) => {
            b.classList.toggle('active', b.dataset.view === name);
        });
        document.querySelectorAll('.admin-view[data-view]').forEach((s) => {
            s.classList.toggle('active', s.dataset.view === name);
        });
        currentView = name;
        if (views[name] && typeof views[name].onShow === 'function') {
            views[name].onShow();
        }
        // Close mobile nav after navigating.
        document.querySelector('.admin-shell').classList.remove('nav-open');
        try { history.replaceState(null, '', '#' + name); } catch (e) { }
    }
    function refreshCurrent() { if (currentView) showView(currentView); }

    function initNav() {
        document.querySelectorAll('.admin-nav-item[data-view]').forEach((btn) => {
            if (btn.disabled) return;
            btn.addEventListener('click', () => showView(btn.dataset.view));
        });

        // Mobile drawer toggle.
        const shell = document.querySelector('.admin-shell');
        document.getElementById('admin-burger')?.addEventListener('click', () => shell.classList.toggle('nav-open'));
        document.getElementById('admin-overlay')?.addEventListener('click', () => shell.classList.remove('nav-open'));

        // Logout.
        document.getElementById('admin-logout')?.addEventListener('click', async () => {
            await api('/api/auth/logout', { method: 'POST' });
            window.location.replace('/pages/login/');
        });

        const initial = (location.hash || '').replace('#', '');
        const valid = ['financeiro', 'usuarios', 'vendedores', 'administradores'];
        showView(valid.includes(initial) ? initial : 'financeiro');
    }

    document.addEventListener('DOMContentLoaded', initNav);

    return {
        serverURL, get, send,
        fmtBRL, fmtDate, fmtDateTime, escapeHtml,
        roleBadge, statusBadge, avatar,
        loadingHTML, emptyHTML, errorHTML,
        toast, openDrawer, setDrawer, closeDrawer,
        registerView, refreshCurrent,
    };
})();
