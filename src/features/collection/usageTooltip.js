import { paletteFromSession } from '../../lib/palette.js';
import { formatDuration, formatHours } from '../../lib/usage.js';

/**
 * Tooltip do gráfico de uso.
 *
 * É um elemento HTML, e não o tooltip que o Chart.js pinta no canvas, por uma
 * razão só: a lista de sessões pode ser longa, e no canvas não há como limitar
 * a altura nem rolar. Aqui ela para em três linhas e meia — a quarta cortada
 * pela metade é o que diz que há mais para ver.
 *
 * Mora no <body> com position: fixed. Dentro da moldura do gráfico ele seria
 * recortado pelo painel, que rola.
 */

// Quanto o tooltip fica acima do ponto. Pequeno de propósito: é por esse vão
// que o ponteiro atravessa para entrar no tooltip e rolar a lista.
const CARET_GAP = 10;

// A saída não é imediata: sair do canvas em direção ao tooltip dispara o
// "escondi" antes do mouseenter dele chegar. Este respiro cobre a travessia.
const HIDE_DELAY_MS = 80;

const MARGIN = 8;

/**
 * O tempo da linha, em minutos inteiros.
 *
 * formatDuration desce a segundos ("33m 20s"), e aqui os segundos são ruído:
 * a linha existe para comparar sessões entre si, não para cronometrar uma.
 */
function compactDuration(seconds) {
    if (seconds < 60) return '<1m';
    return formatDuration(Math.round(seconds / 60) * 60);
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

/**
 * As linhas do tooltip: cada sessão do pacote, as usadas primeiro.
 *
 * Quem não foi usada naquele ponto continua na lista, marcada como tal — é o
 * que responde "e o Notion, ninguém abriu?" sem obrigar a procurar o que não
 * está lá.
 */
function rowsFor(sessions, secondsById) {
    const rows = (sessions || []).map((session) => ({
        id: session.id,
        name: session.name || 'Sessão',
        color: paletteFromSession(session).c1,
        seconds: secondsById[session.id] || 0,
    }));

    rows.sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name, 'pt-BR'));
    return rows;
}

function renderInto(node, { label, hours, rows }) {
    node.replaceChildren();

    const head = el('div', 'uc-tip-head');
    head.append(el('span', 'uc-tip-date', label));
    head.append(el('span', 'uc-tip-total', formatHours(hours)));
    node.append(head);

    // Sem lista de sessões o tooltip é a data e o tempo, e nada mais. É o que
    // acontece nas telas de uma sessão só: ali a lista teria uma linha
    // repetindo o número que o cabeçalho já mostra.
    if (rows.length === 0) return;

    // A barra é proporcional à maior sessão do ponto, não ao total do dia:
    // com dez sessões, dividir pelo total deixaria todas as barras num toco.
    const top = rows[0].seconds;
    const list = el('div', 'uc-tip-list');

    rows.forEach((row) => {
        const item = el('div', 'uc-tip-row');

        const line = el('div', 'uc-tip-line');
        line.append(el('span', 'uc-tip-name', row.name));
        line.append(el(
            'span',
            `uc-tip-value${row.seconds > 0 ? '' : ' is-idle'}`,
            row.seconds > 0 ? compactDuration(row.seconds) : 'sem uso'
        ));
        item.append(line);

        const bar = el('div', 'uc-tip-bar');
        const fill = el('span');
        fill.style.width = top > 0 ? `${Math.round((row.seconds / top) * 100)}%` : '0%';
        fill.style.background = row.color;
        bar.append(fill);
        item.append(bar);

        list.append(item);
    });

    node.append(list);
}

/**
 * Devolve o handler `external` do Chart.js e o `destroy` que tira o elemento
 * do body quando o gráfico morre.
 */
export function createUsageTooltip({ labels, data, getSessions }) {
    const node = el('div', 'uc-tip');
    node.style.opacity = '0';
    node.style.pointerEvents = 'none';
    document.body.appendChild(node);

    let inside = false;
    let shown = false;
    let hideTimer = null;

    const hide = () => {
        node.style.opacity = '0';
        node.style.pointerEvents = 'none';
        shown = false;
    };

    /**
     * Move o tooltip.
     *
     * Andando de um ponto ao outro ele desliza — é o que o tooltip do canvas
     * fazia, e sem isso a caixa pisca de lugar em lugar. Mas aparecer é outra
     * coisa: sem desligar a transição no primeiro posicionamento, ele entraria
     * deslizando desde onde estava da última vez, atravessando o gráfico.
     */
    const placeAt = (x, y) => {
        if (!shown) node.style.transition = 'none';

        node.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;

        if (!shown) {
            // Lê o layout para o navegador aplicar a posição antes de a
            // transição voltar; sem isto as duas mudanças entram no mesmo
            // quadro e a transição pega a posição nova mesmo assim.
            void node.offsetWidth;
            node.style.transition = '';
            shown = true;
        }
    };

    node.addEventListener('mouseenter', () => {
        inside = true;
        clearTimeout(hideTimer);
    });
    node.addEventListener('mouseleave', () => {
        inside = false;
        hide();
    });

    function external({ chart, tooltip }) {
        if (tooltip.opacity === 0) {
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => { if (!inside) hide(); }, HIDE_DELAY_MS);
            return;
        }

        clearTimeout(hideTimer);

        const index = tooltip.dataPoints?.[0]?.dataIndex;
        if (index == null) return;

        const label = labels[index];
        const point = data[label] || {};

        renderInto(node, {
            label,
            hours: point.hours || 0,
            rows: rowsFor(getSessions(), point.sessions || {}),
        });

        node.style.pointerEvents = 'auto';

        // Medidas só depois do conteúdo: a altura muda com o número de linhas.
        const box = chart.canvas.getBoundingClientRect();
        const width = node.offsetWidth;
        const height = node.offsetHeight;

        const left = Math.min(
            Math.max(box.left + tooltip.caretX - width / 2, MARGIN),
            window.innerWidth - width - MARGIN
        );

        // Acima do ponto; sem espaço lá em cima, abaixo dele.
        let top = box.top + tooltip.caretY - height - CARET_GAP;
        if (top < MARGIN) top = box.top + tooltip.caretY + CARET_GAP;

        placeAt(left, top);
        node.style.opacity = '1';
    }

    return {
        external,
        destroy() {
            clearTimeout(hideTimer);
            node.remove();
        },
    };
}
