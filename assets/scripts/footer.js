/**
 * AuthPack — Shared Footer & Navbar Auth State
 * Injects the footer, resolves visitor/logged-in states, and builds the
 * user profile dropdown in every .nav-user element, exactly matching the
 * dashboard style.
 */
(function () {
    'use strict';

    // ── Footer ───────────────────────────────────────────────────────────────
    var FOOTER_HTML =
        '<footer class="ap-footer">' +
            '\u00a9 2026 AuthPack Inc. \u00a0\u00b7\u00a0 ' +
            '<a href="/pages/legal/privacy/">Privacidade</a> \u00a0\u00b7\u00a0 ' +
            '<a href="/pages/legal/terms/">Termos</a> \u00a0\u00b7\u00a0 ' +
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

            // Replace every .nav-user with the full profile widget
            document.querySelectorAll('.nav-user').forEach(function (navUser) {
                navUser.innerHTML = buildNavUser(user, isPlus);

                // Dropdown toggle
                var wrapper = navUser.querySelector('.nav-profile-wrapper');
                var trigger = navUser.querySelector('.nav-profile');
                var dropdown = navUser.querySelector('.nav-profile-dropdown');
                if (!wrapper || !trigger || !dropdown) return;

                trigger.addEventListener('click', function (e) {
                    e.stopPropagation();
                    dropdown.classList.toggle('open');
                });
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function () {
                document.querySelectorAll('.nav-profile-dropdown.open').forEach(function (d) {
                    d.classList.remove('open');
                });
            });

            document.body.classList.add('user-logged-in');
        })
        .catch(function () { /* stay in visitor state */ });

    // ── Build HTML ───────────────────────────────────────────────────────────
    function buildNavUser(user, isPlus) {
        var firstName = (user.name || '').split(' ')[0];
        var picture = user.picture || '';
        var email = user.email || '';
        var plusBadge = isPlus
            ? '<span class="nav-plus-badge">Plus</span>'
            : '';
        var plusAvatarClass = isPlus ? ' plus-avatar' : '';

        return (
            '<div class="nav-profile-wrapper">' +
                '<div class="nav-profile" role="button" tabindex="0" aria-haspopup="true">' +
                    '<span class="nav-profile-name">' + escHtml(firstName) + '</span>' +
                    '<span class="nav-profile-picture' + plusAvatarClass + '">' +
                        plusBadge +
                        '<img src="' + escHtml(picture) + '" alt="' + escHtml(user.name || 'User') + '">' +
                    '</span>' +
                '</div>' +
                '<div class="nav-profile-dropdown">' +
                    '<div class="nav-dropdown-header">' +
                        '<img class="nav-dropdown-avatar" src="' + escHtml(picture) + '" alt="">' +
                        '<div class="nav-dropdown-user-info">' +
                            '<span class="nav-dropdown-name">' + escHtml(user.name || '') + '</span>' +
                            '<span class="nav-dropdown-email">' + escHtml(email) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="nav-dropdown-divider"></div>' +
                    '<a href="/pages/account/" class="nav-dropdown-item">' +
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                            '<circle cx="12" cy="8" r="4"/>' +
                            '<path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>' +
                        '</svg>' +
                        'Central de contas' +
                    '</a>' +
                '</div>' +
            '</div>' +
            '<a href="/pages/dashboard/">' +
                '<button class="nav-btn-primary">Entrar</button>' +
            '</a>'
        );
    }

    function escHtml(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();
