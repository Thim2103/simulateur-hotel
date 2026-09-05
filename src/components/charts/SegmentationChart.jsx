import React from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SegmentationChart({ segmentation }) {
  if (!segmentation) return null;

  const labels = ["Corporate", "Loisir", "OTA", "Groupes"];
  const values = [
    segmentation.corporate ?? segmentation.business ?? 0,
    segmentation.leisure ?? segmentation.loisir ?? 0,
    segmentation.ota ?? 0,
    segmentation.groups ?? segmentation.groupes ?? 0,
  ];

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: [
          "rgba(79, 70, 229, 0.7)",
          "rgba(16, 185, 129, 0.7)",
          "rgba(244, 114, 182, 0.7)",
          "rgba(245, 158, 11, 0.7)",
        ],
        borderColor: [
          "rgba(79, 70, 229, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(244, 114, 182, 1)",
          "rgba(245, 158, 11, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: { font: { size: 14 } },
      },
    },
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-3">Segmentation des réservations</h3>
      <Pie data={data} options={options} />
    </div>
  );
}
