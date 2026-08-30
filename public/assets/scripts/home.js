/**
 * AuthPack — Site público (landing / blog / preços)
 * Navbar ciente de autenticação · accordion do FAQ · scroll suave.
 */
(function () {
    'use strict';

    // ── Navbar: estado logado ──────────────────────────────────────────────────
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
        .catch(function () { /* segue como visitante */ });

    function buildNavUser(user) {
        var firstName = (user.name || '').split(' ')[0];
        var isPlus = (user.plan && user.plan !== 'free') || user.subscription_status === 'active';
        var plusBadge = isPlus ? '<span class="nav-plus-badge">Plus</span>' : '';
        var avatarClass = isPlus ? 'nav-avatar plus-avatar' : 'nav-avatar';
        return (
            '<a href="/collection" class="nav-profile">' +
                '<span class="nav-profile-name">' + escHtml(firstName) + '</span>' +
                plusBadge +
                '<img class="' + avatarClass + '" src="' + escHtml(user.picture || '') + '" alt="' + escHtml(user.name || 'User') + '">' +
            '</a>' +
            '<a href="/collection" class="btn btn-primary">Abrir painel</a>'
        );
    }

    function escHtml(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── FAQ: um item aberto por vez ────────────────────────────────────────────
    var faqItems = Array.prototype.slice.call(document.querySelectorAll('.faq-item'));

    faqItems.forEach(function (item) {
        var trigger = item.querySelector('.faq-q');
        if (!trigger) return;

        trigger.addEventListener('click', function () {
            var willOpen = !item.classList.contains('open');
            faqItems.forEach(function (other) {
                other.classList.remove('open');
                var q = other.querySelector('.faq-q');
                if (q) q.setAttribute('aria-expanded', 'false');
            });
            if (willOpen) {
                item.classList.add('open');
                trigger.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // ── Scroll suave para âncoras internas ─────────────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var targetId = this.getAttribute('href');
            if (targetId === '#') return;
            var target = document.querySelector(targetId);
            if (!target) return;
            e.preventDefault();
            var top = target.getBoundingClientRect().top + window.pageYOffset - 24;
            window.scrollTo({ top: top, behavior: 'smooth' });
        });
    });
})();
