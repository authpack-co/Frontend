import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import {
    getDailyPackageUsage,
    getOnlineBySession,
    getPackageHistoryUsage,
    normalizeLastUsage,
    processRawAccessHistory,
} from './usage.js';

/**
 * Estatísticas de uso de um pacote.
 *
 * Uma chamada só (/api/stats/package/overview/:id) traz o histórico cru; o
 * resto — uso por dia, uso de hoje por hora, quem está online, último acesso
 * de cada pessoa — sai daqui, sem ida nova ao servidor. É por isso que o
 * seletor de período do gráfico não carrega nada: ele só recorta o que já
 * está na memória.
 *
 * A resposta também traz newUsersByDate e o total de conexões, que
 * alimentavam os cards de métricas ("Usos", "Usuários", "Sessões", "Online").
 * Esses cards saíram do layout antes desta migração, então os campos não são
 * derivados aqui — voltam junto com quem os mostrar.
 */
export function usePackageStats(packageId) {
    const [state, setState] = useState({ status: 'loading', stats: null });

    const load = useCallback(async () => {
        if (!packageId) return;

        setState({ status: 'loading', stats: null });

        try {
            const data = await api.getPackageOverviewStats(packageId);
            const accessHistory = processRawAccessHistory(data.rawPackageAccessHistory);

            setState({
                status: 'ready',
                stats: {
                    accessHistory,
                    historyUsage: getPackageHistoryUsage(accessHistory),
                    dailyUsage: getDailyPackageUsage(accessHistory),
                    onlineBySession: getOnlineBySession(accessHistory),
                    lastUsageByUser: normalizeLastUsage(data.usersLastUsage),
                },
            });
        } catch (err) {
            console.error('[Stats] getPackageOverviewStats error:', err);
            setState({ status: 'error', stats: null, error: err });
        }
    }, [packageId]);

    useEffect(() => { load(); }, [load]);

    return { ...state, reload: load };
}
