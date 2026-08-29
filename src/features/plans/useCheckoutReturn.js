import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useNotify } from '../../components/Notifications.jsx';

/**
 * Retorno do Checkout hospedado da Stripe (?assinatura=sucesso|cancelado).
 *
 * O pagamento é confirmado pelo webhook invoice.paid, que pode chegar alguns
 * segundos depois do redirect — por isso a mensagem fala em "liberando" e a
 * página recarrega uma vez, para pegar o plano já atualizado.
 *
 * O parâmetro sai da URL na hora: recarregar não pode reexibir o aviso.
 */
export default function useCheckoutReturn() {
    const notify = useNotify();
    const [searchParams, setSearchParams] = useSearchParams();
    const outcome = searchParams.get('assinatura');

    useEffect(() => {
        if (!outcome) return;

        const next = new URLSearchParams(searchParams);
        next.delete('assinatura');
        setSearchParams(next, { replace: true });

        if (outcome === 'sucesso') {
            notify('success', 'Pagamento recebido! Liberando seu plano...');
            setTimeout(() => window.location.reload(), 4000);
        } else if (outcome === 'cancelado') {
            notify('error', 'Checkout cancelado. Nenhuma cobrança foi feita.');
        }
        // Só o desfecho importa: reagir a cada mudança de query reexibiria
        // o aviso a cada navegação.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [outcome]);
}
