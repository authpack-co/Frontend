import {
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    Legend,
    LinearScale,
    Tooltip,
} from 'chart.js';
import { useEffect, useRef } from 'react';

// Só o que este gráfico usa. O de uso do pacote registra os seus (linha,
// preenchimento); registrar componentes duas vezes é inofensivo.
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

/** Receita por período, em barras. */
export default function RevenueChart({ rows }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const accent = getComputedStyle(document.documentElement)
            .getPropertyValue('--ap-accent-strong').trim() || '#2563eb';

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: rows.map((row) => row.bucket),
                datasets: [{
                    label: 'Assinaturas',
                    // O servidor responde em centavos; o eixo fala em reais.
                    data: rows.map((row) => Number(row.total_cents) / 100),
                    backgroundColor: accent,
                    borderRadius: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false } },
                    y: { ticks: { callback: (value) => `R$ ${value}` } },
                },
                plugins: { legend: { position: 'bottom' } },
            },
        });

        return () => chart.destroy();
    }, [rows]);

    return <canvas ref={canvasRef}></canvas>;
}
