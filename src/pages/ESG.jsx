import KpiCard from "../components/charts/KpiCard";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useHotelSimulator } from "../hooks/useHotelSimulator";

const metrics = [
  ["energyConsumption", "Consommation énergétique"],
  ["waterUsage", "Consommation d'eau"],
  ["wasteReduction", "Réduction des déchets"],
  ["sustainabilityScore", "Score de durabilité"],
];

export default function ESG() {
  const { esg, kpis, updateEsg } = useHotelSimulator();

  const updateCertification = (value) => {
    const certifications = esg.certifications.includes(value)
      ? esg.certifications.filter((item) => item !== value)
      : [...esg.certifications, value];
    updateEsg({ certifications });
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Responsabilité environnementale</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">ESG</h1>
          <p className="mt-1 text-sm text-slate-500">Pilotez la durabilité et les engagements de l'établissement.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Score de durabilité global" value={`${kpis.sustainabilityScore.toFixed(0)}%`} trend={1.8} />
        <KpiCard label="Investissement mensuel" value={`${Number(esg.monthlyInvestment).toLocaleString()} €`} trend={0.6} />
        <KpiCard label="Certifications" value={`${esg.certifications.length}`} trend={0.4} />
      </div>

      <Card title="Feuille de route ESG">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {metrics.map(([key, label]) => (
            <label key={key} className="flex flex-col gap-2">
              <div className="flex justify-between text-sm font-semibold text-slate-700"><span>{label}</span><span>{esg[key]}%</span></div>
              <input type="range" min="0" max="100" value={esg[key]} onChange={(event) => updateEsg({ [key]: Number(event.target.value) })} className="accent-cyan-700" />
            </label>
          ))}
          <Input label="Investissement mensuel" type="number" min="0" value={esg.monthlyInvestment} onChange={(event) => updateEsg({ monthlyInvestment: Number(event.target.value || 0) })} />
        </div>
      </Card>

      <Card title="Engagements vérifiables">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {["Écolabel Européen", "Green Key", "Plan énergie renouvelable"].map((certification) => (
            <label key={certification} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700 transition-colors duration-150 hover:border-cyan-300 hover:bg-cyan-50/40"><input type="checkbox" checked={esg.certifications.includes(certification)} onChange={() => updateCertification(certification)} className="accent-cyan-700" />{certification}</label>
          ))}
        </div>
      </Card>
    </div>
  );
}
