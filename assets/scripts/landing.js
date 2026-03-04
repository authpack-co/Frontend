/**
 * AuthPack Landing Page — Interactions
 * Smooth scroll + fade-in on scroll (IntersectionObserver)
 */
(function () {
    'use strict';

    // ============================================
    // Extension flag detection + redirect logic
    // ============================================
    const ATTRIBUTE_NAME = 'data-authpack-active';
    const DASHBOARD_URL = '/pages/dashboard/';
    const MAX_WAIT = 100;

    // Se ?persist=true estiver na URL, nunca redireciona para o dashboard
    const persistMode = new URLSearchParams(window.location.search).get('persist') === 'true';

    function isExtensionPresent() {
        try {
            return document.documentElement.getAttribute(ATTRIBUTE_NAME) === '1';
        } catch (e) {
            return false;
        }
    }

    function onExtensionDetected() {
        if (persistMode) {
            // Mantém na landing, apenas aplica a classe visual
            document.body.classList.add('extension-detected');
        } else {
            // Redireciona para o dashboard
            window.location.replace(DASHBOARD_URL);
        }
    }

    // Verificação imediata
    if (isExtensionPresent()) {
        onExtensionDetected();
    } else {
        // Observa o atributo caso a extensão demore para estampar o flag
        let redirected = false;
        const observer = new MutationObserver(function () {
            if (isExtensionPresent() && !redirected) {
                redirected = true;
                observer.disconnect();
                clearTimeout(timeoutId);
                onExtensionDetected();
            }
        });

        try {
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: [ATTRIBUTE_NAME],
            });
        } catch (e) { /* ignore */ }

        // Timeout: se a extensão não aparecer em MAX_WAIT ms, assume ausente
        const timeoutId = setTimeout(function () {
            observer.disconnect();
            // Extensão ausente — permanece na landing normalmente
        }, MAX_WAIT);
    }

    // ============================================
    // Fade-in on scroll
    // ============================================
    const fadeElements = document.querySelectorAll('.lp-fade-in');

    if ('IntersectionObserver' in window && fadeElements.length) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('lp-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.15,
                rootMargin: '0px 0px -40px 0px',
            }
        );

        fadeElements.forEach((el) => observer.observe(el));
    } else {
        // Fallback: show all elements immediately
        fadeElements.forEach((el) => el.classList.add('lp-visible'));
    }

    // ============================================
    // Smooth scroll for anchor links (fallback)
    // ============================================
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const navHeight = document.querySelector('.lp-navbar')?.offsetHeight || 72;
                const top = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });
})();
