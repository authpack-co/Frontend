/**
 * AuthPack Home / Landing (v2) — Interactions
 * Nav scroll state · auth-aware navbar · demo tabs + connecting overlay ·
 * teams personas · FAQ accordion · smooth scroll.
 */
(function () {
    'use strict';

    // ── Nav scrolled state ─────────────────────────────────────────────────────
    var nav = document.querySelector('.nav');
    if (nav) {
        var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 6); };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    // ── Auth-aware navbar (persist mode keeps logged-in users on the page) ──────
    var isDev = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    var serverURL = isDev ? 'http://127.0.0.1:3000' : 'https://api.authpack.co';

    fetch(serverURL + '/api/users/info', { credentials: 'include' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
            if (!data || !data.data) return;
            var navUser = document.querySelector('.nav-user');
            if (navUser) navUser.innerHTML = buildNavUser(data.data);
            document.body.classList.add('user-logged-in');
        })
        .catch(function () { /* stay in visitor state */ });

    function buildNavUser(user) {
        var firstName = (user.name || '').split(' ')[0];
        var isPlus = user.plan === 'plus' || user.subscription_status === 'active';
        var plusBadge = isPlus ? '<span class="nav-plus-badge">Plus</span>' : '';
        var avatarClass = isPlus ? 'nav-avatar plus-avatar' : 'nav-avatar';
        return (
            '<a href="/pages/dashboard/" class="nav-profile">' +
                '<span class="nav-profile-name">' + escHtml(firstName) + '</span>' +
                plusBadge +
                '<img class="' + avatarClass + '" src="' + escHtml(user.picture || '') + '" alt="' + escHtml(user.name || 'User') + '">' +
            '</a>' +
            '<a href="/pages/dashboard/"><button class="btn btn-primary">Entrar</button></a>'
        );
    }

    function escHtml(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Demo: tabs + connecting overlay ─────────────────────────────────────────
    var demo = document.querySelector('#demo');
    if (demo) {
        var setTab = function (tab) {
            demo.querySelectorAll('.demo-toggle').forEach(function (el) {
                el.classList.toggle('on', el.getAttribute('data-tab') === tab);
            });
            demo.querySelectorAll('.ext-tab').forEach(function (el) {
                el.classList.toggle('on', el.getAttribute('data-tab') === tab);
            });
            demo.querySelectorAll('.ext-panel').forEach(function (el) {
                el.classList.toggle('on', el.getAttribute('data-tab') === tab);
            });
        };
        demo.querySelectorAll('[data-tab]').forEach(function (el) {
            el.addEventListener('click', function () { setTab(el.getAttribute('data-tab')); });
        });

        var connecting = demo.querySelector('.connecting');
        var connectingName = demo.querySelector('.connecting-name');
        var connectTimer = null;
        demo.querySelectorAll('.ext-item[data-service]').forEach(function (item) {
            item.addEventListener('click', function () {
                if (!connecting) return;
                if (connectingName) connectingName.textContent = item.getAttribute('data-service');
                connecting.style.display = 'grid';
                clearTimeout(connectTimer);
                connectTimer = setTimeout(function () { connecting.style.display = 'none'; }, 2400);
            });
        });
    }

    // ── Teams: persona switching ────────────────────────────────────────────────
    var personas = [
        {
            title: 'Clientes ativos',
            rows: [
                { name: 'Nova Studio', count: 14, pct: 90 },
                { name: 'Atlas Creative', count: 9, pct: 70 },
                { name: 'Forte & Co.', count: 6, pct: 45 },
                { name: 'Ondacria', count: 4, pct: 30 }
            ]
        },
        {
            title: 'Sessões por time',
            rows: [
                { name: 'Engineering', count: 21, pct: 85 },
                { name: 'Design', count: 14, pct: 65 },
                { name: 'Growth', count: 11, pct: 50 },
                { name: 'Customer Success', count: 7, pct: 35 }
            ]
        },
        {
            title: 'Convites recebidos',
            rows: [
                { name: 'Cliente · Stripe', count: 1, pct: 30 },
                { name: 'Cliente · Notion', count: 1, pct: 30 },
                { name: 'Cliente · Linear', count: 1, pct: 30 },
                { name: 'Cliente · Figma', count: 1, pct: 30 }
            ]
        }
    ];

    var personaCards = document.querySelectorAll('.persona-card');
    var personaVisTitle = document.querySelector('.persona-vis-title');
    var personaRows = document.querySelector('.persona-rows');

    function renderPersona(i) {
        var p = personas[i];
        if (!p || !personaRows) return;
        if (personaVisTitle) personaVisTitle.textContent = p.title;
        personaRows.innerHTML = p.rows.map(function (r) {
            return (
                '<div style="margin-bottom:14px">' +
                    '<div style="display:flex;justify-content:space-between;font-size:13.5px">' +
                        '<span style="font-weight:500">' + escHtml(r.name) + '</span>' +
                        '<span class="mono" style="color:var(--ink-3)">' + r.count + ' sessões</span>' +
                    '</div>' +
                    '<div class="persona-bar"><div style="width:' + r.pct + '%"></div></div>' +
                '</div>'
            );
        }).join('');
        personaCards.forEach(function (c, ci) { c.classList.toggle('active', ci === i); });
    }

    personaCards.forEach(function (card, i) {
        card.addEventListener('click', function () { renderPersona(i); });
    });
    if (personaCards.length) renderPersona(0);

    // ── FAQ accordion ───────────────────────────────────────────────────────────
    document.querySelectorAll('.faq-item').forEach(function (item) {
        item.addEventListener('click', function () {
            var wasOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item').forEach(function (i) { i.classList.remove('open'); });
            if (!wasOpen) item.classList.add('open');
        });
    });

    // ── Smooth scroll for anchor links ──────────────────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var targetId = this.getAttribute('href');
            if (targetId === '#') return;
            var target = document.querySelector(targetId);
            if (!target) return;
            e.preventDefault();
            var navHeight = nav ? nav.offsetHeight : 72;
            var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
            window.scrollTo({ top: top, behavior: 'smooth' });
        });
    });
})();
