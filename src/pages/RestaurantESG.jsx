import KpiCard from "../components/charts/KpiCard";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

const metrics = [
  ["wasteReduction", "Réduction des déchets"],
  ["localSourcing", "Approvisionnement local"],
  ["energyEfficiency", "Efficacité énergétique"],
  ["staffWellbeing", "Bien-être de l'équipe"],
];

export default function RestaurantESG() {
  const { esg, kpis, updateEsg } = useRestaurantSimulator();

  const updateCertification = (value) => {
    const certifications = esg.certifications.includes(value)
      ? esg.certifications.filter((item) => item !== value)
      : [...esg.certifications, value];
    updateEsg({ certifications });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Impact ESG" value={`${kpis.esgImpact}%`} trend={1.8} />
        <KpiCard label="Maturité ESG" value={`${kpis.esgReadiness}%`} trend={2.1} />
        <KpiCard label="Investissement mensuel" value={`${Number(esg.monthlyInvestment).toLocaleString()} €`} trend={0.6} />
      </div>

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold mb-4">Feuille de route ESG</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {metrics.map(([key, label]) => (
            <label key={key} className="flex flex-col gap-2">
              <div className="flex justify-between"><span className="font-medium">{label}</span><span>{esg[key]}%</span></div>
              <input type="range" min="0" max="100" value={esg[key]} onChange={(event) => updateEsg({ [key]: Number(event.target.value) })} />
            </label>
          ))}
          <label className="flex flex-col gap-1"><span className="font-medium">Investissement mensuel</span><input type="number" min="0" className="border rounded-md px-3 py-2" value={esg.monthlyInvestment} onChange={(event) => updateEsg({ monthlyInvestment: Number(event.target.value || 0) })} /></label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold mb-4">Engagements vérifiables</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {["Label anti-gaspillage", "Fournisseur local", "Plan énergie"].map((certification) => (
            <label key={certification} className="border rounded-lg p-3 flex items-center gap-2"><input type="checkbox" checked={esg.certifications.includes(certification)} onChange={() => updateCertification(certification)} />{certification}</label>
          ))}
        </div>
      </section>
    </div>
  );
}
