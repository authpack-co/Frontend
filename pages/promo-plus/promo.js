/* AuthPack — Plus VIP Activation
   Handles: API call, state transitions, confetti burst, ineligibility cases. */

(function () {
    'use strict';

    const card = document.getElementById('promoCard');
    const stateOffer = document.getElementById('stateOffer');
    const stateSuccess = document.getElementById('stateSuccess');
    const cta = document.getElementById('promoCta');
    const errorEl = document.getElementById('promoError');
    const canvas = document.getElementById('confetti');
    const ctx = canvas.getContext('2d');

    const successTitle = document.getElementById('successTitle');
    const successSubtitle = document.getElementById('successSubtitle');
    const expiryEl = document.getElementById('expiryDate');

    const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

    function formatExpiry(input) {
        const d = input ? new Date(input) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        if (isNaN(d.getTime())) return '—';
        return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
    }

    /* -------------------- Confetti engine -------------------- */
    let dpr = Math.max(1, window.devicePixelRatio || 1);
    function sizeCanvas() {
        dpr = Math.max(1, window.devicePixelRatio || 1);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);

    const COLORS = [
        '#60a5fa', '#3b82f6', '#93c5fd',
        '#fbbf24', '#fcd34d', '#16a34a', '#ffffff'
    ];
    const SHAPES = ['rect', 'circle', 'strip'];

    let particles = [];
    let rafId = null;

    function spawnBurst(origin) {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const baseX = origin?.x ?? W / 2;
        const baseY = origin?.y ?? H / 2;

        const cannons = [
            { x: 0, y: H * 0.92, angle: -Math.PI / 3, spread: Math.PI / 5 },
            { x: W, y: H * 0.92, angle: -2 * Math.PI / 3, spread: Math.PI / 5 },
            { x: baseX, y: baseY, angle: -Math.PI / 2, spread: Math.PI / 1.4 }
        ];

        cannons.forEach((c, i) => {
            const count = i === 2 ? 120 : 70;
            const power = i === 2 ? 9 : 16;
            for (let k = 0; k < count; k++) {
                const ang = c.angle + (Math.random() - 0.5) * c.spread;
                const v = power * (0.55 + Math.random() * 0.7);
                particles.push({
                    x: c.x,
                    y: c.y,
                    vx: Math.cos(ang) * v,
                    vy: Math.sin(ang) * v - (i === 2 ? 2 : 0),
                    g: 0.22 + Math.random() * 0.08,
                    drag: 0.992,
                    rot: Math.random() * Math.PI * 2,
                    vRot: (Math.random() - 0.5) * 0.32,
                    size: 6 + Math.random() * 7,
                    color: COLORS[(Math.random() * COLORS.length) | 0],
                    shape: SHAPES[(Math.random() * SHAPES.length) | 0],
                    life: 0,
                    maxLife: 180 + Math.random() * 80,
                    wobble: Math.random() * Math.PI * 2,
                    wobbleSpeed: 0.05 + Math.random() * 0.05
                });
            }
        });

        if (!rafId) loop();
    }

    function loop() {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life++;
            p.vy += p.g;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.wobble += p.wobbleSpeed;
            p.x += p.vx + Math.sin(p.wobble) * 0.6;
            p.y += p.vy;
            p.rot += p.vRot;

            const fadeStart = p.maxLife * 0.7;
            const alpha = p.life > fadeStart
                ? Math.max(0, 1 - (p.life - fadeStart) / (p.maxLife - fadeStart))
                : 1;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;

            if (p.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.shape === 'strip') {
                ctx.fillRect(-p.size * 0.7, -p.size * 0.15, p.size * 1.4, p.size * 0.3);
            } else {
                ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size * 0.6);
            }
            ctx.restore();

            if (p.life >= p.maxLife || p.y > window.innerHeight + 60) {
                particles.splice(i, 1);
            }
        }

        if (particles.length > 0) {
            rafId = requestAnimationFrame(loop);
        } else {
            rafId = null;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
    }

    /* -------------------- State transition -------------------- */
    function switchState(from, to) {
        from.classList.remove('is-active');
        to.classList.add('is-active', 'entering');
        setTimeout(() => to.classList.remove('entering'), 600);
    }

    function celebrate(origin) {
        spawnBurst(origin || null);
        setTimeout(() => spawnBurst(null), 350);
        setTimeout(() => spawnBurst(null), 800);
    }

    function renderSuccess({ expires_at, alreadyActive }) {
        if (alreadyActive) {
            successTitle.textContent = 'Você já é AuthPack Plus';
            successSubtitle.textContent = 'Sua assinatura Plus está ativa. Aproveite todos os recursos.';
        } else {
            successTitle.textContent = 'Parabéns! Sua conta agora é Plus';
            successSubtitle.textContent = 'Seu acesso Plus gratuito foi ativado com sucesso e permanecerá disponível pelos próximos 30 dias.';
        }
        expiryEl.textContent = formatExpiry(expires_at);
    }

    function showError(message) {
        errorEl.textContent = message;
        errorEl.hidden = false;
    }

    /* -------------------- Activation flow -------------------- */
    async function activate() {
        if (cta.classList.contains('is-loading')) return;
        errorEl.hidden = true;
        cta.classList.add('is-loading');

        const response = await fetchManager.redeemPlusTrial();

        // Need a believable beat before flipping
        const minDelay = new Promise(r => setTimeout(r, 600));
        await minDelay;

        if (response.ok && response.result?.data) {
            const ctaRect = cta.getBoundingClientRect();

            card.classList.add('is-flipping');
            setTimeout(() => {
                card.classList.remove('is-flipping');
                renderSuccess({ expires_at: response.result.data.plan_expires_at });
                switchState(stateOffer, stateSuccess);
                celebrate({
                    x: ctaRect.left + ctaRect.width / 2,
                    y: ctaRect.top + ctaRect.height / 2
                });
            }, 420);
            return;
        }

        cta.classList.remove('is-loading');

        // 409 → user already redeemed or already on Plus.
        // Either way, send them to the success state — they already have Plus.
        if (response.status === 409) {
            const user = window.__APAuthUser;
            renderSuccess({
                expires_at: user?.plan_expires_at,
                alreadyActive: user?.plan === 'plus'
            });
            switchState(stateOffer, stateSuccess);
            return;
        }

        showError(response.result?.errorMessage || 'Não foi possível ativar agora. Tente novamente em instantes.');
    }

    cta.addEventListener('click', activate);

    /* -------------------- Initial state from auth payload -------------------- */
    // Auth guard in <head> stored the user payload on window.__APAuthUser.
    // If they're already Plus or already redeemed, skip the offer and show success.
    (function bootstrap() {
        const user = window.__APAuthUser;
        if (!user) return;

        const alreadyPlus = user.plan === 'plus';
        const alreadyRedeemed = !!user.plus_trial_redeemed_at;

        if (alreadyPlus || alreadyRedeemed) {
            renderSuccess({
                expires_at: user.plan_expires_at,
                alreadyActive: alreadyPlus
            });
            stateOffer.classList.remove('is-active');
            stateSuccess.classList.add('is-active');
        }
    })();
})();
