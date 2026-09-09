import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import BarChart from "../components/charts/BarChart";
import { useProEngine } from "../hooks/useProEngine";
import { overallAuditScore } from "../lib/pro/proAudits";

const DEPARTMENT_LABEL = { finance: "Finance", rm: "RM", fb: "F&B", staff: "Staff", esg: "ESG", clients: "Clients" };
const GRADE_BADGE = { A: "success", B: "success", C: "info", D: "warning", F: "danger" };

// Route: /pro/audits -- audits professionnels par département (Finance,
// RM, F&B, Staff, ESG, Clients), avec recommandations. Built on the same
// useProEngine.js as ProDashboard.jsx.
export default function ProAudits() {
  const { proState, error, loadProState } = useProEngine();

  useEffect(() => {
    loadProState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!proState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Mode Professionnel Solo</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Audits</h1>
            <p className="mt-1 text-sm text-slate-500">Aucun programme professionnel en cours.</p>
          </div>
        </header>
        <Card><Link to="/pro"><Button>Créer mon programme professionnel</Button></Link></Card>
      </div>
    );
  }

  const allAudits = proState.audits || [];
  const latestMonth = allAudits.length ? Math.max(...allAudits.map((audit) => audit.month)) : null;
  const latestAudits = allAudits.filter((audit) => audit.month === latestMonth);
  const overall = overallAuditScore(latestAudits);

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Mode Professionnel Solo</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Audits professionnels</h1>
          <p className="mt-1 text-sm text-slate-500">Audits par département -- mois {proState.month}/{proState.horizonMonths}.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/pro/dashboard"><Button variant="outline">← Tableau de bord</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {latestAudits.length === 0 ? (
        <Card><p className="text-sm text-slate-500">Jouez un mois pour générer les audits professionnels.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard label="Score d'audit global" value={overall !== null ? `${overall}/100` : "—"} trend={overall < 55 ? -1 : undefined} />
            <KpiCard label="Départements audités" value={`${latestAudits.length}`} />
          </div>

          <BarChart title="Score par département" labels={latestAudits.map((audit) => DEPARTMENT_LABEL[audit.department] || audit.department)} data={latestAudits.map((audit) => audit.score)} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {latestAudits.map((audit) => (
              <Card key={audit.department} title={DEPARTMENT_LABEL[audit.department] || audit.department}>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-slate-900">{audit.score}/100</span>
                  <Badge type={GRADE_BADGE[audit.grade] || "info"}>{audit.grade}</Badge>
                </div>
                <ul className="mt-3 flex flex-col gap-1 text-xs text-slate-600">
                  {audit.findings.map((finding, index) => (
                    <li key={index}>• {finding}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
