/**
 * AuthPack — Shared Footer & Navbar Auth State
 * Injects the page footer and resolves navbar visitor/logged-in states.
 */
(function () {
    'use strict';

    // ── Footer HTML ──────────────────────────────────────────────────────────
    var FOOTER_HTML =
        '<footer class="ap-footer">' +
            '\u00a9 2026 AuthPack Inc. \u00a0\u00b7\u00a0 ' +
            '<a href="/pages/privacy/">Privacidade</a> \u00a0\u00b7\u00a0 ' +
            '<a href="/pages/terms/">Termos</a> \u00a0\u00b7\u00a0 ' +
            '<a href="mailto:team@authpack.co">Suporte</a>' +
        '</footer>';

    // Inject into #ap-footer placeholder
    var placeholder = document.getElementById('ap-footer');
    if (placeholder) {
        placeholder.innerHTML = FOOTER_HTML;
    }

    // ── Auth state ───────────────────────────────────────────────────────────
    var isDev = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    var serverURL = isDev ? 'http://127.0.0.1:3000' : 'https://api.authpack.co';

    fetch(serverURL + '/api/users/info', { credentials: 'include' })
        .then(function (res) {
            if (!res.ok) return null;
            return res.json();
        })
        .then(function (data) {
            if (!data || !data.data) return;

            // Populate all avatar images on the page
            var avatars = document.querySelectorAll('.nav-avatar');
            avatars.forEach(function (el) {
                if (data.data.picture) el.src = data.data.picture;
            });

            // Toggle navbar states
            document.body.classList.add('user-logged-in');
        })
        .catch(function () { /* stay in visitor state */ });
})();
