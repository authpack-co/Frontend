import { useEffect, useRef, useState } from 'react';

/**
 * Favicon de um serviço, com a mesma cadeia de fallback do resto da aplicação
 * (assets/scripts/faviconManager.js):
 *
 *   1) o favicon que veio na sessão
 *   2) o serviço de favicons do Google, derivado do domínio
 *   3) o PNG local
 *
 * A classe fav-loading pinta um placeholder enquanto a cadeia roda — favicon
 * lento chega a levar segundos, e sem ela o <img> fica um buraco.
 */

const FALLBACK_SRC = '/assets/images/fallback-session-icon.png';
const GOOGLE_SIZE = 64;

export function faviconDomain(urlOrDomain) {
    const raw = (urlOrDomain || '').toString().trim();
    if (!raw) return '';
    try {
        const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        return new URL(withProtocol).hostname.replace(/^www\./, '');
    } catch {
        return raw.replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0];
    }
}

function googleFaviconUrl(urlOrDomain, size = GOOGLE_SIZE) {
    const domain = faviconDomain(urlOrDomain);
    if (!domain) return '';
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

function firstSource(icon, googleUrl) {
    if (icon) return icon;
    if (googleUrl) return googleUrl;
    return FALLBACK_SRC;
}

export default function ServiceIcon({ icon, url, name = '', className = '', style }) {
    const googleUrl = googleFaviconUrl(url);
    const [src, setSrc] = useState(() => firstSource(icon, googleUrl));
    const [loading, setLoading] = useState(true);
    const triedGoogle = useRef(!icon);
    const imgRef = useRef(null);

    // Trocar de sessão sem trocar de componente (a lista reusa as linhas)
    // precisa reiniciar a cadeia, senão o ícone anterior fica.
    useEffect(() => {
        triedGoogle.current = !icon;
        setSrc(firstSource(icon, googleUrl));
        setLoading(true);
    }, [icon, googleUrl]);

    // Favicon já em cache resolve antes do onLoad ser registrado — sem isto o
    // placeholder ficaria para sempre por cima de uma imagem pronta.
    useEffect(() => {
        const img = imgRef.current;
        if (img && img.complete && img.naturalWidth > 0) setLoading(false);
    });

    function handleError() {
        if (!triedGoogle.current && googleUrl && googleUrl !== src) {
            triedGoogle.current = true;
            setSrc(googleUrl);
            return;
        }
        if (src !== FALLBACK_SRC) setSrc(FALLBACK_SRC);
        else setLoading(false);
    }

    return (
        <img
            ref={imgRef}
            className={`${className}${loading ? ' fav-loading' : ''}`.trim()}
            src={src}
            alt={name}
            style={style}
            onLoad={() => setLoading(false)}
            onError={handleError}
        />
    );
}
