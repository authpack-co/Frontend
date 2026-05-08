/**
 * AuthPack Theme Manager
 * 
 * Controls theme switching between 'light' (default) and 'dark'.
 * Theme preference is persisted in localStorage.
 * 
 * Usage:
 *   import { setTheme, toggleTheme, getTheme } from './themeManager.js';
 *   // or simply include as <script src="themeManager.js"></script>
 *   // and use window.AuthPackTheme.toggle(), etc.
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'authpack-theme';
    const THEMES = ['light', 'dark'];
    const DEFAULT_THEME = 'light';

    /**
     * Get the saved theme or fallback to default.
     */
    function getTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && THEMES.includes(saved)) return saved;
        } catch (e) { /* localStorage not available */ }
        return DEFAULT_THEME;
    }

    /**
     * Apply a theme to the document.
     * @param {'light'|'dark'} theme
     */
    function setTheme(theme) {
        if (!THEMES.includes(theme)) theme = DEFAULT_THEME;

        const root = document.documentElement;

        if (theme === 'light') {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', theme);
        }

        // Persist
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) { /* ignore */ }

        // Update any toggle buttons
        updateToggles(theme);
    }

    /**
     * Toggle between light and dark.
     */
    function toggleTheme() {
        const current = getTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
        return next;
    }

    /**
     * Update all theme toggle elements in the page.
     */
    function updateToggles(theme) {
        const toggles = document.querySelectorAll('[data-theme-toggle]');
        toggles.forEach(function (el) {
            const sunIcon = el.querySelector('.theme-icon-light');
            const moonIcon = el.querySelector('.theme-icon-dark');
            const label = el.querySelector('.theme-toggle-label');

            if (sunIcon && moonIcon) {
                if (theme === 'dark') {
                    sunIcon.style.display = 'none';
                    moonIcon.style.display = '';
                } else {
                    sunIcon.style.display = '';
                    moonIcon.style.display = 'none';
                }
            }

            if (label) {
                label.textContent = theme === 'dark' ? 'Tema escuro' : 'Tema claro';
            }
        });
    }

    // ── Initialize on load ──
    // Apply theme immediately (this script should run early)
    const initialTheme = getTheme();
    setTheme(initialTheme);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            updateToggles(getTheme());
        });
    } else {
        updateToggles(getTheme());
    }

    // ── Public API ──
    window.AuthPackTheme = {
        get: getTheme,
        set: setTheme,
        toggle: toggleTheme
    };
})();
