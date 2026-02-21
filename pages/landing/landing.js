/**
 * AuthPack Landing Page — Interactions
 * Smooth scroll + fade-in on scroll (IntersectionObserver)
 */
(function () {
    'use strict';

    // ============================================
    // Extension flag detection
    // ============================================
    const isExtensionPresent = document.documentElement.hasAttribute('data-authpack-active');
    if (isExtensionPresent) {
        document.body.classList.add('extension-detected');
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
