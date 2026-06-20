/* ============================================================================
   AuthPack — Favicon de serviços (cadeia de fallback global)

   Regra única da aplicação para QUALQUER favicon de serviço:
       1) favicon original (vindo da sessão)
       2) Google S2 favicons (derivado da URL/domínio do serviço)
       3) ícone de fallback local (ou um fallback custom via onFinalError)

   Uso típico (elemento <img>):
       AuthPackFavicon.apply(img, { icon: s.icon, url: s.url });

   Uso com fallback custom (ex.: inicial do nome em vez do PNG):
       AuthPackFavicon.apply(img, {
           icon: s.icon, url: s.url,
           onFinalError: (el) => { el.remove(); av.textContent = 'A'; }
       });

   Uso inline (templates de string), ver AuthPackFavicon.inlineError.
   ============================================================================ */
(function (global) {
    'use strict';

    const FALLBACK_SRC = '/assets/images/fallback-session-icon.png';
    const GOOGLE_SIZE = 64;

    // Deriva o hostname de uma URL/domínio livre. Retorna '' quando não dá.
    function faviconDomain(urlOrDomain) {
        const raw = (urlOrDomain || '').toString().trim();
        if (!raw) return '';
        try {
            const withProto = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
            return new URL(withProto).hostname.replace(/^www\./, '');
        } catch {
            // último recurso: limpa o que parece um domínio
            return raw.replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0];
        }
    }

    // URL do serviço de favicons do Google a partir de uma URL/domínio.
    function googleFaviconUrl(urlOrDomain, size) {
        const domain = faviconDomain(urlOrDomain);
        if (!domain) return '';
        return 'https://www.google.com/s2/favicons?domain=' +
            encodeURIComponent(domain) + '&sz=' + (size || GOOGLE_SIZE);
    }

    /**
     * Liga a cadeia de fallback (original → Google S2 → fallback final) num <img>.
     * Não defina img.src antes de chamar — passe o favicon em opts.icon para
     * garantir que o onerror seja registrado antes do carregamento.
     *
     * @param {HTMLImageElement} img
     * @param {Object}    opts
     * @param {string}   [opts.icon]         favicon original (default: img.src atual)
     * @param {string}   [opts.url]          URL/domínio do serviço (monta o Google S2)
     * @param {number}   [opts.size]         tamanho do favicon do Google (default 64)
     * @param {string}   [opts.fallbackSrc]  src do fallback final (default PNG local)
     * @param {Function} [opts.onFinalError] se definido, chamado (img) no lugar do fallbackSrc
     * @returns {HTMLImageElement} o próprio img
     */
    function applyFaviconFallback(img, opts) {
        opts = opts || {};
        const googleUrl = googleFaviconUrl(opts.url, opts.size);
        const original = opts.icon != null ? opts.icon : (img.getAttribute('src') || '');

        function goFinal() {
            img.onerror = null;
            if (typeof opts.onFinalError === 'function') opts.onFinalError(img);
            else img.src = opts.fallbackSrc || FALLBACK_SRC;
        }

        let triedGoogle = false;
        img.onerror = function () {
            if (!triedGoogle && googleUrl && googleUrl !== img.src) {
                triedGoogle = true;
                img.src = googleUrl;          // 2) tenta o Google
                return;
            }
            goFinal();                        // 3) fallback final
        };

        if (original) {
            img.src = original;               // 1) favicon original
        } else if (googleUrl) {
            triedGoogle = true;
            img.src = googleUrl;              // sem original: pula direto pro Google
        } else {
            goFinal();
        }

        return img;
    }

    /**
     * Handler de erro para favicons criados via template de string.
     * O <img> deve trazer:
     *   - data-fav-google="<url do Google S2>"  (use AuthPackFavicon.googleUrl)
     *   - data-fav-initial="<texto de fallback>" (ex.: inicial do nome)
     * e chamar onerror="AuthPackFavicon.inlineError(this)".
     *
     * Tenta o Google uma vez; depois substitui o conteúdo do pai pela inicial.
     */
    function inlineFaviconError(img) {
        const google = img.getAttribute('data-fav-google');
        if (google) {
            img.removeAttribute('data-fav-google');
            img.src = google;
            return;
        }
        img.onerror = null;
        const initial = img.getAttribute('data-fav-initial') || '';
        if (img.parentNode) img.parentNode.textContent = initial;
    }

    global.AuthPackFavicon = {
        FALLBACK_SRC,
        domain: faviconDomain,
        googleUrl: googleFaviconUrl,
        apply: applyFaviconFallback,
        inlineError: inlineFaviconError,
    };
})(window);
