/* ============================================================================
   AuthPack — Package Invite (ativação por convite)
   ============================================================================ */

(function () {
    'use strict';

    const stateLoading = document.getElementById('state-loading');
    const stateError = document.getElementById('state-error');
    const stateInvite = document.getElementById('state-invite');
    const stateSuccess = document.getElementById('state-success');

    function show(el) {
        [stateLoading, stateError, stateInvite, stateSuccess].forEach(s => s.classList.add('hidden'));
        el.classList.remove('hidden');
        // re-trigger CSS animations by reflowing
        // eslint-disable-next-line no-unused-expressions
        void el.offsetWidth;
    }

    function getInviteKey() {
        const params = new URLSearchParams(window.location.search);
        return (params.get('key') || '').trim();
    }

    function faviconUrl(domain) {
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }

    function renderStack(sessions) {
        const stack = document.getElementById('stack-preview');
        stack.innerHTML = '';
        if (!sessions || sessions.length === 0) return;
        const preview = sessions.slice(0, 5);
        preview.forEach(s => {
            const av = document.createElement('span');
            av.className = 'inv-stack-av';
            const img = document.createElement('img');
            img.alt = s.name || '';
            img.src = s.icon || '/assets/images/fallback-session-icon.png';
            img.onerror = function () {
                this.style.display = 'none';
                av.textContent = (s.name || '?').charAt(0).toUpperCase();
            };
            av.appendChild(img);
            stack.appendChild(av);
        });
        const remaining = sessions.length - preview.length;
        if (remaining > 0) {
            const more = document.createElement('span');
            more.className = 'inv-stack-more';
            more.textContent = `+${remaining} ${remaining === 1 ? 'serviço' : 'serviços'}`;
            stack.appendChild(more);
        } else if (sessions.length > 0) {
            const more = document.createElement('span');
            more.className = 'inv-stack-more';
            more.textContent = `${sessions.length} ${sessions.length === 1 ? 'serviço' : 'serviços'}`;
            stack.appendChild(more);
        }
    }

    function initials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    function renderOwner(owner) {
        const avatar = document.getElementById('owner-avatar');
        const nameEl = document.getElementById('owner-name');
        nameEl.textContent = owner.name || 'Alguém';
        avatar.textContent = '';
        if (owner.picture) {
            const img = document.createElement('img');
            img.src = owner.picture;
            img.alt = owner.name || '';
            img.onerror = function () {
                this.remove();
                avatar.textContent = initials(owner.name);
            };
            avatar.appendChild(img);
        } else {
            avatar.textContent = initials(owner.name);
        }
    }

    function renderTierPill(tier) {
        const label = document.getElementById('tier-pill-label');
        if (tier === 'plus') {
            label.textContent = 'AuthPack Plus · acesso premium';
        } else {
            label.textContent = 'Acesso de cortesia · grátis';
        }
    }

    function showError(message) {
        if (message) {
            document.getElementById('error-desc').textContent = message;
        }
        show(stateError);
    }

    /* ── Confetti burst ─────────────────────────────────────────────────── */
    function fireConfetti() {
        const canvas = document.getElementById('inv-confetti');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const W = window.innerWidth, H = window.innerHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.scale(dpr, dpr);

        const accent = getComputedStyle(document.documentElement).getPropertyValue('--inv-accent').trim() || '#60a5fa';
        const success = getComputedStyle(document.documentElement).getPropertyValue('--ap-success').trim() || '#16a34a';
        const colors = [accent, success, '#fbbf24', '#ffffff', '#f472b6'];

        const N = 150;
        const parts = [];
        const originX = W / 2, originY = H * 0.36;
        for (let i = 0; i < N; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 9;
            parts.push({
                x: originX, y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4,
                size: 5 + Math.random() * 6,
                rot: Math.random() * Math.PI,
                vrot: (Math.random() - 0.5) * 0.4,
                color: colors[(Math.random() * colors.length) | 0],
                shape: Math.random() > 0.5 ? 'rect' : 'circle',
                life: 1,
            });
        }
        let raf;
        const gravity = 0.22, drag = 0.992;
        function frame() {
            ctx.clearRect(0, 0, W, H);
            let alive = false;
            for (const p of parts) {
                p.vy += gravity; p.vx *= drag; p.vy *= drag;
                p.x += p.vx; p.y += p.vy; p.rot += p.vrot;
                if (p.y > H * 0.62) p.life -= 0.02;
                if (p.life <= 0) continue;
                alive = true;
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.life);
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
                ctx.restore();
            }
            if (alive) raf = requestAnimationFrame(frame);
            else ctx.clearRect(0, 0, W, H);
        }
        cancelAnimationFrame(raf);
        frame();
    }

    /* ── Flow ───────────────────────────────────────────────────────────── */
    async function loadPreview(key) {
        const res = await fetchManager.getInvitePreview(key);
        if (!res.ok) {
            const msg = res.result && res.result.errorMessage
                ? res.result.errorMessage
                : 'Não foi possível carregar este convite.';
            return showError(msg);
        }
        const { package: pkg, owner } = res.result.data;
        document.getElementById('package-name').textContent = pkg.name;
        renderStack(pkg.sessions);
        renderOwner(owner);
        renderTierPill(pkg.tier);
        show(stateInvite);
    }

    async function activate(key) {
        const btn = document.getElementById('activate-btn');
        const spinner = document.getElementById('activate-spinner');
        const label = document.getElementById('activate-label');

        btn.classList.add('loading');
        btn.disabled = true;
        spinner.hidden = false;

        // 1. Check auth first to redirect to login (with return URL).
        const auth = await fetchManager.getAuthenticatedUser();
        if (!auth.ok) {
            const here = window.location.pathname + window.location.search;
            window.location.href = `/pages/login/?redirect=${encodeURIComponent(here)}`;
            return;
        }

        // 2. Accept.
        const res = await fetchManager.acceptInvite(key);
        btn.classList.remove('loading');
        btn.disabled = false;
        spinner.hidden = true;

        if (!res.ok) {
            const msg = res.result && res.result.errorMessage
                ? res.result.errorMessage
                : 'Não foi possível ativar este pacote.';
            return showError(msg);
        }

        const data = res.result.data;
        const pkgName = data.package && data.package.name ? data.package.name : 'Pacote';
        const pkgId = data.package && data.package.id;

        // Success state + redirect.
        document.getElementById('success-pkg-name').textContent = pkgName;
        show(stateSuccess);
        requestAnimationFrame(fireConfetti);

        setTimeout(() => {
            const qs = pkgId ? `?newProduct=${encodeURIComponent(pkgId)}` : '';
            window.location.href = `/pages/dashboard/${qs}`;
        }, 1800);
    }

    /* ── Boot ───────────────────────────────────────────────────────────── */
    const key = getInviteKey();
    if (!key) {
        showError('Link de convite ausente ou inválido.');
        return;
    }

    document.getElementById('activate-btn').addEventListener('click', () => activate(key));

    loadPreview(key);
})();
