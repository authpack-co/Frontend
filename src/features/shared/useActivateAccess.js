import { useState } from 'react';
import { useNotify } from '../../components/Notifications.jsx';
import { api, ApiError } from '../../lib/api.js';
import { usePackages } from '../../lib/packages.jsx';

// A chave é um UUID v4 — validar aqui evita uma ida ao servidor para um
// código obviamente colado errado.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Pedir acesso a um pacote pela chave.
 *
 * Mora fora das telas porque são duas: a porta de entrada de quem ainda não
 * tem acesso nenhum e o modal do ⚿ da sidebar, para quem já tem. As duas
 * fazem exatamente o mesmo pedido, e uma cópia da regra em cada uma acabaria
 * com mensagens diferentes para o mesmo caso.
 *
 * `onDone` é chamado só quando o pedido sai — é por onde o modal se fecha.
 */
export default function useActivateAccess({ onDone } = {}) {
    const notify = useNotify();
    const { reload } = usePackages();

    const [key, setKey] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);

    function changeKey(value) {
        setKey(value);
        setError('');
    }

    async function activate() {
        const trimmed = key.trim();

        if (!trimmed) return setError('A chave não pode estar vazia.');
        if (!UUID_V4.test(trimmed)) return setError('Chave inválida.');
        if (sending) return undefined;

        setError('');
        setSending(true);

        try {
            const data = await api.usePackageKey(trimmed) || {};
            const packageName = data.package?.name || 'pacote';
            const ownerName = data.owner?.name || 'o dono';

            // O pacote não entra em "Meus acessos" agora — só quando o dono
            // aprovar. Por isso a mensagem fala de espera, não de acesso pronto.
            notify('success', data.alreadyPending
                ? `Seu pedido para "${packageName}" continua com ${ownerName}.`
                : `Pedido enviado. ${ownerName} precisa aprovar para você usar "${packageName}".`);

            setKey('');
            onDone?.();
            reload();
        } catch (err) {
            notify('error', err instanceof ApiError
                ? err.message
                : 'Não foi possível solicitar o acesso.');
        } finally {
            setSending(false);
        }

        return undefined;
    }

    return { key, changeKey, error, sending, activate };
}
