import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Casca dos modais.
 *
 * Fecha no Escape, no clique fora e no ×, numa regra só.
 *
 * Vai para o body por portal, e não é firula: um modal aberto de dentro de uma
 * linha clicável herdava o clique dela — confirmar "excluir sessão" abria a
 * tela da sessão junto. Fora da árvore, nada disso acontece, e de quebra ele
 * deixa de ser cortado por overflow de contêiner.
 */
export default function Modal({
    open = true,
    onClose,
    title,
    // O CSS é escopado por id e por classe NO PRÓPRIO .modal-body /
    // .modal-footer (ex.: .modal-body.pc-body). Sem poder pôr a classe no
    // elemento certo, o modal nasce sem metade do estilo.
    id,
    className = '',
    bodyClassName = '',
    footerClassName = '',
    // Um punhado de rodapés herdados não é `.modal-footer` coisa nenhuma —
    // têm classe própria e regras que não conversam com a base.
    footerBaseClass = 'modal-footer',
    headerClassName = '',
    // Conteúdo do cabeçalho no lugar do título simples (o card de "usando
    // agora" põe o serviço inteiro ali).
    header,
    // Fica entre o cabeçalho e o corpo — é onde as abas de "pessoas" moram.
    aside,
    children,
    footer,
    closable = true,
    overlayProps = {},
}) {
    useEffect(() => {
        if (!open || !closable) return undefined;
        const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
        // Captura: o overlay abaixo barra a propagação do keydown, e o React
        // faz isso no evento nativo lá na raiz. Na bolha, o Escape digitado
        // com o foco dentro do modal nunca chegaria aqui.
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [open, closable, onClose]);

    if (!open) return null;

    return createPortal(
        <div
            className="modal-overlay show"
            // O portal tira o modal do DOM da linha, mas o React continua
            // propagando o evento pela árvore de componentes: sem parar aqui,
            // digitar espaço no input dispara o "abrir detalhes" da linha que
            // abriu o modal.
            onClick={(event) => {
                event.stopPropagation();
                if (closable && event.target === event.currentTarget) onClose();
            }}
            onKeyDown={(event) => event.stopPropagation()}
            id={id}
            {...overlayProps}
        >
            <div className={`modal ${className}`.trim()} role="dialog" aria-modal="true">
                <div className={`modal-header ${headerClassName}`.trim()}>
                    {header || <h2 className="modal-title">{title}</h2>}
                    {closable && (
                        <button className="close-btn" type="button" aria-label="Fechar" onClick={onClose}>
                            ×
                        </button>
                    )}
                </div>

                {aside}

                <div className={`modal-body ${bodyClassName}`.trim()}>{children}</div>

                {footer && <div className={`${footerBaseClass} ${footerClassName}`.trim()}>{footer}</div>}
            </div>
        </div>,
        document.body
    );
}

/**
 * Confirmação destrutiva: o texto, o botão vermelho e o estado de envio.
 * Excluir pacote, excluir sessão, encerrar acesso e remover pessoa são a
 * mesma tela com outro texto.
 */
export function ConfirmModal({ open, onClose, title, confirmLabel, danger = true, busy, onConfirm, children }) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            closable={!busy}
            footer={(
                <>
                    <button className="btn btn-secondary" type="button" onClick={onClose} disabled={busy}>
                        Cancelar
                    </button>
                    <button
                        className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? <div className="spinner"></div> : confirmLabel}
                    </button>
                </>
            )}
        >
            <p className="form-text">{children}</p>
        </Modal>
    );
}

/**
 * Formulário de um campo só (criar/renomear). O botão fica ao lado do input,
 * como no painel antigo.
 */
export function NameFormModal({
    open, onClose, title, value, onChange, onSubmit, busy, error, note, placeholder,
}) {
    return (
        <Modal open={open} onClose={onClose} title={title} closable={!busy}>
            <div className="input-actions">
                <input
                    type="text"
                    className="form-input"
                    placeholder={placeholder}
                    maxLength={50}
                    value={value}
                    autoFocus
                    onChange={(event) => onChange(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') onSubmit(); }}
                />
                <button className="btn btn-primary btn-small" type="button" onClick={onSubmit} disabled={busy}>
                    {busy ? <div className="spinner"></div> : 'Ok'}
                </button>
            </div>

            {error && <span className="error-message">{error}</span>}

            {note && (
                <div className="form-note">
                    <span className="note-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                            <path d="M9 18h6" />
                            <path d="M10 22h4" />
                        </svg>
                    </span>
                    <span className="note">{note}</span>
                </div>
            )}
        </Modal>
    );
}
