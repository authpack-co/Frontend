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

Chart.register(
    CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Tooltip
);

/**
 * Gráfico de uso do pacote.
 *
 * Duas visões, decididas por `isDaily`: horas por dia num período, ou horas
 * por hora no dia de hoje.
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

        // Na visão por período o rótulo é "DD/MM" — o ano não cabe e não
        // acrescenta nada num gráfico de 30 dias.
        const displayLabels = isDaily ? labels : labels.map((label) => {
            const parts = label.split('/');
            return parts.length === 3 ? `${parts[0]}/${parts[1]}` : label;
        });

        // "Sem registro" chega como -1 em dados antigos; no gráfico isso é 0,
        // para o ponto ficar na linha de base e não abaixo dela.
        const values = labels.map((label) => Math.max(0, data[label].hours || 0));
        const maxValue = values.length ? Math.max(...values) : 0;

        const styles = getComputedStyle(document.documentElement);
        const token = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
        const accent = token('--ap-accent', '#f97316');
        const accentRgb = token('--ap-accent-rgb', '249, 115, 22');

        const chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: displayLabels,
                datasets: [{
                    data: values,
                    borderColor: accent,
                    backgroundColor(context) {
                        const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 180);
                        gradient.addColorStop(0, `rgba(${accentRgb}, 0.28)`);
                        gradient.addColorStop(1, `rgba(${accentRgb}, 0)`);
                        return gradient;
                    },
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: accent,
                    pointBorderColor: token('--ap-bg-card', '#ffffff'),
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: token('--ap-accent-strong', '#fb923c'),
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
                plugins: {
                    legend: { display: false },
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
                        backgroundColor: token('--ap-bg-card', '#ffffff'),
                        borderColor: token('--ap-border', '#e6e5e2'),
                        borderWidth: 1,
                        titleColor: token('--ap-text-primary', '#1a1a1c'),
                        bodyColor: token('--ap-text-secondary', '#44444a'),
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
                        ticks: {
                            color: token('--ap-text-muted', '#6b7280'),
                            font: { size: 11 },
                            maxRotation: isDaily ? 45 : 0,
                            minRotation: isDaily ? 45 : 0,
                        },
                    },
                    y: {
                        beginAtZero: true,
                        // Sem uso nenhum o eixo precisa de um teto, senão o
                        // Chart.js inventa uma escala de 0 a 1 "unidades".
                        max: maxValue === 0 ? 1 : maxValue * 1.2,
                        grid: { color: token('--ap-border', '#e6e5e2') },
                        ticks: {
                            color: token('--ap-text-muted', '#6b7280'),
                            callback: (value) => formatHours(value),
                        },
                    },
                },
                interaction: { intersect: false, mode: 'index' },
            },
        });

        return () => chart.destroy();
    }, [data, isDaily]);

    return <canvas ref={canvasRef}></canvas>;
}
