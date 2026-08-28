import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import { occupationRate, adr, revpar } from "../lib/calculs/rm";


export default function Dashboard() {
  // Exemple de données (tu peux les remplacer plus tard)
const totalRooms = 100;
const occupiedRooms = 78;
const totalRevenueRooms = 11200;

// Calculs RM
const occ = occupationRate(occupiedRooms, totalRooms);
const adrValue = adr(totalRevenueRooms, occupiedRooms);
const revparValue = revpar(totalRevenueRooms, totalRooms);

  return (
    <div className="p-6 flex flex-col gap-6">

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Taux d’occupation" value={`${occ}%`} trend={2.1} />
        <KpiCard label="ADR" value={`${adrValue} €`} trend={1.3} />
        <KpiCard label="RevPAR" value={`${revparValue} €`} trend={4.2} />
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
