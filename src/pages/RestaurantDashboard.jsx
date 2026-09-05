import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantDashboard() {
  const { finance, menu, kpis } = useRestaurantSimulator();

  const menuRevenue = menu.reduce((sum, item) => sum + item.price * item.sales, 0);
  const categoryMix = [
    menu.filter((item) => item.category === "Plat").reduce((sum, item) => sum + item.sales, 0),
    menu.filter((item) => item.category === "Entrée").reduce((sum, item) => sum + item.sales, 0),
    menu.filter((item) => item.category === "Dessert").reduce((sum, item) => sum + item.sales, 0),
    menu.filter((item) => item.category === "Boisson").reduce((sum, item) => sum + item.sales, 0),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Utilisation" value={`${kpis.utilization}%`} trend={3.2} />
        <KpiCard label="Ticket moyen" value={`${kpis.avgTicket.toFixed(2)} €`} trend={2.1} />
        <KpiCard label="Marge brute" value={`${kpis.grossMargin.toLocaleString()} €`} trend={6.4} />
        <KpiCard label="Score opérationnel" value={`${kpis.score}/100`} trend={1.9} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <LineChart
          title="Évolution du chiffre d'affaires"
          labels={finance.months}
          data={finance.revenue}
        />

        <BarChart
          title="Mix produits"
          labels={["Plats", "Entrées", "Desserts", "Boissons"]}
          data={categoryMix}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-500">Revenu menu estimé</div>
          <div className="text-2xl font-bold">{menuRevenue.toLocaleString()} €</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-500">Niveau de stock</div>
          <div className="text-2xl font-bold">84%</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-500">Satisfaction clients</div>
          <div className="text-2xl font-bold">4.7/5</div>
        </div>
      </div>
    </div>
  );
}
