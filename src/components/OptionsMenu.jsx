import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Menu de ações (o ⋯ das listas).
 *
 * Fecha ao clicar fora, no Escape e depois de escolher uma ação. O painel
 * antigo tinha um listener global e a classe `hidden` alternada à mão em cada
 * lugar; aqui é o mesmo comportamento num componente só.
 *
 * O clique não sobe: a linha inteira costuma ser clicável, e abrir o menu não
 * pode abrir a tela de detalhe junto.
 *
 * `anchorTo` é o seletor do ancestral usado como referência quando o menu vive
 * em coordenadas de viewport (`position: fixed` no CSS). É o caso da lista de
 * sessões: ela rola dentro da moldura, e um menu absoluto seria cortado na
 * última linha. Sem esse cálculo o menu abre — mas no canto superior esquerdo
 * da tela, longe do ⋯ que o chamou, e ninguém o encontra.
 */
export default function OptionsMenu({
    buttonClassName = 'options-btn',
    menuClassName = 'package-options',
    label = 'Ações',
    glyph = '...',
    anchorTo = null,
    children,
}) {
    const [open, setOpen] = useState(false);
    const [fixedAt, setFixedAt] = useState(null);
    const wrapperRef = useRef(null);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;

        function handleOutside(event) {
            if (!wrapperRef.current?.contains(event.target)) setOpen(false);
        }
        function handleEscape(event) {
            if (event.key === 'Escape') setOpen(false);
        }

        // Captura, e não bolha: o wrapper barra a propagação (a linha inteira é
        // clicável), e o React chama stopPropagation no evento nativo lá na
        // raiz. Na bolha, nada disso chega ao document — nem o Escape, nem o
        // clique no ⋯ de outra linha, que deixava dois menus abertos.
        document.addEventListener('click', handleOutside, true);
        document.addEventListener('keydown', handleEscape, true);
        return () => {
            document.removeEventListener('click', handleOutside, true);
            document.removeEventListener('keydown', handleEscape, true);
        };
    }, [open]);

    // Coordenadas de viewport não acompanham a rolagem. Em vez de recalcular a
    // cada quadro, fecha — como o painel antigo fazia.
    useEffect(() => {
        if (!open || !anchorTo) return undefined;

        const close = () => setOpen(false);
        // Captura para pegar também a rolagem da lista, que não borbulha.
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [open, anchorTo]);

    useLayoutEffect(() => {
        if (!anchorTo) return;
        if (!open) { setFixedAt(null); return; }

        const row = wrapperRef.current?.closest(anchorTo);
        const menu = menuRef.current;
        if (!row || !menu) return;

        const box = row.getBoundingClientRect();

        // Mesmo desenho do card: o menu nasce um pouco abaixo do topo da linha,
        // e abre para cima quando não sobra espaço embaixo.
        let top = box.top + 42;
        if (top + menu.offsetHeight > window.innerHeight - 8) {
            top = Math.max(8, box.bottom - 42 - menu.offsetHeight);
        }

        setFixedAt({ top, left: box.right - 16 - menu.offsetWidth });
    }, [open, anchorTo]);

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

            <div
                ref={menuRef}
                className={`${menuClassName}${open ? '' : ' hidden'}`}
                style={fixedAt ? { top: `${fixedAt.top}px`, left: `${fixedAt.left}px` } : undefined}
            >
                {children(() => setOpen(false))}
            </div>
        </span>
    );
}
