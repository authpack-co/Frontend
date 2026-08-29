import { useCallback, useState } from 'react';
import ExtensionRequiredModal from './ExtensionRequiredModal.jsx';
import { useNotify } from './Notifications.jsx';
import { connectSession, isExtensionInstalled, useConnectResult } from '../lib/extension.js';

/**
 * Conectar a uma sessão, com o portão da extensão junto.
 *
 * Devolve `connect(session)` e o `gate` — o card de instalação, que a tela
 * renderiza onde quiser. As duas pontas precisam disso: o dono conecta pela
 * lista do pacote, o membro pelo card do acesso.
 */
export default function useConnectSession(pkg, { isAcquired }) {
    const notify = useNotify();
    const [pending, setPending] = useState(null);

    const handleFailure = useCallback((code) => {
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
    }, [notify]);

    useConnectResult(handleFailure);

    const connect = useCallback((session) => {
        // Sem extensão não há conexão: quem escreve os cookies na aba é ela.
        if (!isExtensionInstalled()) {
            setPending(session);
            return;
        }
        connectSession({ session, pkg, isAcquired });
    }, [pkg, isAcquired]);

    const gate = (
        <ExtensionRequiredModal
            open={pending !== null}
            onClose={() => setPending(null)}
            onReady={() => {
                const session = pending;
                setPending(null);
                if (session) connectSession({ session, pkg, isAcquired });
            }}
        />
    );

    return { connect, gate };
}
