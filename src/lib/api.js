/**
 * Cliente da API.
 *
 * Porte do assets/scripts/fetchManager.js. Duas diferenças que valem nota:
 *
 * 1. O ambiente sai de import.meta.env, não de uma constante editada à mão
 *    (o ENV = "dev" do envManager.js, que precisava ser trocado antes de cada
 *    deploy — e que estava justamente pendente no repo quando isto começou).
 * 2. Erro de rede vira exceção, em vez de um { ok: false } que cada chamador
 *    tinha que lembrar de checar.
 */

const API_URL = import.meta.env.VITE_API_URL
    || (import.meta.env.DEV ? 'http://127.0.0.1:3000' : 'https://api.authpack.co');

export class ApiError extends Error {
    constructor(message, { status = null, cause = null } = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.cause = cause;
    }
}

async function request(route, options = {}) {
    let response;

    try {
        response = await fetch(`${API_URL}${route}`, {
            method: 'GET',
            // O cookie de sessão é httpOnly e é a mesma credencial da extensão.
            credentials: 'include',
            ...options,
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        });
    } catch (err) {
        throw new ApiError('Não foi possível falar com o servidor.', { cause: err });
    }

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        // A API responde erro em dois formatos: { errorMessage } na maior parte
        // das rotas e { error } nas de assinatura. Os dois chegam aqui.
        throw new ApiError(
            body?.errorMessage || body?.error || 'A requisição falhou.',
            { status: response.status }
        );
    }

    // Mesma divisão no sucesso: umas envelopam em { data }, outras devolvem o
    // objeto direto (ex.: { url } do portal da Stripe).
    return body && 'data' in body ? body.data : body;
}

export const api = {
    request,

    // ── Auth ──────────────────────────────────────────────────────────────
    getAuthenticatedUser: () => request('/api/auth/'),
    logout: () => request('/api/auth/logout', { method: 'POST' }),

    // ── Usuário ───────────────────────────────────────────────────────────
    // Complementa o /api/auth/: é daqui que vêm peopleUsed e peopleLimit.
    getUserInfo: () => request('/api/users/info'),

    // ── Pacotes ───────────────────────────────────────────────────────────
    getCollectionPackages: () => request('/api/packages/created'),
    getAccessPackages: () => request('/api/packages/acquired'),

    createPackage: (name) => request('/api/packages', {
        method: 'POST',
        body: JSON.stringify({ name }),
    }),
    renamePackage: (packageId, name) => request(`/api/packages/${packageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
    }),
    deletePackage: (packageId) => request(`/api/packages/${packageId}`, { method: 'DELETE' }),

    // Troca a chave: link e código anteriores param de valer de uma vez. Quem
    // já entrou não é afetado — a chave só serve para pedir acesso.
    renewPackageKey: (packageId) => request(`/api/packages/${packageId}/key`, { method: 'PATCH' }),

    // Sai de um pacote que compartilharam com você.
    abortPackageAccess: (packageId) => request(`/api/packages/access/${packageId}`, { method: 'DELETE' }),

    // ── Pessoas do pacote ─────────────────────────────────────────────────
    getPackagePeople: (packageId) => request(`/api/packages/${packageId}/people`),
    approvePackageRequest: (packageId, requestId) =>
        request(`/api/packages/${packageId}/requests/${requestId}/approve`, { method: 'POST' }),
    rejectPackageRequest: (packageId, requestId) =>
        request(`/api/packages/${packageId}/requests/${requestId}/reject`, { method: 'POST' }),
    removeUserFromPackage: (packageId, userId) =>
        request(`/api/packages/${packageId}/users/${userId}`, { method: 'DELETE' }),

    // ── Sessões ───────────────────────────────────────────────────────────
    renameSession: (sessionId, name) => request(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
    }),
    deleteSession: (sessionId) => request(`/api/sessions/${sessionId}`, { method: 'DELETE' }),

    // Pede acesso a um pacote pela chave. O acesso não vale na hora: o dono
    // ainda precisa aprovar.
    usePackageKey: (key) => request('/api/packages/access', {
        method: 'POST',
        body: JSON.stringify({ key }),
    }),

    // ── Estatísticas ──────────────────────────────────────────────────────
    getPackageOverviewStats: (packageId) => request(`/api/stats/package/overview/${packageId}`),
    getPackageAccessOverview: (packageId) => request(`/api/stats/package/access-overview/${packageId}`),

    // ── Assinatura ────────────────────────────────────────────────────────
    getBilling: () => request('/api/subscription/billing'),
    createBillingPortal: () => request('/api/subscription/portal', { method: 'POST' }),
    cancelBilling: () => request('/api/subscription/cancel', { method: 'POST' }),
};
