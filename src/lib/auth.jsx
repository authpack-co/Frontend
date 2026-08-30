import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { api, ApiError } from './api.js';

/**
 * Sessão do usuário.
 *
 * O painel antigo resolvia isto com um script bloqueante no <head> que
 * escondia a página inteira (visibility: hidden) até o /api/auth/ responder.
 * Aqui a resposta é a mesma — quem não está logado vai para o login com
 * ?redirect= de volta —, mas a espera é um estado de carregamento, não um
 * documento invisível.
 *
 * O login é a rota /login, pública — RequireAuth não a cobre.
 */

const LOGIN_URL = '/login';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [state, setState] = useState({ status: 'loading', user: null });

    const load = useCallback(async () => {
        try {
            const user = await api.getAuthenticatedUser();
            setState({ status: 'authenticated', user });
        } catch (err) {
            // 401 é resposta esperada (não logado). Qualquer outra coisa é a API
            // fora do ar, e mandar para o login esconderia o problema real.
            if (err instanceof ApiError && err.status === 401) {
                setState({ status: 'anonymous', user: null });
            } else {
                setState({ status: 'error', user: null, error: err });
            }
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const logout = useCallback(async () => {
        await api.logout();
        window.location.assign(LOGIN_URL);
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, reload: load, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
    return context;
}

export function redirectToLogin() {
    const back = window.location.pathname + window.location.search;
    window.location.replace(`${LOGIN_URL}?redirect=${encodeURIComponent(back)}`);
}

/** Portão das rotas logadas. */
export function RequireAuth({ children }) {
    const { status, error } = useAuth();

    useEffect(() => {
        if (status === 'anonymous') redirectToLogin();
    }, [status]);

    if (status === 'authenticated') return children;

    if (status === 'error') {
        return (
            <div className="ap-boot-state">
                <p>Não foi possível falar com o servidor.</p>
                <p className="ap-boot-detail">{error?.message}</p>
            </div>
        );
    }

    // 'loading' e 'anonymous' (que está saindo da página) mostram a mesma espera.
    return (
        <div className="ap-boot-state">
            <div className="spinner large"></div>
        </div>
    );
}

/**
 * Portão do painel admin: logado e com a role.
 *
 * Quem está logado mas não é admin vai para o painel comum, sem aviso — era
 * o que o script bloqueante da página admin fazia. Isto é conveniência, não
 * proteção: cada rota de /api/admin passa por requireAdmin no servidor, e
 * mexer nesta checagem no navegador não abre nada.
 */
export function RequireAdmin({ children }) {
    const { status, user } = useAuth();

    if (status === 'authenticated' && user?.role !== 'admin') {
        return <Navigate to="/collection" replace />;
    }

    return <RequireAuth>{children}</RequireAuth>;
}
