import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function BarChart({ labels, data, title }) {
  const chartData = {
    labels,
    datasets: [
      {
        label: title,
        data,
        backgroundColor: "#10b981",
      },
    ],
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>
      <div className="h-64"><Bar data={chartData} /></div>
    </div>
  );
}
