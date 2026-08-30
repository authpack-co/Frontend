import { useEffect, useState } from 'react';

/**
 * A extensão marca a página com data-niango-active="1" quando está instalada.
 * Como ela não guarda credencial própria (usa o mesmo cookie do site),
 * "instalada" e "na conta certa" são a mesma pergunta.
 */

const FLAG_ATTRIBUTE = 'data-niango-active';

export const WEBSTORE_URL =
    'https://chromewebstore.google.com/detail/niango/fncdgjcpelomihdflipojhkmgoicckpm';

export function isExtensionInstalled() {
    return document.documentElement.getAttribute(FLAG_ATTRIBUTE) === '1';
}

/**
 * Estado da extensão neste navegador: 'checking' | 'ready' | 'missing'.
 *
 * A extensão marca a flag de forma assíncrona, e pode marcá-la depois da tela
 * já ter renderizado — daí o observer, em vez do resultado memoizado que o
 * extensionState.js usava e que podia congelar em "não instalada".
 */
/**
 * Pede à extensão que abra a sessão.
 *
 * Não é window.open: a ponte da extensão relança isto como "redirectUser", que
 * pré-seta os cookies antes de abrir a aba. Abrir a aba daqui deixaria a
 * pessoa numa tela de login.
 */
export function connectSession({ session, pkg, isAcquired }) {
    window.postMessage({
        source: 'niango-page',
        type: 'niango:connect',
        session: {
            id: session.id,
            packageId: pkg.id,
            isAcquired,
            url: session.url,
            sessionName: session.name || '',
            sessionIcon: session.icon || '',
            ownerName: pkg.owner?.name || '',
        },
    }, window.location.origin);
}

/**
 * A extensão devolve o desfecho do connect por postMessage. Sem ouvir isso,
 * uma falha dela não produziria sinal nenhum na tela.
 */
export function useConnectResult(onFailure) {
    useEffect(() => {
        function handleMessage(event) {
            if (event.source !== window) return;
            if (event.data?.source !== 'niango-extension') return;
            if (event.data.type !== 'niango:connectResult') return;
            if (event.data.ok) return;

            onFailure(event.data.code);
        }

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onFailure]);
}

export function useExtensionStatus() {
    const [status, setStatus] = useState('checking');

    useEffect(() => {
        const read = () => setStatus(isExtensionInstalled() ? 'ready' : 'missing');

        // Um tick de folga para a extensão marcar a flag antes do primeiro veredito.
        const timer = setTimeout(read, 150);

        const observer = new MutationObserver(read);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: [FLAG_ATTRIBUTE],
        });

        return () => { clearTimeout(timer); observer.disconnect(); };
    }, []);

    return status;
}
