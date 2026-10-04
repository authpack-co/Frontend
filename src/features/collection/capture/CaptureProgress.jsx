import ServiceIcon from '../../../components/ServiceIcon.jsx';

const COPY = {
    create: {
        running: 'Capturando sessões…',
        footerRunning: 'Capturando…',
        allOk: 'Todas as sessões foram adicionadas',
        done: 'adicionada(s)',
        footerAllOk: 'Sessões adicionadas com sucesso.',
    },
    update: {
        running: 'Atualizando sessões…',
        footerRunning: 'Atualizando…',
        allOk: 'Todas as sessões foram atualizadas',
        done: 'atualizada(s)',
        footerAllOk: 'Sessões atualizadas com sucesso.',
    },
};

// Por que uma linha falhou, nos casos em que dá para dizer algo útil (reason
// vindo da extensão). Os demais ficam só com o ✕.
const FAILURE_REASONS = {
    redirected_offsite: 'O site levou para outro domínio',
    redirect_loop: 'O site redirecionou vezes demais',
    timeout: 'O site não terminou de carregar',
    load_failed: 'O site não carregou',
};

/** "2 adicionada(s) · 1 com falha · 3 cancelada(s)" — só as partes que existem. */
function partialLine(copy, { ok, failed, cancelled = 0 }) {
    const parts = [`${ok} ${copy.done}`];
    if (failed) parts.push(`${failed} com falha`);
    if (cancelled) parts.push(`${cancelled} cancelada(s)`);
    return parts.join(' · ');
}

/**
 * Fase de progresso: uma linha por serviço, com a barra de carregamento de
 * cada um e a barra geral em cima.
 *
 * A geral avança só quando uma sessão é resolvida; o carregamento de cada aba
 * vive na barra da linha.
 */
export default function CaptureProgress({ mode, rows, batchDone, cancelling = false, summary, onRetry }) {
    const copy = COPY[mode] || COPY.create;
    const { total, resolved, ok, failed, cancelled = 0 } = summary;

    let status = cancelling ? 'Cancelando…' : copy.running;
    if (batchDone) status = failed === 0 && cancelled === 0 ? copy.allOk : partialLine(copy, summary);

    return (
        <div className="modal-body as-progress-body">
            <div className="up-progress">
                <div className="up-progress-top">
                    <span className="up-status as-status">{status}</span>
                    <span className="up-count as-count">
                        {batchDone ? `${ok}/${total}` : `${resolved}/${total}`}
                    </span>
                </div>
                <div className="up-bar">
                    <div
                        className="up-bar-fill as-bar-fill"
                        style={{ width: `${total ? Math.round((resolved / total) * 100) : 0}%` }}
                    ></div>
                </div>
            </div>

            <ul className="up-list as-list">
                {rows.map(({ target, state, pct, reason }) => (
                    <li className="up-item" data-ref={target.ref} data-state={state} key={target.ref}>
                        <ServiceIcon
                            className="up-item-icon"
                            icon={target.icon}
                            url={target.url}
                            name={target.name}
                        />
                        <div className="up-item-content">
                            <span className="up-item-name" title={target.name || ''}>{target.name}</span>
                            {state === 'error' && FAILURE_REASONS[reason] && (
                                <span className="up-item-reason">{FAILURE_REASONS[reason]}</span>
                            )}
                            <div className="up-item-bar">
                                <div className="up-item-bar-fill" style={{ width: `${Math.round(pct)}%` }}></div>
                            </div>
                        </div>
                        {/* Só aparece (via CSS) quando a linha falhou e o lote já terminou. */}
                        <button
                            type="button"
                            className="up-item-retry"
                            title="Tentar de novo"
                            aria-label="Tentar de novo"
                            disabled={!batchDone || state !== 'error'}
                            onClick={() => onRetry(target.ref)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                        </button>
                        <span className="up-item-status"></span>
                    </li>
                ))}
            </ul>

            <p className="up-hint">
                Mantenha esta aba aberta — as abas dos serviços abrem e fecham sozinhas.
            </p>
        </div>
    );
}

export function progressFooterStatus({ mode, batchDone, cancelling = false, summary }) {
    const copy = COPY[mode] || COPY.create;

    if (!batchDone) return { text: cancelling ? 'Cancelando…' : copy.footerRunning, kind: 'running' };
    if (summary.failed) return { text: 'Toque em tentar de novo nas que falharam.', kind: 'alert' };
    // Cancelar foi escolha de quem estava olhando: nem alerta, nem sucesso.
    if (summary.cancelled) return { text: 'Captura cancelada. O que já tinha sido coletado ficou.', kind: 'neutral' };
    return { text: copy.footerAllOk, kind: 'ok' };
}
