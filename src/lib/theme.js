import { useCallback, useEffect, useState } from 'react';

/**
 * Tema claro/escuro. Mesma chave e mesma semântica do
 * assets/scripts/themeManager.js — quem alterna no painel antigo e volta para
 * o app encontra o tema que escolheu.
 *
 * O escuro é o padrão, e quem aplica no primeiro paint é o script inline do
 * app.html: aqui só ficam a leitura e a troca.
 */

const STORAGE_KEY = 'niango-theme';
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

/** O tema que está no documento — é ele que decide qual token vale agora. */
function appliedTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/**
 * O tema aplicado, observado no documento.
 *
 * `useTheme` guarda o tema em estado local de quem alterna. Isto aqui é para
 * quem precisa REAGIR à troca sem ser quem a fez — o gráfico, que pinta num
 * canvas com as cores lidas dos tokens uma vez e não se repinta sozinho quando
 * elas mudam. Trocar de tema deixava as linhas escuras sobre fundo claro.
 *
 * Pelo atributo, e não pelo localStorage: o atributo é o que o CSS obedece, e
 * é o que o script de boot do app.html e o painel antigo também escrevem.
 */
export function useAppliedTheme() {
    const [theme, setThemeState] = useState(appliedTheme);

    useEffect(() => {
        const read = () => setThemeState(appliedTheme());
        read();

        const observer = new MutationObserver(read);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });

        return () => observer.disconnect();
    }, []);

    return theme;
}

export function useTheme() {
    const [theme, setThemeState] = useState(getTheme);

    const toggle = useCallback(() => {
        setThemeState((current) => setTheme(current === 'dark' ? 'light' : 'dark'));
    }, []);

    return { theme, toggle };
}
