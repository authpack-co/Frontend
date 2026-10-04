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
 * A extensão devolve o desfecho do connect por postMessage.
 *
 * O callback recebe os dois desfechos, e não só a falha: o sucesso é o que
 * diz que a busca dos dados de autenticação terminou e a aba vai abrir — é
 * ele que apaga o spinner do botão. Sem ouvir isto, uma falha da extensão
 * também não produziria sinal nenhum na tela.
 */
export function useConnectResult(onResult) {
    useEffect(() => {
        function handleMessage(event) {
            if (event.source !== window) return;
            if (event.data?.source !== 'niango-extension') return;
            if (event.data.type !== 'niango:connectResult') return;

            onResult({ ok: !!event.data.ok, code: event.data.code });
        }

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onResult]);
}

/** Mensagem da ponte da extensão para esta página (e só dela). */
function isExtensionMessage(event, type) {
    return event.source === window
        && event.data?.source === 'niango-extension'
        && event.data.type === type;
}

/** Pede à ponte a lista atual; a resposta chega como niango:connectedSessions. */
export function requestConnectedSessions() {
    window.postMessage(
        { source: 'niango-page', type: 'niango:getConnectedSessions' },
        window.location.origin,
    );
}

/**
 * Sessões conectadas neste navegador, como um Set de ids em string.
 *
 * Quem sabe disso é a extensão (é ela que mantém cada conexão viva), então
 * não custa requisição: a página pergunta à ponte ao montar e, daí em diante,
 * a extensão avisa sozinha a cada conectar ou sair. A pergunta vai de novo
 * no bridgeReady porque a ponte carrega depois dos scripts da página e pode
 * perder a primeira. Uma extensão antiga não responde, e a lista fica vazia —
 * os botões continuam "Conectar", como antes.
 *
 * Pergunta também ao voltar para a aba: se o service worker da extensão foi
 * reciclado, as conexões caíram sem aviso nenhum para cá.
 */
export function useConnectedSessions() {
    const [ids, setIds] = useState(() => new Set());

    useEffect(() => {
        const ask = requestConnectedSessions;
        const onVisible = () => {
            if (document.visibilityState === 'visible') ask();
        };

        function handleMessage(event) {
            if (isExtensionMessage(event, 'niango:bridgeReady')) {
                ask();
                return;
            }
            if (isExtensionMessage(event, 'niango:connectedSessions')) {
                setIds(new Set((event.data.sessionIds || []).map(String)));
            }
        }

        window.addEventListener('message', handleMessage);
        document.addEventListener('visibilitychange', onVisible);
        ask();
        return () => {
            window.removeEventListener('message', handleMessage);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    return ids;
}

/**
 * Pede à extensão que saia da sessão: ela para de manter a conexão e
 * recarrega a aba do serviço, que volta para a conta própria da pessoa.
 */
export function disconnectSession(sessionId) {
    window.postMessage({
        source: 'niango-page',
        type: 'niango:disconnect',
        sessionId,
    }, window.location.origin);
}

/** Desfecho do "Sair", devolvido pela ponte. */
export function useDisconnectResult(onResult) {
    useEffect(() => {
        function handleMessage(event) {
            if (!isExtensionMessage(event, 'niango:disconnectResult')) return;
            onResult({ sessionId: event.data.sessionId, ok: !!event.data.ok });
        }

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onResult]);
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
