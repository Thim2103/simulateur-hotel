import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import { occupationRate, adr, revpar, integratedHotelReputation } from "../lib/calculs/rm";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

export default function Dashboard() {
  const { kpis: restaurantKpis } = useRestaurantSimulator();
  const totalRooms = 100;
  const occupiedRooms = 78;
  const totalRevenueRooms = 11200;

  const rooms = Array.from({ length: totalRooms }, (_, i) => ({
    id: i + 1,
  }));

  const reservations = Array.from({ length: occupiedRooms }, (_, i) => ({
    id: i + 1,
    status: "confirmée",
    arrival: "2026-08-01",
    departure: "2026-08-02",
    price: totalRevenueRooms / occupiedRooms,
  }));

  const occ = occupationRate(rooms, reservations);
  const adrValue = adr(reservations);
  const revparValue = revpar(rooms, reservations);
  const integratedOccupancy = Math.round(Math.max(0, Math.min(100, occ + (restaurantKpis.demand - 50) * 0.1)));
  const reputation = integratedHotelReputation(restaurantKpis);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Taux d’occupation intégré" value={`${integratedOccupancy}%`} trend={2.1} />
        <KpiCard label="ADR" value={`${adrValue} €`} trend={1.3} />
        <KpiCard label="RevPAR" value={`${revparValue} €`} trend={4.2} />
        <KpiCard label="Réputation hôtel" value={`${reputation}/100`} trend={reputation >= 75 ? 3.4 : -1.2} />
        <KpiCard label="Satisfaction restaurant" value={`${restaurantKpis.customerSatisfaction.toFixed(1)}/5`} trend={2.5} />
      </div>

      <LineChart
        title="Occupation (7 derniers jours)"
        labels={["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]}
        data={[integratedOccupancy, 80, 78, 85, 90, 88, 82]}
      />

      <BarChart
        title="Revenus par département"
        labels={["Chambres", "Restaurant", "Spa", "Bar"]}
        data={[totalRevenueRooms, restaurantKpis.restaurantRevenue, 5000, 3000]}
      />
    </div>
  );
}
