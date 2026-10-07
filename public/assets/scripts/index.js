/**
 * Niango — Landing (public/index.html)
 * Menu do celular · FAQ · texto digitado · revelar ao rolar · favicons ·
 * navbar ciente de login. A escala da cena do hero fica num script inline
 * logo depois dela, para valer já no primeiro paint.
 */
(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Menu do celular ────────────────────────────────────────────────────────
    var header = document.getElementById('site-header');
    var toggle = header && header.querySelector('.nav__toggle');

    function setMenu(open) {
        header.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    }

    if (toggle) {
        toggle.addEventListener('click', function () {
            setMenu(!header.classList.contains('is-open'));
        });
        header.querySelectorAll('.mobile-menu a').forEach(function (link) {
            link.addEventListener('click', function () { setMenu(false); });
        });
    }

    // ── FAQ: um item aberto por vez ────────────────────────────────────────────
    var faqButtons = Array.prototype.slice.call(document.querySelectorAll('.faq__q'));

    faqButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            var willOpen = button.getAttribute('aria-expanded') !== 'true';
            faqButtons.forEach(function (other) {
                var open = other === button && willOpen;
                other.setAttribute('aria-expanded', String(open));
                document.getElementById(other.getAttribute('aria-controls')).hidden = !open;
            });
        });
    });

    // ── Texto digitado na caixa "Compartilhar acesso" ──────────────────────────
    var PHRASES = [
        'Liberar o Notion para bia@suaempresa.com',
        'Liberar o Canva para o time de marketing',
        'Revogar o acesso do Rafa ao ChatGPT'
    ];
    var typed = document.getElementById('typed');

    if (typed && !reduceMotion) {
        var phrase = 0;
        var length = PHRASES[0].length;
        var deleting = true;

        var tick = function () {
            var current = PHRASES[phrase];
            if (deleting) {
                length--;
                if (length <= 0) {
                    deleting = false;
                    phrase = (phrase + 1) % PHRASES.length;
                }
            } else {
                length++;
                if (length >= PHRASES[phrase].length) {
                    deleting = true;
                    typed.textContent = PHRASES[phrase];
                    setTimeout(tick, 2200);
                    return;
                }
            }
            typed.textContent = (deleting ? current : PHRASES[phrase]).slice(0, Math.max(length, 0));
            setTimeout(tick, deleting ? 28 : 55);
        };

        setTimeout(tick, 2400);
    }

    // ── Revelar ao rolar (ver .reveal no index.css) ────────────────────────────
    if (root.classList.contains('reveal')) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px' });

        document.querySelectorAll('[data-reveal]').forEach(function (el) {
            observer.observe(el);
        });
        root.classList.add('reveal-ready');
    }

    // ── Favicons das ferramentas: Google S2 → ícone local ──────────────────────
    if (window.NiangoFavicon) {
        document.querySelectorAll('img[data-fav]').forEach(function (img) {
            window.NiangoFavicon.apply(img, { icon: '', url: img.getAttribute('data-fav') });
        });
    }

    // ── Redes sociais ainda sem perfil: o link fica, mas não pula pro topo ─────
    document.querySelectorAll('a[href="#"]').forEach(function (link) {
        link.addEventListener('click', function (e) { e.preventDefault(); });
    });

    // ── Navbar: estado logado ──────────────────────────────────────────────────
    // Quem está logado só vê a landing com ?persist=true (o guard do <head>
    // manda o resto para o painel). Nesse caso "Entrar" vira "Abrir painel".
    var isDev = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    var serverURL = isDev ? 'http://127.0.0.1:3000' : 'https://api.niango.io';

    fetch(serverURL + '/api/users/info', { credentials: 'include' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
            if (!data || !data.data) return;
            document.querySelectorAll('[data-signed-out]').forEach(function (el) { el.hidden = true; });
            document.querySelectorAll('[data-panel-link]').forEach(function (el) {
                el.href = '/collection';
                el.textContent = 'Abrir painel';
            });
        })
        .catch(function () { /* segue como visitante */ });
})();
