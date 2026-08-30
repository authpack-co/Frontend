import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Abre os planos quando a pessoa chega pelo upsell (?upgrade=plus) — é assim
 * que a página de preços e a extensão apontam para cá.
 *
 * O parâmetro sai da URL na hora: recarregar não pode reabrir o modal.
 */
export default function useUpgradeParam(onOpen) {
    const [searchParams, setSearchParams] = useSearchParams();
    const upgrade = searchParams.get('upgrade');

    useEffect(() => {
        if (upgrade !== 'plus') return;

        const next = new URLSearchParams(searchParams);
        next.delete('upgrade');
        setSearchParams(next, { replace: true });

        onOpen();
        // Só o parâmetro importa: reagir a cada mudança de query reabriria o
        // modal a cada navegação.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [upgrade]);
}
