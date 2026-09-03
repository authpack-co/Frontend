import { useEffect, useState } from 'react';
import { GoogleIcon } from '../../components/BrandIcons.jsx';
import { useSearchParams } from 'react-router';
import { API_URL, api } from '../../lib/api.js';
import './login.css';

/**
 * Entrada da conta.
 *
 * O login em si acontece no Google: daqui a pessoa só sai com o `redirect`
 * pendurado, e o callback do backend a devolve nele. Quem já está logada nem
 * chega a ver a tela.
 */
export default function LoginPage() {
    const [searchParams] = useSearchParams();
    const redirectPath = searchParams.get('redirect') || '/collection';

    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let alive = true;

        api.getAuthenticatedUser()
            .then(() => { window.location.replace(redirectPath); })
            .catch(() => { if (alive) setChecking(false); });

        return () => { alive = false; };
    }, [redirectPath]);

    function handleLogin() {
        window.location.href = `${API_URL}/api/auth/google?redirect=${encodeURIComponent(redirectPath)}`;
    }

    return (
        <main className="login-main">
            <div className="login-card">
                <div className="login-logo">
                    <img src="/assets/images/favicon-128x128.png" alt="Niango" />
                </div>
                <h1 className="login-title">Bem-vindo ao Niango</h1>
                <p className="login-subtitle">Seu gerenciador de sessões.</p>

                <div className="login-divider-container">
                    <div className="login-divider"></div>
                    <div className="login-divider-text">Entrar com</div>
                    <div className="login-divider"></div>
                </div>

                <button className="btn-google" type="button" onClick={handleLogin} disabled={checking}>
                    <GoogleIcon />
                    Continuar com Google
                </button>

                <div className="login-footer-note">
                    Usamos sua conta Google apenas para autenticação.
                </div>
            </div>
        </main>
    );
}
