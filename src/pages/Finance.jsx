import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useHotelSimulator } from "../hooks/useHotelSimulator";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function Finance() {
  const { finance, kpis, updateFinance } = useHotelSimulator();
  const { kpis: restaurantKpis } = useRestaurantSimulator();
  const monthLabels = Array.isArray(finance.months) ? finance.months : Object.keys(finance.months || {});
  // taxes can be a per-month array from legacy/malformed data; the input only edits a single rate
  const taxesValue = Array.isArray(finance.taxes) ? Number(finance.taxes[0] || 0) : Number(finance.taxes || 0);

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

  const departments = [
    { name: "Chambres", revenue: kpis.totalMonthlyRevenue, expenses: kpis.totalMonthlyCosts },
    { name: "Restaurant", revenue: restaurantKpis.totalMonthlyRevenue, expenses: restaurantKpis.totalMonthlyCosts },
  ];
  const totalRevenue = departments.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = departments.reduce((sum, d) => sum + d.expenses, 0);
  const gop = totalRevenue - totalExpenses;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Performance financière</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Finance</h1>
          <p className="mt-1 text-sm text-slate-500">Vue consolidée des revenus, dépenses et profit par département.</p>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Revenus totaux" value={`${totalRevenue.toLocaleString()} €`} trend={5.2} />
        <KpiCard label="Dépenses totales" value={`${totalExpenses.toLocaleString()} €`} trend={2.1} />
        <KpiCard label="GOP (Profit)" value={`${gop.toLocaleString()} €`} trend={3.4} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <LineChart
          title="Revenus mensuels (hôtel)"
          labels={monthLabels}
          data={finance.revenue}
        />
        <BarChart
          title="Dépenses mensuelles (hôtel)"
          labels={monthLabels}
          data={finance.costs}
        />
      </div>

      <Card title="Paramètres financiers">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Input
            label="Taxes (%)"
            type="number"
            value={taxesValue}
            onChange={(event) => updateFinance({ taxes: Number(event.target.value || 0) })}
          />
          <Input
            label="Coûts fixes"
            type="number"
            value={finance.fixedCosts}
            onChange={(event) => updateFinance({ fixedCosts: Number(event.target.value || 0) })}
          />
          <Input
            label="Masse salariale"
            type="number"
            value={finance.payroll}
            onChange={(event) => updateFinance({ payroll: Number(event.target.value || 0) })}
          />
        </div>
      </Card>

      <Card title="Évolution mensuelle">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {monthLabels.map((month, index) => (
            <div key={month} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 transition-colors duration-150 hover:border-slate-300">
              <div className="font-medium text-slate-900">{month}</div>
              <div className="flex flex-col gap-2">
                <Input
                  label="Revenu"
                  type="number"
                  value={finance.revenue[index]}
                  onChange={(event) => updateRevenueValue(index, event.target.value)}
                />
                <Input
                  label="Coût"
                  type="number"
                  value={finance.costs[index]}
                  onChange={(event) => updateCostValue(index, event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Department Table */}
      <Table columns={["Département", "Revenus", "Dépenses", "Profit"]}>
        {departments.map((d) => (
          <TableRow key={d.name}>
            <td className="px-4 py-2">{d.name}</td>
            <td className="px-4 py-2">{d.revenue.toLocaleString()} €</td>
            <td className="px-4 py-2">{d.expenses.toLocaleString()} €</td>
            <td className="px-4 py-2">{(d.revenue - d.expenses).toLocaleString()} €</td>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}

