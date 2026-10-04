/**
 * Selo "Conectado" de uma sessão aberta neste navegador. Quem sabe disso é a
 * extensão (ver useConnectedSessions), então vale só para este dispositivo.
 */
export default function ConnectedBadge() {
    return (
        <span className="session-connected-badge" title="Sessão conectada neste navegador">
            <span className="session-connected-dot" aria-hidden="true"></span>
            Conectado
        </span>
    );
}
