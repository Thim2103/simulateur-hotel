import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import { useCareerContext } from "../context/CareerContext";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";
import { RM_ADVANCED_ACTION_CATALOG } from "../lib/rmAdvanced/rmAdvancedEngine";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };
const CATEGORY_LABEL = { pricing: "Pricing", mix: "Mix", distribution: "Distribution", segments: "Segments" };
const RM_ADVANCED_KEYWORDS = /compress|displacement|pick.?up|adr|revpar|ota|rm avanc/i;

// The RM Advanced module's own dashboard: compression, displacement,
// pick-up curves, OTA vs direct mix and ADR by segment -- built on
// lib/rmAdvanced/rmAdvancedEngine.js and hooks/useRmAdvancedEngine.js,
// the same pattern pages/ClientsDashboard.jsx/RestaurantMenuEngineering.jsx
// already established. Works identically for a real Supabase session and
// Guest Mode.
export default function RmAdvancedDashboard() {
  const { careerState, isRunning: isCareerRunning, error: careerError, startCareer } = useCareerContext();
  const { rmAdvancedState, isRunning: isRmRunning, error: rmError, loadRmAdvancedState, applyRmAdvancedAction } = useRmAdvancedEngine();

  useEffect(() => {
    loadRmAdvancedState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = isCareerRunning || isRmRunning;
  const error = rmError || careerError;

  const handleAction = async (actionId) => {
    try {
      await applyRmAdvancedAction(actionId);
    } catch {
      // error surfaced via `error`.
    }
  };

  if ((isCareerRunning || isRmRunning) && !careerState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des données RM avancé…
        </span>
      </div>
    );
  }

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Revenue Management avancé</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">RM avancé</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir vos indicateurs RM avancés.</p>
          </div>
        </header>
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}
        <Card>
          <Button
            onClick={async () => {
              const newCareerState = await startCareer("moi").catch(() => null);
              await loadRmAdvancedState(newCareerState).catch(() => undefined);
            }}
            disabled={isRunning}
          >
            {isRunning ? "Démarrage…" : "Démarrer ma carrière"}
          </Button>
        </Card>
      </div>
    );
  }

  const diagnostics = rmAdvancedState?.diagnostics || [];
  const compression = rmAdvancedState?.compression || { avgCompression: null };
  const displacement = rmAdvancedState?.displacement || { totalLoss: null };
  const pickupCurves = rmAdvancedState?.pickupCurves || { curve: [] };
  const otaStrategy = rmAdvancedState?.otaStrategy || { otaShare: null, directShare: null, channels: {} };
  const netAdrValues = Object.values(otaStrategy.netAdrByChannel || {});
  const avgNetAdr = netAdrValues.length ? Math.round(netAdrValues.reduce((sum, value) => sum + value, 0) / netAdrValues.length) : null;

  const rmMissions = (careerState.missions || []).filter((m) => RM_ADVANCED_KEYWORDS.test(`${m.id} ${m.title} ${m.description || ""}`));
  const rmObjectives = (careerState.objectives || []).filter((o) => RM_ADVANCED_KEYWORDS.test(`${o.id} ${o.label || ""}`));

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Revenue Management avancé</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">RM avancé</h1>
          <p className="mt-1 text-sm text-slate-500">
            Compression, displacement, pick-up et stratégie OTA vs direct -- jour {careerState.day}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/rm-advanced/compression"><Button variant="outline">Compression</Button></Link>
          <Link to="/rm-advanced/displacement"><Button variant="outline">Displacement</Button></Link>
          <Link to="/rm-advanced/pickup"><Button variant="outline">Pick-up</Button></Link>
          <Link to="/rm-advanced/forecast"><Button variant="outline">Forecast</Button></Link>
          <Link to="/rm-advanced/report"><Button variant="outline">Rapport</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!rmAdvancedState ? (
        <Card><p className="text-sm text-slate-500">Chargement du cycle RM avancé…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Compression moyenne" value={compression.avgCompression !== null ? `${compression.avgCompression}%` : "—"} trend={compression.avgCompression >= 92 ? -1 : undefined} />
            <KpiCard label="Displacement" value={displacement.totalLoss !== null ? `${displacement.totalLoss} €` : "—"} trend={displacement.totalLoss > 0 ? -1 : undefined} />
            <KpiCard label="RevPAR net avancé" value={avgNetAdr !== null ? `${avgNetAdr} €` : "—"} />
            <KpiCard label="Part OTA" value={otaStrategy.otaShare !== null ? `${otaStrategy.otaShare}%` : "—"} trend={otaStrategy.otaShare > 60 ? -1 : undefined} />
            <KpiCard label="Part directe" value={otaStrategy.directShare !== null ? `${otaStrategy.directShare}%` : "—"} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LineChart
              title="Courbe de pick-up (J-30 → J-0)"
              labels={pickupCurves.curve.map((entry) => `J-${entry.leadTimeDays}`)}
              data={pickupCurves.curve.map((entry) => entry.bookedPct)}
            />
            <BarChart
              title="Mix OTA vs direct (%)"
              labels={["OTA", "Direct"]}
              data={[otaStrategy.otaShare ?? 0, otaStrategy.directShare ?? 0]}
            />
            <BarChart
              title="ADR par canal"
              labels={Object.keys(otaStrategy.channels)}
              data={Object.values(otaStrategy.channels).map((channel) => channel.adr ?? 0)}
            />
          </div>

          <section aria-labelledby="rm-advanced-diagnostics" className="flex flex-col gap-3">
            <h2 id="rm-advanced-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics RM avancés</h2>
            <Card>
              {diagnostics.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun diagnostic pour le moment.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {diagnostics.map((diag, index) => (
                    <li key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                      <span className="text-slate-700">{diag.message}</span>
                      <Badge type={SEVERITY_BADGE[diag.severity] || "info"}>{diag.severity}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {(rmMissions.length > 0 || rmObjectives.length > 0) && (
            <section aria-labelledby="rm-advanced-career" className="flex flex-col gap-3">
              <h2 id="rm-advanced-career" className="text-base font-semibold text-slate-900">Progression RM avancé (Carrière)</h2>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card title="Missions RM avancé">
                  {rmMissions.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune mission RM avancé pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {rmMissions.map((m) => (
                        <li key={m.id} className="rounded-lg border border-slate-200 p-2">{m.title} <span className="text-slate-500">({m.status})</span></li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card title="Objectifs RM avancé">
                  {rmObjectives.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun objectif RM avancé pour le moment.</p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {rmObjectives.map((o) => (
                        <li key={o.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                          <span>{o.label}</span>
                          <Badge type={o.achieved ? "success" : "info"}>{o.achieved ? "atteint" : "en cours"}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </section>
          )}

          <section aria-labelledby="rm-advanced-actions" className="flex flex-col gap-3">
            <h2 id="rm-advanced-actions" className="text-base font-semibold text-slate-900">Actions RM avancées</h2>
            <Card>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {RM_ADVANCED_ACTION_CATALOG.map((action) => (
                  <div key={action.id} className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{CATEGORY_LABEL[action.category] || action.category}</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{action.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                    </div>
                    <Button variant="outline" onClick={() => handleAction(action.id)} disabled={isRunning}>
                      Appliquer
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
