import { useEffect, useState } from 'react';

/**
 * A extensão marca a página com data-authpack-active="1" quando está instalada.
 * Como ela não guarda credencial própria (usa o mesmo cookie do site),
 * "instalada" e "na conta certa" são a mesma pergunta.
 */

const FLAG_ATTRIBUTE = 'data-authpack-active';

export const WEBSTORE_URL =
    'https://chromewebstore.google.com/detail/authpack-studio/fncdgjcpelomihdflipojhkmgoicckpm';

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
