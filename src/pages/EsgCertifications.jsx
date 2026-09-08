import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useEsgEngine } from "../hooks/useEsgEngine";

// "Liste des certifications / progression / actions nécessaires / impact
// sur réputation et finances" (section 4) -- reads
// lib/esg/esgCertifications.js's CERTIFICATION_CATALOG progress against
// the current EsgState, and lets the player pursue the next eligible one
// straight from here (same "obtenir-certification" action
// EsgDashboard.jsx's Actions ESG section exposes).
export default function EsgCertifications() {
  const { esgState, isRunning, error, loadEsgState, getCertifications, applyEsgAction } = useEsgEngine();

  useEffect(() => {
    loadEsgState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const certifications = getCertifications();

  const handleObtain = async (certificationId) => {
    try {
      await applyEsgAction("obtenir-certification", { certificationId });
    } catch {
      // error surfaced via `error`.
    }
  };

  if (isRunning && !esgState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des certifications…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">ESG</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Certifications</h1>
          <p className="mt-1 text-sm text-slate-500">Progression, conditions à remplir et impact sur réputation et finances.</p>
        </div>
        <Link to="/esg"><Button variant="outline">← Retour</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!esgState ? (
        <Card><p className="text-sm text-slate-500">Aucune donnée ESG pour le moment. Visitez la page ESG pour démarrer un cycle.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {certifications.map((certification) => (
            <Card key={certification.id} title={certification.name}>
              <div className="flex flex-col gap-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{certification.description}</span>
                  <Badge type={certification.obtained ? "success" : certification.eligible ? "info" : "warning"}>
                    {certification.obtained ? "Obtenue" : certification.eligible ? "Prête" : `${certification.progress}%`}
                  </Badge>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-cyan-600 transition-all duration-300" style={{ width: `${certification.obtained ? 100 : certification.progress}%` }} />
                </div>

                <ul className="mt-1 flex flex-col gap-1">
                  {certification.checks.map((check) => (
                    <li key={check.label} className={`flex items-center gap-2 ${check.met ? "text-emerald-600" : "text-slate-500"}`}>
                      <span aria-hidden="true">{check.met ? "✓" : "○"}</span>
                      <span>{check.label}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-1 text-xs text-slate-500">
                  Impact : +{certification.impact.reputationBonus} réputation, -{Math.round(certification.impact.financeReduction * 100)}% de coûts ESG.
                </p>

                {!certification.obtained && (
                  <Button variant="outline" onClick={() => handleObtain(certification.id)} disabled={isRunning || !certification.eligible}>
                    Obtenir cette certification
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
