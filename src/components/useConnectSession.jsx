import { useCallback, useEffect, useRef, useState } from 'react';
import ExtensionRequiredModal from './ExtensionRequiredModal.jsx';
import { useNotify } from './Notifications.jsx';
import { connectSession, isExtensionInstalled, useConnectResult } from '../lib/extension.js';

/**
 * Teto do "Conectando".
 *
 * Quem apaga o spinner é a resposta da extensão. Uma extensão antiga (que não
 * responde) ou travada deixaria o botão girando para sempre, então o estado
 * também expira sozinho — melhor um botão clicável de novo que um moinho
 * eterno.
 */
const CONNECT_TIMEOUT_MS = 15000;

/**
 * Conectar a uma sessão, com o portão da extensão junto.
 *
 * Devolve `connect(session)` e o `gate` — o card de instalação, que a tela
 * renderiza onde quiser. As duas pontas precisam disso: o dono conecta pela
 * lista do pacote, o membro pelo card do acesso.
 *
 * `connectingId` é a sessão cujo connect está em curso. Entre o clique e a aba
 * abrindo a extensão vai buscar os dados de autenticação, e isso demora o
 * bastante para a tela parecer não ter registrado o clique — daí o spinner.
 * Ele apaga quando a extensão devolve o desfecho, quando a aba do serviço
 * esconde esta página, ou no teto acima — o que vier primeiro.
 */
export default function useConnectSession(pkg, { isAcquired }) {
    const notify = useNotify();
    const [gateOpen, setGateOpen] = useState(false);
    const [connectingId, setConnectingId] = useState(null);
    const timeoutRef = useRef(null);

    const stopConnecting = useCallback(() => {
        clearTimeout(timeoutRef.current);
        setConnectingId(null);
    }, []);

    // O timer não pode sobreviver à tela: sair dela no meio de um connect
    // deixaria um setState mirando um componente desmontado.
    useEffect(() => () => clearTimeout(timeoutRef.current), []);

    // A aba do serviço abrindo esconde esta página, e isso também é fim de
    // connect. É o mesmo desfecho por outro caminho: vale para uma extensão
    // que abra a aba sem avisar de volta, e evita voltar para cá minutos
    // depois e achar um spinner girando sobre coisa nenhuma.
    useEffect(() => {
        if (connectingId === null) return undefined;

        const onHidden = () => {
            if (document.visibilityState === 'hidden') stopConnecting();
        };

        document.addEventListener('visibilitychange', onHidden);
        return () => document.removeEventListener('visibilitychange', onHidden);
    }, [connectingId, stopConnecting]);

    const handleResult = useCallback(({ ok, code }) => {
        // Deu certo ou não, o connect acabou: a aba abre por conta da extensão
        // e esta página continua onde estava.
        stopConnecting();
        if (ok) return;

        if (code === 'unauthorized') {
            // A extensão usa a mesma sessão desta página: 401 lá significa que
            // ela caiu para os dois lados, e recarregar leva ao login.
            notify('error', 'Sua sessão expirou. Faça login novamente para continuar.');
            setTimeout(() => window.location.reload(), 1500);
            return;
        }
        if (code === 'not_found') {
            notify('error', 'Esta sessão não está mais disponível. Atualize o pacote e tente novamente.');
            return;
        }
        notify('error', 'Não foi possível conectar à sessão. Tente novamente em instantes.');
    }, [notify, stopConnecting]);

    useConnectResult(handleResult);

    const start = useCallback((session) => {
        setConnectingId(session.id);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setConnectingId(null), CONNECT_TIMEOUT_MS);

        connectSession({ session, pkg, isAcquired });
    }, [pkg, isAcquired]);

    const connect = useCallback((session) => {
        // Sem extensão não há conexão: quem escreve os cookies na aba é ela.
        if (!isExtensionInstalled()) {
            setGateOpen(true);
            return;
        }
        start(session);
    }, [start]);

    // O portão não retoma o connect: instalar a extensão é coisa de outro
    // boot da página, e "Já instalei" recarrega. Depois disso a pessoa clica
    // em Conectar de novo, com a extensão no lugar.
    const gate = (
        <ExtensionRequiredModal
            open={gateOpen}
            onClose={() => setGateOpen(false)}
        />
    );

    return { connect, connectingId, gate };
}
