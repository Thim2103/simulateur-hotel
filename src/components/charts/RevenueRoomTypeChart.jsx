import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function RevenueRoomTypeChart({ revenueByRoomType }) {
  if (!revenueByRoomType) return null;

  const labels = ["Standard", "Deluxe", "Suite"];
  const values = [
    revenueByRoomType.standard ?? 0,
    revenueByRoomType.deluxe ?? 0,
    revenueByRoomType.suite ?? 0,
  ];

  const data = {
    labels,
    datasets: [
      {
        label: "Revenus (€)",
        data: values,
        backgroundColor: [
          "rgba(79, 70, 229, 0.7)",   // violet
          "rgba(16, 185, 129, 0.7)",  // vert
          "rgba(244, 114, 182, 0.7)", // rose
        ],
        borderColor: [
          "rgba(79, 70, 229, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(244, 114, 182, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => v + " €" },
      },
    },
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-3">Revenus par type de chambre</h3>
      <Bar data={data} options={options} />
    </div>
  );
}
