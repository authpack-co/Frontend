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

    // ── Assinatura ────────────────────────────────────────────────────────
    getBilling: () => request('/api/subscription/billing'),
    createBillingPortal: () => request('/api/subscription/portal', { method: 'POST' }),
    cancelBilling: () => request('/api/subscription/cancel', { method: 'POST' }),
};
