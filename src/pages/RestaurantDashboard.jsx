import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

const summaryItems = [
  ["Revenu menu estimé", (value) => `${value.toLocaleString()} €`],
  ["Niveau de stock", () => "84%"],
];

export default function RestaurantDashboard() {
  const { finance, menu, kpis, advanceSimulation, simulation, progression } = useRestaurantSimulator();

  const menuRevenue = menu.reduce((sum, item) => sum + item.price * item.sales, 0);
  const categoryMix = [
    menu.filter((item) => item.category === "Plat").reduce((sum, item) => sum + item.sales, 0),
    menu.filter((item) => item.category === "Entrée").reduce((sum, item) => sum + item.sales, 0),
    menu.filter((item) => item.category === "Dessert").reduce((sum, item) => sum + item.sales, 0),
    menu.filter((item) => item.category === "Boisson").reduce((sum, item) => sum + item.sales, 0),
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Restaurant simulator</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Tableau de bord opérationnel</h1>
          <p className="mt-1 text-sm text-slate-500">Suivez l'activité, la rentabilité et la qualité de service de votre établissement.</p>
        </div>
        <div className="rounded-lg bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">Jour {simulation.day}</div>
      </header>

      <Card className="border-cyan-100 bg-gradient-to-br from-white to-cyan-50/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Cycle de simulation</p>
            <p className="mt-1 text-xl font-bold text-slate-900">Prêt pour la prochaine décision</p>
            <p className="mt-1 text-sm text-slate-500">Faites avancer la journée et observez l'impact sur vos indicateurs.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => advanceSimulation(1)}>Jour suivant</Button>
            <Button variant="secondary" onClick={() => advanceSimulation(7)}>Simuler 7 jours</Button>
          </div>
        </div>
      </Card>

      <section aria-labelledby="restaurant-kpis" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <h2 id="restaurant-kpis" className="text-base font-semibold text-slate-900">Indicateurs clés</h2>
          <span className="text-xs text-slate-500">Évolution vs période précédente</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Utilisation" value={`${kpis.utilization}%`} trend={3.2} />
          <KpiCard label="Ticket moyen" value={`${kpis.avgTicket.toFixed(2)} €`} trend={2.1} />
          <KpiCard label="Marge brute" value={`${kpis.grossMargin.toLocaleString()} €`} trend={6.4} />
          <KpiCard label="Score opérationnel" value={`${kpis.score}/100`} trend={1.9} />
        </div>
      </section>

      <section aria-labelledby="restaurant-performance" className="flex flex-col gap-3">
        <h2 id="restaurant-performance" className="text-base font-semibold text-slate-900">Performance de l'établissement</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Demande" value={`${kpis.demand}%`} trend={2.7} />
          <KpiCard label="Productivité RH" value={`${kpis.staffProductivity}%`} trend={1.5} />
          <KpiCard label="Satisfaction" value={`${kpis.customerSatisfaction.toFixed(2)}/5`} trend={1.1} />
          <KpiCard label="Popularité menu" value={`${kpis.menuPopularity}%`} trend={2.4} />
          <KpiCard label="ESG" value={`${kpis.esgImpact}%`} trend={0.8} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <LineChart title="Évolution du chiffre d'affaires" labels={finance.months} data={finance.revenue} />
        <BarChart title="Mix produits" labels={["Plats", "Entrées", "Desserts", "Boissons"]} data={categoryMix} />
      </div>

      <section aria-labelledby="restaurant-alerts" className="flex flex-col gap-3">
        <h2 id="restaurant-alerts" className="text-base font-semibold text-slate-900">Points de vigilance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Heures de pointe" value={kpis.rushHour} trend={0} />
          <KpiCard label="Réclamations" value={`${kpis.complaints}`} trend={-1.4} />
          <KpiCard label="Maintenance" value={`${kpis.maintenanceRisk}%`} trend={-0.9} />
          <KpiCard label="Profit simulé" value={`${kpis.simulationProfit.toLocaleString()} €`} trend={3.6} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {summaryItems.map(([label, formatValue], index) => (
          <Card key={label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{formatValue(index === 0 ? menuRevenue : null)}</p>
          </Card>
        ))}
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Satisfaction clients</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{kpis.customerSatisfaction.toFixed(2)}/5</p>
        </Card>
      </div>

      <Card className="bg-slate-900 text-white hover:shadow-sm">
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-300">
          <span>Cycles exécutés: <strong className="text-white">{progression.cycles}</strong></span>
          <span>XP: <strong className="text-white">{progression.xp}</strong></span>
          <span>Établissements actifs: <strong className="text-white">{kpis.activeEstablishments}</strong></span>
        </div>
      </Card>
    </div>
  );
}
