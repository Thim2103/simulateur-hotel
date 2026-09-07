import React from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";
import Card from "../ui/Card";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function HeatmapOccupation({ heatmap }) {
  if (!heatmap) return null;

  const entries = Object.entries(heatmap).map(([date, value]) => ({
    date,
    value,
  }));

  const labels = entries.map((e) => e.date);
  const values = entries.map((e) => e.value);

  // Couleur dynamique selon le niveau d’occupation
  const backgroundColors = values.map((v) => {
    if (v === 0) return "rgba(229, 231, 235, 1)"; // gris clair
    if (v < 10) return "rgba(147, 197, 253, 1)"; // bleu clair
    if (v < 20) return "rgba(59, 130, 246, 1)"; // bleu moyen
    return "rgba(30, 64, 175, 1)"; // bleu foncé
  });

  const data = {
    labels,
    datasets: [
      {
        label: "Occupation",
        data: values,
        backgroundColor: backgroundColors,
        borderWidth: 0,
        barPercentage: 1,
        categoryPercentage: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (ctx) => ctx[0].label,
          label: (ctx) => `${ctx.raw} chambres occupées`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 90, minRotation: 45 },
      },
      y: {
        display: false,
      },
    },
  };

  return (
    <Card title="Heatmap d’occupation">
      <div className="overflow-x-auto"><Bar data={data} options={options} /></div>
    </Card>
  );
}
