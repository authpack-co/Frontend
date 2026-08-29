import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const PUBLIC_DIR = 'public';

// Paths que pertencem ao app React. Tudo que não casa aqui continua sendo
// arquivo estático de public/ (landing, blog, legal, pricing, login e o
// dashboard antigo, enquanto ele não for migrado).
export const APP_ROUTE_PREFIXES = ['collection', 'shared', 'settings', 'upgrade', 'admin'];

const isAppRoute = (pathname) =>
    APP_ROUTE_PREFIXES.some((p) => pathname === `/${p}` || pathname.startsWith(`/${p}/`));

/**
 * Faz o dev server se comportar como o site em produção.
 *
 * São duas coisas que o Vite não entrega sozinho neste layout híbrido:
 *
 * 1. O fallback de SPA dele só sabe apontar para /index.html — e aqui o
 *    /index.html é a landing estática. O shell do app mora em /app.html, então
 *    reproduzimos à mão o mesmo rewrite que o vercel.json aplica em produção.
 *    Sem isso, dar F5 em /collection/x serviria a landing.
 *
 * 2. Em appType 'mpa' o Vite não resolve "/" nem "/blog/" para o index.html
 *    correspondente dentro de public/. Em produção o host resolve; aqui não.
 */
function hybridSiteRouting() {
    return {
        name: 'authpack-hybrid-site-routing',
        configureServer(server) {
            const publicRoot = path.resolve(server.config.root, PUBLIC_DIR);

            server.middlewares.use((req, _res, next) => {
                const [pathname, query = ''] = (req.url || '/').split('?');
                const suffix = query ? `?${query}` : '';

                if (isAppRoute(pathname)) {
                    req.url = `/app.html${suffix}`;
                    return next();
                }

                if (pathname.endsWith('/')) {
                    const candidate = path.join(publicRoot, pathname, 'index.html');
                    if (candidate.startsWith(publicRoot) && fs.existsSync(candidate)) {
                        req.url = `${pathname}index.html${suffix}`;
                    }
                }

                next();
            });
        },
    };
}

export default defineConfig({
    // 'mpa' porque a raiz do site não é o app: index.html é a landing estática.
    appType: 'mpa',
    server: { port: 5173, strictPort: true },
    publicDir: PUBLIC_DIR,
    plugins: [react(), hybridSiteRouting()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // Fora de assets/ para não se misturar com o assets/ do site legado,
        // que vem de public/ e é copiado verbatim.
        assetsDir: 'app-assets',
        rollupOptions: { input: { app: 'app.html' } },
    },
});
