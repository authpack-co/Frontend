import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

/**
 * Pacotes do usuário — coleção (criados por ele) e acessos (compartilhados com
 * ele) — mais o /users/info, que é quem sabe o limite de pessoas do plano.
 *
 * Carga única, como no painel antigo: as três chamadas vêm juntas no boot e
 * alimentam a sidebar e a tela de detalhe. Trocar de pacote não vai à rede.
 */

const PackagesContext = createContext(null);

/**
 * Sessões em ordem alfabética.
 *
 * O backend agrega as sessões sem ORDER BY, então a ordem que chega é a que o
 * banco achou mais barata: quase alfabética, com as recém-criadas caindo no
 * topo. Ordenar aqui deixa a lista sempre no mesmo lugar — inclusive uma
 * sessão nova, que entra onde o nome dela manda.
 *
 * `numeric` para "Conta 2" vir antes de "Conta 10", e `sensitivity: 'base'`
 * para acento e caixa não separarem nomes parecidos.
 */
function byName(sessions) {
    return [...(sessions || [])].sort((a, b) => (a.name || '').localeCompare(
        b.name || '',
        'pt-BR',
        { numeric: true, sensitivity: 'base' }
    ));
}

function withSortedSessions(packages) {
    return (packages || []).map((pkg) => ({ ...pkg, sessions: byName(pkg.sessions) }));
}

export function PackagesProvider({ children }) {
    const [state, setState] = useState({
        status: 'loading',
        collection: [],
        access: [],
        userInfo: null,
    });

    const load = useCallback(async () => {
        try {
            const [userInfo, collection, access] = await Promise.all([
                api.getUserInfo(),
                api.getCollectionPackages(),
                api.getAccessPackages(),
            ]);

            setState({
                status: 'ready',
                collection: withSortedSessions(collection),
                access: withSortedSessions(access),
                userInfo,
            });
        } catch (err) {
            console.error('[Packages] load error:', err);
            setState((prev) => ({ ...prev, status: 'error', error: err }));
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <PackagesContext.Provider value={{ ...state, reload: load }}>
            {children}
        </PackagesContext.Provider>
    );
}

export function usePackages() {
    const context = useContext(PackagesContext);
    if (!context) throw new Error('usePackages precisa estar dentro de <PackagesProvider>');
    return context;
}

/** Um pacote pelo id, olhando nas duas listas. */
export function usePackage(packageId) {
    const { collection, access, status } = usePackages();

    const pkg = collection.find((p) => p.id === packageId)
        || access.find((p) => p.id === packageId)
        || null;

    return {
        pkg,
        isCollection: !!collection.find((p) => p.id === packageId),
        // Só dá para dizer que o pacote não existe depois da lista carregar.
        notFound: status === 'ready' && !pkg,
        status,
    };
}

/**
 * Memberships suspensas ("packageId:userId") — as pessoas além do limite do
 * plano, por ordem de chegada. Espelha o cálculo do backend; conjunto vazio
 * quando o plano é ilimitado.
 */
export function getSuspendedMembershipKeys(collection, peopleLimit) {
    const keys = new Set();
    if (peopleLimit == null) return keys;

    const memberships = [];
    (collection || []).forEach((pkg) => {
        (pkg.users || []).forEach((user) => {
            if (user.isCreator) return;
            memberships.push({
                pkgId: pkg.id,
                userId: user.id,
                at: new Date(user.connectedAt || 0).getTime(),
            });
        });
    });

    // Ordem de chegada; empate estável por (packageId, userId) — igual ao backend.
    memberships.sort((a, b) => {
        if (a.at !== b.at) return a.at - b.at;
        if (a.pkgId !== b.pkgId) return a.pkgId < b.pkgId ? -1 : 1;
        return a.userId < b.userId ? -1 : 1;
    });

    memberships.forEach((m, index) => {
        if (index >= peopleLimit) keys.add(`${m.pkgId}:${m.userId}`);
    });

    return keys;
}
