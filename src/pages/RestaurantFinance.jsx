import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantFinance() {
  const { finance, kpis } = useRestaurantSimulator();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Revenu mensuel" value={`${kpis.totalMonthlyRevenue.toLocaleString()} €`} trend={8.4} />
        <KpiCard label="Coût mensuel" value={`${kpis.totalMonthlyCosts.toLocaleString()} €`} trend={3.1} />
        <KpiCard label="Profit net" value={`${kpis.operatingProfit.toLocaleString()} €`} trend={5.3} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <LineChart
          title="Revenus du restaurant"
          labels={finance.months}
          data={finance.revenue}
        />

        <BarChart
          title="Coûts de gestion"
          labels={finance.months}
          data={finance.costs}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4">Synthèse financière</h3>
        <Table columns={["Poste", "Montant", "Détail"]}>
          <TableRow>
            <td className="px-4 py-2">Salaire équipe</td>
            <td className="px-4 py-2">{kpis.payroll.toLocaleString()} €</td>
            <td className="px-4 py-2">Personnel</td>
          </TableRow>
          <TableRow>
            <td className="px-4 py-2">Loyer & charges</td>
            <td className="px-4 py-2">{finance.rent.toLocaleString()} €</td>
            <td className="px-4 py-2">Fixes</td>
          </TableRow>
          <TableRow>
            <td className="px-4 py-2">Marge brute</td>
            <td className="px-4 py-2">{kpis.grossMargin.toLocaleString()} €</td>
            <td className="px-4 py-2">Revenus - coûts achat</td>
          </TableRow>
        </Table>
      </div>
    </div>
  );
}
