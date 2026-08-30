import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const PUBLIC_DIR = 'public';

// Paths que pertencem ao app React. Tudo que não casa aqui continua sendo
// arquivo estático de public/ — a landing, o blog, e as páginas de conteúdo
// (legal, preços), que existem para serem indexadas.
export const APP_ROUTE_PREFIXES = ['collection', 'shared', 'admin', 'login', 'invite'];

const isAppRoute = (pathname) =>
    APP_ROUTE_PREFIXES.some((p) => pathname === `/${p}` || pathname.startsWith(`/${p}/`));

// Em dev, página e API precisam dividir o host.
//
// O cookie de sessão é SameSite=Lax e nasce em 127.0.0.1 (host do callback do
// Google e da API). Para o navegador, localhost e 127.0.0.1 são hosts
// diferentes: abrir o site em localhost torna toda chamada cross-site, o
// cookie não é anexado, e tudo responde 401 com a sessão válida — sem nenhum
// sinal de que o problema é o endereço. Em vez de documentar a armadilha,
// o dev server tira ela do caminho.
const DEV_HOST = '127.0.0.1';

function forceDevHost() {
    return {
        name: 'niango-force-dev-host',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const host = req.headers.host || '';
                if (!host.startsWith('localhost:')) return next();

                const port = host.split(':')[1];
                res.writeHead(302, { Location: `http://${DEV_HOST}:${port}${req.url}` });
                res.end();
            });
        },
    };
}

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
        name: 'niango-hybrid-site-routing',
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
    server: { host: DEV_HOST, port: 5173, strictPort: true },
    publicDir: PUBLIC_DIR,
    plugins: [react(), forceDevHost(), hybridSiteRouting()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // Fora de assets/ para não se misturar com o assets/ do site legado,
        // que vem de public/ e é copiado verbatim.
        assetsDir: 'app-assets',
        rollupOptions: { input: { app: 'app.html' } },
    },
});
