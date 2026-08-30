import { Outlet, useLocation, useParams } from 'react-router';

/**
 * Andaime das telas ainda não migradas.
 *
 * Existe para uma coisa só: provar que a rota casou e que os params chegaram —
 * inclusive depois de um F5 direto na URL. Cada tela real substitui um destes.
 */
export default function Placeholder({ name, from }) {
    const params = useParams();
    const { pathname, search } = useLocation();
    const entries = Object.entries(params);

    return (
        <div className="ap-placeholder">
            <h1>{name}</h1>
            <p className="ap-placeholder-url">{pathname}{search}</p>
            {entries.length > 0 && (
                <dl className="ap-placeholder-params">
                    {entries.map(([key, value]) => (
                        <div key={key}>
                            <dt>{key}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
            )}
            {from && <p className="ap-placeholder-from">Vem de: <code>{from}</code></p>}
            {/* Slot dos modais com rota própria (share, people, sessions/new):
                montam aqui, por cima da tela que segue viva atrás. */}
            <Outlet />
        </div>
    );
}
