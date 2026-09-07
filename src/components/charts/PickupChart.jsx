import React from "react";
import { Line } from "react-chartjs-2";
import Card from "../ui/Card";

export default function PickupChart({ pickup, pickupCurve }) {
  if (!pickup) return null;

  const curve = pickupCurve?.length ? pickupCurve : Object.keys(pickup).map((date) => ({ date, value: pickup[date], delta: 0 }));
  const labels = curve.map((point) => point.date);

  const data = {
    labels,
    datasets: [
      {
        label: "Pick-up (réservations créées)",
        data: curve.map((point) => point.value),
        borderColor: "#4F46E5",
        backgroundColor: "rgba(79, 70, 229, 0.2)",
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 4,
      },
      {
        label: "Delta quotidien",
        data: curve.map((point) => point.delta),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.2)",
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3,
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
    <Card title="Pick-up (créations de réservations)">
      <div className="h-64"><Line data={data} options={options} /></div>
    </Card>
  );
}
