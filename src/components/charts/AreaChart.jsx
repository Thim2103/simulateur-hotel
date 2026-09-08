import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import Card from "../ui/Card";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

// Same as LineChart.jsx, with the area under the curve filled in --
// FinanceDashboard.jsx's cash-flow chart (see the Refonte Finance
// request's section 4).
export default function AreaChart({ labels, data, title }) {
  const chartData = {
    labels,
    datasets: [
      {
        label: title,
        data,
        borderColor: "#0d9488",
        backgroundColor: "rgba(13, 148, 136, 0.25)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <Card title={title}>
      <div className="h-64"><Line data={chartData} /></div>
    </Card>
  );
}
