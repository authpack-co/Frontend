import {
    CategoryScale,
    Chart,
    Filler,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip,
} from 'chart.js';
import { useEffect, useRef } from 'react';
import { formatHours } from '../../lib/usage.js';

/**
 * Rótulo do eixo X na visão por período.
 *
 * Numa semana o dia da semana ("Seg", "Ter") diz mais do que a data: é assim
 * que se enxerga que o uso cai no fim de semana. Acima de uma semana o nome
 * repetiria a cada sete colunas e deixaria de identificar a coluna, então a
 * partir daí volta a ser "DD/MM".
 */
const WEEKDAY_LABEL_LIMIT = 7;

function periodLabels(keys) {
    const short = keys.length <= WEEKDAY_LABEL_LIMIT;

    return keys.map((key) => {
        const [day, month, year] = key.split('/');
        if (!month) return key;

        if (short && year) {
            const date = new Date(Number(year), Number(month) - 1, Number(day));
            if (!Number.isNaN(date.getTime())) {
                // pt-BR devolve "seg." — sem o ponto e com maiúscula vira "Seg".
                const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' })
                    .replace('.', '');
                return weekday.charAt(0).toUpperCase() + weekday.slice(1);
            }
        }

        // O ano não cabe e não acrescenta nada num gráfico de 30 dias.
        return `${day}/${month}`;
    });
}

/**
 * Rótulo do eixo X na visão de hoje: "08:00" vira "08h".
 *
 * O eixo ficou deitado, sem rotação, então cada rótulo tem que caber em pouca
 * largura — o ":00" repetido seria a mesma informação ocupando o dobro dela.
 */
function hourLabels(keys) {
    return keys.map((key) => `${key.split(':')[0]}h`);
}

/**
 * Escreve o valor do ponto mais alto acima dele.
 *
 * É a única leitura numérica do gráfico: o eixo Y não é desenhado, porque numa
 * faixa dessa altura os números laterais custam largura e não respondem nada
 * que o tooltip não responda melhor. O pico, sim, é o que se procura de
 * relance — e ele fica escrito.
 */
const peakLabelPlugin = {
    id: 'usagePeakLabel',
    afterDatasetsDraw(chart, _args, options) {
        const { index, text, color, font } = options || {};
        if (index == null || index < 0 || !text) return;

        const point = chart.getDatasetMeta(0).data[index];
        if (!point) return;

        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // No primeiro e no último ponto o texto sairia do canvas; encostar na
        // borda é melhor do que sair pela metade.
        const half = ctx.measureText(text).width / 2 + 2;
        const x = Math.min(Math.max(point.x, chartArea.left + half), chartArea.right - half);

        ctx.fillText(text, x, point.y - 12);
        ctx.restore();
    },
};

Chart.register(
    CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Tooltip,
    peakLabelPlugin
);

/**
 * Gráfico de uso do pacote.
 *
 * Duas visões, decididas por `isDaily`: horas por dia num período, ou horas
 * por hora no dia de hoje. Fora o que o eixo X escreve — dias da semana, horas
 * ou datas —, o desenho é o mesmo nas duas.
 *
 * Uma diferença deliberada em relação ao painel antigo: lá o tooltip era um
 * <div> montado à mão fora do canvas, com HTML próprio e rolagem. Aqui é o
 * tooltip do Chart.js, pintado com os tokens do tema e com o mesmo conteúdo.
 * O que se perde é poder passar o mouse por dentro do tooltip — que existia
 * para listas longas, e o gráfico do pacote mostra três linhas curtas.
 */
export default function UsageChart({ data, isDaily }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const labels = Object.keys(data);

        const displayLabels = isDaily ? hourLabels(labels) : periodLabels(labels);

        // "Sem registro" chega como -1 em dados antigos; no gráfico isso é 0,
        // para o ponto ficar na linha de base e não abaixo dela.
        const values = labels.map((label) => Math.max(0, data[label].hours || 0));
        const maxValue = values.length ? Math.max(...values) : 0;
        const peakIndex = maxValue > 0 ? values.indexOf(maxValue) : -1;

        const styles = getComputedStyle(document.documentElement);
        const token = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
        const accent = token('--ap-accent', '#f97316');
        const accentRgb = token('--ap-accent-rgb', '249, 115, 22');
        const cardBg = token('--ap-bg-card', '#131416');
        const border = token('--ap-border', '#2e2f33');
        const fontBody = token('--ap-font-body', 'system-ui, sans-serif');

        const chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: displayLabels,
                datasets: [{
                    data: values,
                    borderColor: accent,
                    // O degradê acompanha a altura real da área do desenho: com
                    // uma altura fixa ele terminava fora do gráfico e a mancha
                    // chegava chapada na linha de base, em vez de sumir nela.
                    backgroundColor(context) {
                        const { ctx, chartArea } = context.chart;
                        if (!chartArea) return `rgba(${accentRgb}, 0.16)`;

                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, `rgba(${accentRgb}, 0.26)`);
                        gradient.addColorStop(1, `rgba(${accentRgb}, 0)`);
                        return gradient;
                    },
                    borderWidth: 2,
                    fill: true,
                    tension: 0.35,
                    // Pontos vazados, e o do pico um pouco maior: a linha passa
                    // por dentro deles em vez de virar uma fileira de bolinhas
                    // cheias disputando com ela. Num mês inteiro eles encostam
                    // uns nos outros, então encolhem.
                    pointRadius: (context) => (
                        context.dataIndex === peakIndex ? 5 : (values.length > 14 ? 2.5 : 3.5)
                    ),
                    pointBackgroundColor: cardBg,
                    pointBorderColor: accent,
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: cardBg,
                    pointHoverBorderColor: token('--ap-accent-strong', '#fb923c'),
                    pointHoverBorderWidth: 2.5,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                // Duração zero em vez de `animation: false`: o desenho continua
                // aparecendo pronto, mas o `false` desligava junto a animação
                // do tooltip, que pulava de um ponto ao outro sem transição.
                animation: { duration: 0 },
                // Espaço em cima para o número do pico, e nas laterais para o
                // primeiro e o último ponto não encostarem na borda.
                layout: { padding: { top: 22, left: 6, right: 6 } },
                plugins: {
                    legend: { display: false },
                    usagePeakLabel: {
                        index: peakIndex,
                        text: peakIndex >= 0 ? formatHours(maxValue) : '',
                        color: accent,
                        font: `600 12px ${fontBody}`,
                    },
                    tooltip: {
                        // O tooltip anima por conta própria; sem isto ele herda
                        // os 400ms padrão, lentos demais para o ponteiro.
                        animation: { duration: 260, easing: 'easeOutQuart' },
                        animations: {
                            numbers: {
                                type: 'number',
                                properties: ['x', 'y', 'width', 'height', 'caretX', 'caretY'],
                                duration: 260,
                                easing: 'easeOutQuart',
                            },
                            opacity: { type: 'number', duration: 180, easing: 'linear' },
                        },
                        backgroundColor: cardBg,
                        borderColor: border,
                        borderWidth: 1,
                        titleColor: token('--ap-text-primary', '#e8e6e3'),
                        bodyColor: token('--ap-text-secondary', '#d6d3cd'),
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => `${isDaily ? '🕐' : '📅'} ${labels[items[0].dataIndex]}`,
                            label(item) {
                                const point = data[labels[item.dataIndex]];
                                const lines = [`${formatHours(point.hours)} de uso`];

                                if (point.users != null) {
                                    lines.push(`${point.users} usuários`);
                                }
                                if (point.peak) {
                                    lines.push(`Pico: ${point.peak.count} às ${point.peak.hour}`);
                                }
                                return lines;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { color: border },
                        ticks: {
                            color: token('--ap-text-muted', '#9d9488'),
                            font: { size: 11 },
                            padding: 8,
                            // Rótulos sempre deitados: no mês (e num dia longo)
                            // o Chart.js pula os que não couberem, o que lê
                            // melhor do que trinta datas inclinadas.
                            maxRotation: 0,
                            minRotation: 0,
                            autoSkip: true,
                            autoSkipPadding: 12,
                        },
                    },
                    y: {
                        beginAtZero: true,
                        // Sem uso nenhum o eixo precisa de um teto, senão o
                        // Chart.js inventa uma escala de 0 a 1 "unidades".
                        max: maxValue === 0 ? 1 : maxValue * 1.15,
                        // Nada de números laterais: sobram só as linhas de
                        // apoio, e mesmo elas fracas o bastante para não
                        // disputar com o traço do uso.
                        border: { display: false },
                        grid: { color: border, drawTicks: false },
                        ticks: { display: false, maxTicksLimit: 4 },
                    },
                },
                interaction: { intersect: false, mode: 'index' },
            },
        });

        return () => chart.destroy();
    }, [data, isDaily]);

    return <canvas ref={canvasRef}></canvas>;
}
