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
import { useAppliedTheme } from '../../lib/theme.js';
import { formatHours } from '../../lib/usage.js';
import { createUsageTooltip } from './usageTooltip.js';

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
 * O eixo Y dá a escala; o pico é o número que se procura de relance — e ele
 * fica escrito.
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

/**
 * Escala do eixo Y em passos "redondos" de tempo — 15m, 30m, 1h, 2h… — com no
 * máximo quatro intervalos e um teto logo acima do pico. Deixado por conta
 * do Chart.js, o eixo pulava de 2h em 2h para um pico de 2h 47m, ou terminava
 * num "3h 13m".
 */
const Y_STEPS_HOURS = [0.25, 0.5, 1, 2, 3, 4, 6, 8, 12, 24];
const Y_MAX_INTERVALS = 4;

function yScale(maxValue) {
    if (maxValue <= 0) return { max: 1, stepSize: 0.25 };
    // Folga mínima: o número do pico já tem espaço próprio acima da área do
    // gráfico (layout.padding.top), então o teto só precisa não cortar o ponto.
    // Com mais folga, um pico de 2h 47m empurrava o eixo até 4h.
    const target = maxValue * 1.02;
    const stepSize = Y_STEPS_HOURS.find((step) => Math.ceil(target / step) <= Y_MAX_INTERVALS)
        || Y_STEPS_HOURS[Y_STEPS_HOURS.length - 1];
    return { max: Math.ceil(target / stepSize) * stepSize, stepSize };
}

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
 * O tooltip é HTML, e não o do canvas: ele reparte o ponto por sessão, em
 * barras da cor de cada serviço, e uma lista dessas precisa de teto de altura
 * e de rolagem — duas coisas que o canvas não dá. Ele vive em usageTooltip.js.
 */
export default function UsageChart({ data, isDaily, sessions }) {
    const canvasRef = useRef(null);

    // Por ref, e não por dependência do efeito: a lista costuma ser um array
    // novo a cada render (`[session]`), e como dependência ela remontaria o
    // gráfico inteiro a cada render.
    const sessionsRef = useRef(sessions);
    sessionsRef.current = sessions;

    // O tema, sim, é dependência: as cores abaixo saem dos tokens uma vez, e o
    // canvas não se repinta quando eles mudam. Sem isto, trocar de tema
    // deixava as linhas do tema anterior sobre o fundo novo.
    const theme = useAppliedTheme();

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
        const y = yScale(maxValue);

        const styles = getComputedStyle(document.documentElement);
        const token = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
        // A linha é texto do gráfico, não preenchimento: usa o tom que escreve
        // (no escuro, o Azul claro da marca, que se lê sobre o grafite).
        const accent = token('--ap-accent-strong', '#609efa');
        const accentRgb = token('--ap-accent-rgb', '96, 158, 250');
        const cardBg = token('--ap-bg-card', '#101318');
        const border = token('--ap-border', '#292e37');
        const fontBody = token('--ap-font-body', 'system-ui, sans-serif');

        const tooltip = createUsageTooltip({
            labels,
            data,
            getSessions: () => sessionsRef.current,
        });

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
                    // Monotônica: a curva suaviza sem passar abaixo nem acima
                    // dos pontos entre um dia e outro — não inventa um vale (ou
                    // um pico) que os dados não têm.
                    cubicInterpolationMode: 'monotone',
                    // A linha é o desenho; os pontos só marcam onde ela passa.
                    // Os comuns são miúdos — grandes, eles cortavam o traço a
                    // cada dia e o gráfico deixava de ler como uma linha. Só o
                    // pico ganha tamanho, porque é ele que leva o número.
                    // Numa série longa (mês, horas do dia) os comuns somem: lá
                    // eles encostariam uns nos outros; o hover ainda mostra.
                    pointRadius: (context) => {
                        if (context.dataIndex === peakIndex) return 4.5;
                        return values.length > 14 ? 0 : 2.5;
                    },
                    pointBorderWidth: (context) => (context.dataIndex === peakIndex ? 2 : 1.5),
                    // Miolo na cor do card: vazado, no escuro e no claro.
                    pointBackgroundColor: cardBg,
                    pointBorderColor: accent,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: cardBg,
                    pointHoverBorderColor: accent,
                    pointHoverBorderWidth: 2,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                // Duração zero em vez de `animation: false`: o desenho continua
                // aparecendo pronto, mas o `false` desligava junto a animação
                // do tooltip, que pulava de um ponto ao outro sem transição.
                animation: { duration: 0 },
                // Espaço em cima para o número do pico, e à direita para o
                // último ponto não encostar na borda.
                layout: { padding: { top: 22, left: 0, right: 6 } },
                plugins: {
                    legend: { display: false },
                    usagePeakLabel: {
                        index: peakIndex,
                        text: peakIndex >= 0 ? formatHours(maxValue) : '',
                        color: accent,
                        font: `600 12px ${fontBody}`,
                    },
                    tooltip: {
                        // Desenhar no canvas fica desligado: quem pinta é o
                        // elemento HTML abaixo.
                        enabled: false,
                        external: tooltip.external,
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { color: border },
                        ticks: {
                            color: token('--ap-text-muted', '#8e95a1'),
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
                        // Passos redondos (ver yScale). Sem uso nenhum, vai até 1h.
                        max: y.max,
                        // Eixo à esquerda e linhas de apoio tracejadas: dão a
                        // escala sem disputar com o traço do uso.
                        border: { display: true, color: border, dash: [3, 4] },
                        grid: { color: border, drawTicks: false },
                        ticks: {
                            color: token('--ap-text-muted', '#8e95a1'),
                            font: { size: 11 },
                            padding: 8,
                            stepSize: y.stepSize,
                            callback: (value) => (value === 0 ? '0h' : formatHours(value)),
                        },
                    },
                },
                interaction: { intersect: false, mode: 'index' },
            },
        });

        return () => {
            chart.destroy();
            tooltip.destroy();
        };
    }, [data, isDaily, theme]);

    return <canvas ref={canvasRef}></canvas>;
}
