/**
 * Catálogo de serviços comuns em times internos.
 *
 * `url` é a superfície onde o dono já está naturalmente logado — a captura
 * acontece nessa URL. Quem quiser qualquer outra cola a própria.
 *
 * Os ícones não são mockup: vêm do favicon real de cada domínio.
 */

import { isIpAddress, isLocalHostname } from '../../../lib/hostname.js';

export const CATEGORIES = [
    { id: 'ia', label: 'IA' },
    { id: 'stream', label: 'Streaming' },
    { id: 'work', label: 'Trabalho' },
    { id: 'social', label: 'Social' },
];

export const CATALOG = [
    // IA
    { name: 'ChatGPT', url: 'https://chatgpt.com', cat: 'ia' },
    { name: 'Claude', url: 'https://claude.ai', cat: 'ia' },
    { name: 'Gemini', url: 'https://gemini.google.com', cat: 'ia' },
    { name: 'Perplexity', url: 'https://www.perplexity.ai', cat: 'ia' },
    { name: 'Midjourney', url: 'https://www.midjourney.com', cat: 'ia' },
    // Streaming
    { name: 'Netflix', url: 'https://www.netflix.com', cat: 'stream' },
    { name: 'Spotify', url: 'https://open.spotify.com', cat: 'stream' },
    { name: 'Disney+', url: 'https://www.disneyplus.com', cat: 'stream' },
    { name: 'YouTube', url: 'https://www.youtube.com', cat: 'stream' },
    { name: 'Prime Video', url: 'https://www.primevideo.com', cat: 'stream' },
    // Trabalho
    { name: 'Slack', url: 'https://app.slack.com/client', cat: 'work' },
    { name: 'GitHub', url: 'https://github.com', cat: 'work' },
    { name: 'Notion', url: 'https://www.notion.so', cat: 'work' },
    { name: 'Canva', url: 'https://www.canva.com', cat: 'work' },
    { name: 'Figma', url: 'https://www.figma.com/files', cat: 'work' },
    { name: 'Google', url: 'https://drive.google.com', cat: 'work' },
    { name: 'Trello', url: 'https://trello.com', cat: 'work' },
    { name: 'Linear', url: 'https://linear.app', cat: 'work' },
    { name: 'Jira', url: 'https://www.atlassian.com', cat: 'work' },
    { name: 'Asana', url: 'https://app.asana.com', cat: 'work' },
    { name: 'Miro', url: 'https://miro.com/app/dashboard', cat: 'work' },
    { name: 'ClickUp', url: 'https://app.clickup.com', cat: 'work' },
    { name: 'Adobe CC', url: 'https://account.adobe.com', cat: 'work' },
    // Social
    { name: 'LinkedIn', url: 'https://www.linkedin.com', cat: 'social' },
    { name: 'X', url: 'https://x.com', cat: 'social' },
    { name: 'Instagram', url: 'https://www.instagram.com', cat: 'social' },
    { name: 'Facebook', url: 'https://www.facebook.com', cat: 'social' },
];

/** Os que aparecem antes do "ver todos" — a mesma escolha do painel antigo. */
export const POPULAR_NAMES = ['ChatGPT', 'Notion', 'Slack', 'Canva'];

/** Chave de deduplicação de um serviço. */
export function keyOf(url) {
    try {
        return new URL(url).href;
    } catch {
        return url;
    }
}

/**
 * Normaliza uma entrada livre em { name, url }, ou null se não for URL.
 *
 * Aceita qualquer URL http(s) válida — site público, localhost, IP, host de
 * rede interna. Sem protocolo, o padrão é https://, exceto para host local
 * (localhost:5173, 192.168.0.10:3000), que raramente tem certificado: esses
 * saem como http://.
 *
 * Uma palavra solta ("slack", "chat") continua não sendo URL: é a busca por
 * nome no catálogo, e tratá-la como host esconderia os resultados. Só vira
 * URL se tiver ponto, porta, for "localhost" ou vier com http(s):// explícito.
 */
export function normalizeServiceInput(raw) {
    const value = (raw || '').trim();
    if (!value) return null;

    const hasProtocol = /^https?:\/\//i.test(value);

    try {
        let url = new URL(hasProtocol ? value : `https://${value}`);
        if (!url.hostname) return null;

        if (!hasProtocol) {
            const looksLikeUrl = url.hostname.includes('.')
                || url.hostname === 'localhost'
                || url.hostname.startsWith('[')
                || url.port !== '';
            if (!looksLikeUrl) return null;

            if (isLocalHostname(url.hostname)) url = new URL(`http://${value}`);
        }

        return { name: nameOf(url), url: url.href };
    } catch {
        return null;
    }
}

/**
 * Nome de exibição. Site público: o primeiro rótulo (app.exemplo.com → App).
 * Host local: o host inteiro com a porta, porque "Localhost" sozinho não
 * distingue dois apps de desenvolvimento rodando ao mesmo tempo.
 */
function nameOf(url) {
    const host = url.hostname.replace(/^www\./, '');
    const label = !host.includes('.') || isIpAddress(host)
        ? `${host}${url.port ? `:${url.port}` : ''}`
        : host.split('.')[0];

    return label.charAt(0).toUpperCase() + label.slice(1);
}
