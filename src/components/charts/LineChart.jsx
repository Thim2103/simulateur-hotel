import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

export default function LineChart({ labels, data, title }) {
  const chartData = {
    labels,
    datasets: [
      {
        label: title,
        data,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.2)",
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>
      <div className="h-64"><Line data={chartData} /></div>
    </div>
  );
}
