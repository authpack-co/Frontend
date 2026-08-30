import { useCallback, useState } from 'react';

/**
 * Tema claro/escuro. Mesma chave e mesma semântica do
 * assets/scripts/themeManager.js — quem alterna no painel antigo e volta para
 * o app encontra o tema que escolheu.
 *
 * O escuro é o padrão, e quem aplica no primeiro paint é o script inline do
 * app.html: aqui só ficam a leitura e a troca.
 */

const STORAGE_KEY = 'authpack-theme';
const THEMES = ['light', 'dark'];
const DEFAULT_THEME = 'dark';

export function getTheme() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && THEMES.includes(saved)) return saved;
    } catch { /* localStorage indisponível */ }
    return DEFAULT_THEME;
}

export function setTheme(theme) {
    const next = THEMES.includes(theme) ? theme : DEFAULT_THEME;

    if (next === 'light') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', next);

    try {
        localStorage.setItem(STORAGE_KEY, next);
    } catch { /* ignore */ }

    return next;
}

export function useTheme() {
    const [theme, setThemeState] = useState(getTheme);

    const toggle = useCallback(() => {
        setThemeState((current) => setTheme(current === 'dark' ? 'light' : 'dark'));
    }, []);

    return { theme, toggle };
}
