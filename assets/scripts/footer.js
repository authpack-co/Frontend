/**
 * AuthPack — Shared Footer & Navbar Auth State
 * Injects the footer and resolves visitor/logged-in states.
 */
(function () {
    'use strict';

    // ── Footer ───────────────────────────────────────────────────────────────
    var FOOTER_HTML =
        '<footer class="ap-footer">' +
            '© 2026 AuthPack Inc.  ·  ' +
            '<a href="/pages/legal/privacy/">Privacidade</a>  ·  ' +
            '<a href="/pages/legal/terms/">Termos</a>  ·  ' +
            '<a href="mailto:team@authpack.co">Suporte</a>' +
        '</footer>';

    var placeholder = document.getElementById('ap-footer');
    if (placeholder) placeholder.innerHTML = FOOTER_HTML;

    // ── Auth ─────────────────────────────────────────────────────────────────
    var isDev = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    var serverURL = isDev ? 'http://127.0.0.1:3000' : 'https://api.authpack.co';

    fetch(serverURL + '/api/users/info', { credentials: 'include' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
            if (!data || !data.data) return;
            var user = data.data;
            var isPlus = user.plan === 'plus' || user.subscription_status === 'active';

            document.querySelectorAll('.nav-user').forEach(function (navUser) {
                navUser.innerHTML = buildNavUser(user, isPlus);
            });

            document.body.classList.add('user-logged-in');
        })
        .catch(function () { /* stay in visitor state */ });

    // ── Build HTML ───────────────────────────────────────────────────────────
    function buildNavUser(user, isPlus) {
        var firstName = (user.name || '').split(' ')[0];
        var picture = user.picture || '';
        var plusBadge = isPlus ? '<span class="nav-plus-badge">Plus</span>' : '';
        var plusAvatarClass = isPlus ? ' plus-avatar' : '';

        return (
            '<a href="/pages/dashboard/" class="nav-profile">' +
                '<span class="nav-profile-name">' + escHtml(firstName) + '</span>' +
                '<span class="nav-profile-picture' + plusAvatarClass + '">' +
                    plusBadge +
                    '<img src="' + escHtml(picture) + '" alt="' + escHtml(user.name || 'User') + '">' +
                '</span>' +
            '</a>' +
            '<a href="/pages/dashboard/">' +
                '<button class="nav-btn-primary">Entrar</button>' +
            '</a>'
        );
    }

    function escHtml(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();
