import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";

export default function Dashboard() {
  return (
    <div className="p-6 flex flex-col gap-6">

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Taux d’occupation" value="78%" trend={2.1} />
        <KpiCard label="RevPAR" value="112€" trend={4.2} />
        <KpiCard label="ADR" value="145€" trend={1.3} />
      </div>

      {/* Courbe */}
      <LineChart
        title="Occupation (7 derniers jours)"
        labels={["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]}
        data={[72, 80, 78, 85, 90, 88, 82]}
      />

      {/* Bar chart */}
      <BarChart
        title="Revenus par département"
        labels={["Chambres", "Restaurant", "Spa", "Bar"]}
        data={[12000, 8000, 5000, 3000]}
      />
    </div>
  );
}
