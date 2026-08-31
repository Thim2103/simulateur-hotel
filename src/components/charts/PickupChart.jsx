import React from "react";
import { Line } from "react-chartjs-2";

export default function PickupChart({ pickup }) {
  if (!pickup) return null;

  const labels = Object.keys(pickup);
  const values = Object.values(pickup);

  const data = {
    labels,
    datasets: [
      {
        label: "Pick-up (réservations créées)",
        data: values,
        borderColor: "#4F46E5",
        backgroundColor: "rgba(79, 70, 229, 0.2)",
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-3">Pick-up (créations de réservations)</h3>
      <Line data={data} options={options} />
    </div>
  );
}
