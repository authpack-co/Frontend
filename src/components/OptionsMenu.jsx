import { useEffect, useRef, useState } from 'react';

/**
 * Menu de ações (o ⋯ das listas).
 *
 * Fecha ao clicar fora, no Escape e depois de escolher uma ação. O painel
 * antigo tinha um listener global e a classe `hidden` alternada à mão em cada
 * lugar; aqui é o mesmo comportamento num componente só.
 *
 * O clique não sobe: a linha inteira costuma ser clicável, e abrir o menu não
 * pode abrir a tela de detalhe junto.
 */
export default function OptionsMenu({
    buttonClassName = 'options-btn',
    menuClassName = 'package-options',
    label = 'Ações',
    glyph = '...',
    children,
}) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;

        function handleOutside(event) {
            if (!wrapperRef.current?.contains(event.target)) setOpen(false);
        }
        function handleEscape(event) {
            if (event.key === 'Escape') setOpen(false);
        }

        document.addEventListener('click', handleOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('click', handleOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    return (
        <span
            ref={wrapperRef}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
        >
            <button
                className={buttonClassName}
                type="button"
                title={label}
                aria-label={label}
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
            >
                {glyph}
            </button>

            <div className={`${menuClassName}${open ? '' : ' hidden'}`}>
                {children(() => setOpen(false))}
            </div>
        </span>
    );
}
