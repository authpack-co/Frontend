import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import {
    getDailyPackageUsage,
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
                    lastUsageByUser: normalizeLastUsage(data.usersLastUsage),
                    historyUsers: indexById(data.historyUsers),
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

// De quanto em quanto tempo "usando agora" é reconferido. A janela do
// heartbeat é de 60s; metade disso mantém a tela dentro dela sem transformar
// a página num pinga-pinga de requisições.
const ONLINE_POLL_MS = 30000;

/**
 * Quem está usando cada sessão do pacote agora.
 *
 * Fora de usePackageStats porque envelhece: o resto daquela carga é histórico
 * de 30 dias, que não muda enquanto a tela está aberta, e "agora" deixa de ser
 * verdade em 60 segundos. Junto com ele, a tela dizia que ninguém estava
 * usando um minuto depois de carregada — e voltava a dizer que sim ao dar F5.
 *
 * `refresh` existe para quem abre uma tela sobre estes dados (o card de
 * "usando agora") não depender de onde o intervalo parou.
 */
export function usePackageOnline(packageId) {
    const [bySession, setBySession] = useState({});

    const load = useCallback(async () => {
        if (!packageId) return;

        try {
            const data = await api.getPackageOnline(packageId);
            const grouped = {};

            (data?.online || []).forEach((row) => {
                grouped[row.sessionId] = grouped[row.sessionId] || [];
                grouped[row.sessionId].push(row);
            });

            // Quem está há mais tempo no topo, como na lista do card.
            Object.values(grouped).forEach((rows) => {
                rows.sort((a, b) => b.activeSeconds - a.activeSeconds);
            });

            setBySession(grouped);
        } catch (err) {
            // Uma falha aqui não apaga o que está na tela: o valor anterior
            // erra por segundos, e uma lista vazia erraria por tudo.
            console.error('[Stats] getPackageOnline error:', err);
        }
    }, [packageId]);

    useEffect(() => {
        setBySession({});
        load();

        const timer = setInterval(load, ONLINE_POLL_MS);
        return () => clearInterval(timer);
    }, [load]);

    // Quem está online em alguma sessão do pacote, para a lista de pessoas.
    const onlineUserIds = useMemo(() => {
        const ids = new Set();
        Object.values(bySession).forEach((rows) => {
            rows.forEach((row) => ids.add(row.userId));
        });
        return ids;
    }, [bySession]);

    return { bySession, onlineUserIds, refresh: load };
}

/**
 * As pessoas que o histórico cita, por id — membros atuais e quem já saiu.
 *
 * Remover alguém do pacote não apaga as conexões dela, e o gráfico e os
 * totais seguem contando esse tempo. O backend manda essa lista junto do
 * histórico justamente para as linhas dessa pessoa continuarem tendo nome:
 * sem ela, o total de cima deixava de bater com o histórico de baixo.
 */
function indexById(historyUsers) {
    const result = {};
    (historyUsers || []).forEach((user) => { result[user.id] = user; });
    return result;
}

/**
 * Quem é cada userId de um histórico de pacote.
 *
 * `find` devolve null para quem não dá para identificar — é o que separa
 * "essa pessoa saiu do pacote" de "esse id não é deste pacote". `resolve`
 * nunca devolve null: linha de histórico sem dono ainda é uso que aconteceu,
 * e escondê-la faria o total mentir.
 *
 * Ex-membro sai marcado com `removed`, para a tela poder dizer isso.
 */
export function makeUserLookup(pkg, historyUsers) {
    const members = pkg?.users || [];
    const byId = historyUsers || {};

    function find(userId) {
        const member = members.find((user) => user.id === userId);
        if (member) return member;

        const fromHistory = byId[userId];
        if (fromHistory) return { ...fromHistory, removed: !fromHistory.isMember };

        return null;
    }

    return {
        find,
        resolve(userId) {
            return find(userId)
                || { id: userId, name: 'Usuário removido', email: '', picture: '', removed: true };
        },
    };
}

/**
 * Estatísticas de um pacote recebido, do ponto de vista de quem recebeu.
 *
 * Outra rota e outro escopo: /package/access-overview/:id responde a membro
 * (a de cima é só do dono, 403 para o resto) e o histórico que ela devolve é
 * o do próprio usuário — não há como um membro ver o uso dos outros, nem
 * aqui nem no servidor.
 *
 * O formato do histórico é o mesmo, então o pipeline de usage.js vale igual.
 */
export function useAccessStats(packageId) {
    const [state, setState] = useState({ status: 'loading', joinedAt: null, accessHistory: {} });

    const load = useCallback(async () => {
        if (!packageId) return;

        setState({ status: 'loading', joinedAt: null, accessHistory: {} });

        try {
            const data = await api.getPackageAccessOverview(packageId);

            setState({
                status: 'ready',
                joinedAt: data?.joinedAt || null,
                accessHistory: processRawAccessHistory(data?.myAccessHistory),
            });
        } catch (err) {
            console.error('[Stats] getPackageAccessOverview error:', err);
            setState({ status: 'error', joinedAt: null, accessHistory: {}, error: err });
        }
    }, [packageId]);

    useEffect(() => { load(); }, [load]);

    return { ...state, reload: load };
}
