import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import DailyReportModal from "../components/DailyReportModal";
import { occupationRate, adr, revpar, integratedHotelReputation } from "../lib/calculs/rm";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";
import { useHotelSimulator } from "../hooks/useHotelSimulator";
import { useDailyCycle } from "../hooks/useDailyCycle";

export default function Dashboard() {
  const { kpis: restaurantKpis, reload: reloadRestaurant } = useRestaurantSimulator();
  const { kpis: hotelKpis, advanceSimulation, reload: reloadHotel } = useHotelSimulator();
  const {
    advanceDay,
    dailyReport,
    dismissReport,
    isRunning: isAdvancingDay,
    error: dailyCycleError,
  } = useDailyCycle({ reloadHotel, reloadRestaurant });
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
      <header className="page-header">
        <div>
          <p className="eyebrow">Vue d'ensemble</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Tableau de bord</h1>
          <p className="mt-1 text-sm text-slate-500">Suivez la performance intégrée de l'hôtel et du restaurant.</p>
        </div>
      </header>

      <Card className="border-cyan-100 bg-gradient-to-br from-white to-cyan-50/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Cycle de simulation</p>
            <p className="mt-1 text-xl font-bold text-slate-900">Jour {hotelKpis.cycles}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => advanceSimulation(1)}>Avancer d'un cycle</Button>
            <Button onClick={() => { advanceDay().catch(() => undefined); }} disabled={isAdvancingDay}>
              {isAdvancingDay ? "Calcul en cours…" : "Jour suivant"}
            </Button>
          </div>
        </div>
        {dailyCycleError && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            Impossible de calculer la journée : {dailyCycleError.message}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Taux d’occupation intégré" value={`${integratedOccupancy}%`} trend={2.1} />
        <KpiCard label="ADR" value={`${adrValue} €`} trend={1.3} />
        <KpiCard label="RevPAR" value={`${revparValue} €`} trend={4.2} />
        <KpiCard label="Réputation hôtel" value={`${reputation}/100`} trend={reputation >= 75 ? 3.4 : -1.2} />
        <KpiCard label="Satisfaction restaurant" value={`${restaurantKpis.customerSatisfaction.toFixed(1)}/5`} trend={2.5} />
        <KpiCard label="Demande restaurant" value={`${restaurantKpis.demand}%`} trend={1.8} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Revenu hôtel (simulé)" value={`${hotelKpis.simulationRevenue.toLocaleString()} €`} trend={3.6} />
        <KpiCard label="Demande hôtel" value={`${hotelKpis.demand}%`} trend={2.4} />
        <KpiCard label="Satisfaction / réputation hôtel" value={`${hotelKpis.satisfaction.toFixed(1)}/5 · ${hotelKpis.reputation.toFixed(0)}/100`} trend={hotelKpis.reputation >= 70 ? 2.9 : -1.4} />
        <KpiCard label="ROI marketing" value={`${hotelKpis.marketingRoi.toFixed(2)}x`} trend={hotelKpis.marketingRoi >= 1 ? 3.2 : -2.1} />
        <KpiCard label="Score de durabilité (ESG)" value={`${hotelKpis.sustainabilityScore.toFixed(0)}%`} trend={hotelKpis.sustainabilityScore >= 60 ? 2.2 : -1.1} />
        {hotelKpis.activeEstablishments > 1 && (
          <KpiCard label="Chambres réseau (multi-sites)" value={`${hotelKpis.aggregateRoomCount}`} trend={1.6} />
        )}
      </div>

      {hotelKpis.activeEstablishments > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label="Revenu réseau agrégé" value={`${hotelKpis.aggregateRevenue.toLocaleString()} €`} trend={2.8} />
          <KpiCard label="Établissements actifs" value={`${hotelKpis.activeEstablishments}`} trend={0} />
          <KpiCard label="Mutualisation du personnel" value={`${hotelKpis.sharedStaffPoolUtilization}%`} trend={1.2} />
        </div>
      )}

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

      {dailyReport && (
        <BarChart
          title={`Revenus, dépenses et profit du jour — ${dailyReport.date}`}
          labels={["Revenu hôtel", "Revenu restaurant", "Dépenses", "Profit"]}
          data={[dailyReport.hotelRevenue.netRevenue, dailyReport.restaurantRevenue.netRevenue, dailyReport.expenses.total, dailyReport.profit]}
        />
      )}

      <DailyReportModal report={dailyReport} onClose={dismissReport} />
    </div>
  );
}

