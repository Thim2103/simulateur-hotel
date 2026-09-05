import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function RestaurantFinance() {
  const { finance, kpis, updateFinance } = useRestaurantSimulator();

  const updateRevenueValue = (index, value) => {
    const nextRevenue = [...finance.revenue];
    nextRevenue[index] = Number(value || 0);
    updateFinance({ revenue: nextRevenue });
  };

  const updateCostValue = (index, value) => {
    const nextCosts = [...finance.costs];
    nextCosts[index] = Number(value || 0);
    updateFinance({ costs: nextCosts });
  };

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

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-lg font-semibold mb-4">Paramètres financiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-medium">Taxes (%)</label>
            <input
              type="number"
              className="border rounded-md px-3 py-2"
              value={finance.taxes}
              onChange={(event) => updateFinance({ taxes: Number(event.target.value || 0) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium">Coûts fixes</label>
            <input
              type="number"
              className="border rounded-md px-3 py-2"
              value={finance.fixedCosts}
              onChange={(event) => updateFinance({ fixedCosts: Number(event.target.value || 0) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium">Loyer</label>
            <input
              type="number"
              className="border rounded-md px-3 py-2"
              value={finance.rent}
              onChange={(event) => updateFinance({ rent: Number(event.target.value || 0) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium">Salaire équipe</label>
            <input
              type="number"
              className="border rounded-md px-3 py-2"
              value={finance.payroll}
              onChange={(event) => updateFinance({ payroll: Number(event.target.value || 0) })}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-lg font-semibold mb-4">Évolution mensuelle</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {finance.months.map((month, index) => (
            <div key={month} className="border rounded-lg p-3 flex flex-col gap-2">
              <div className="font-medium">{month}</div>
              <div className="flex flex-col gap-2">
                <label className="text-sm">Revenu</label>
                <input
                  type="number"
                  className="border rounded-md px-3 py-2"
                  value={finance.revenue[index]}
                  onChange={(event) => updateRevenueValue(index, event.target.value)}
                />
                <label className="text-sm">Coût</label>
                <input
                  type="number"
                  className="border rounded-md px-3 py-2"
                  value={finance.costs[index]}
                  onChange={(event) => updateCostValue(index, event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
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
