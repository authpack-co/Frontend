/**
 * Cor do serviço, vinda de session.darkPalette (dado da própria sessão, como
 * url e name). É ela que pinta o badge de "acima do costume" e a bolha do
 * ícone nos cards de acesso.
 */

// Accent do tema — só quando a sessão não traz cor.
const NEUTRAL_RGB = [96, 165, 250];

const clamp255 = (value) => Math.max(0, Math.min(255, Math.round(Number(value) || 0)));

/**
 * A API entrega "[12,116,44]"; array e hex são aceitos por precaução, porque
 * o campo já circulou nos três formatos.
 */
export function parseDarkPalette(darkPalette) {
    if (Array.isArray(darkPalette)) {
        const numbers = darkPalette.map(Number).filter(Number.isFinite);
        return numbers.length >= 3 ? numbers.slice(0, 3).map(clamp255) : null;
    }

    if (typeof darkPalette === 'string') {
        const value = darkPalette.trim();
        if (!value) return null;

        if (value[0] === '#') {
            let hex = value.slice(1);
            if (hex.length === 3) hex = hex.split('').map((char) => char + char).join('');
            const number = parseInt(hex, 16);
            if (hex.length === 6 && !Number.isNaN(number)) {
                return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
            }
            return null;
        }

        const numbers = (value.match(/\d+/g) || []).map(Number);
        return numbers.length >= 3 ? numbers.slice(0, 3).map(clamp255) : null;
    }

    return null;
}

// Tom mais escuro da mesma cor: a API entrega uma cor só, e o gradiente
// precisa de duas pontas.
const darken = (rgb, factor) => rgb.map((value) => clamp255(value * factor));

export function paletteFromSession(session) {
    const rgb = parseDarkPalette(session?.darkPalette) || NEUTRAL_RGB;
    const darker = darken(rgb, 0.55);

    return {
        rgb,
        c1: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
        c2: `rgb(${darker[0]},${darker[1]},${darker[2]})`,
        glow: (alpha) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`,
    };
}
