import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import Table from "../components/tables/Table";
import TableRow from "../components/tables/TableRow";

const financeData = {
  revenue: [12000, 15000, 18000, 20000, 22000, 25000],
  expenses: [8000, 9000, 9500, 10000, 11000, 12000],
  months: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin"],
};

const departments = [
  { name: "Chambres", revenue: 25000, expenses: 12000 },
  { name: "Restaurant", revenue: 15000, expenses: 9000 },
  { name: "Spa", revenue: 8000, expenses: 4000 },
  { name: "Bar", revenue: 6000, expenses: 3500 },
];

export default function Finance() {
  const totalRevenue = departments.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = departments.reduce((sum, d) => sum + d.expenses, 0);
  const gop = totalRevenue - totalExpenses;

  return (
    <div className="p-6 flex flex-col gap-6">

      {/* Header */}
      <h1 className="text-2xl font-bold">Finance</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Revenus totaux" value={`${totalRevenue} €`} trend={5.2} />
        <KpiCard label="Dépenses totales" value={`${totalExpenses} €`} trend={2.1} />
        <KpiCard label="GOP (Profit)" value={`${gop} €`} trend={3.4} />
      </div>

      {/* Revenue Chart */}
      <LineChart
        title="Revenus mensuels"
        labels={financeData.months}
        data={financeData.revenue}
      />

      {/* Expenses Chart */}
      <BarChart
        title="Dépenses mensuelles"
        labels={financeData.months}
        data={financeData.expenses}
      />

      {/* Department Table */}
      <Table columns={["Département", "Revenus", "Dépenses", "Profit"]}>
        {departments.map((d, index) => (
          <TableRow key={index}>
            <td className="px-4 py-2">{d.name}</td>
            <td className="px-4 py-2">{d.revenue} €</td>
            <td className="px-4 py-2">{d.expenses} €</td>
            <td className="px-4 py-2">{d.revenue - d.expenses} €</td>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}
