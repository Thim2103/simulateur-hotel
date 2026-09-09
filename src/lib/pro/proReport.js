// Assembles the final Pro report ("rapport final professionnel
// (résultats, diagnostics, recommandations)"), and its self-contained
// HTML export ("export HTML du rapport final") -- same "plain enough to
// open in any browser or print-to-PDF" approach lib/tfe/tfeReport.js's
// exportTfeReportHtml() already uses.
import { safeArray, safeObject } from "../safe";
import { scoreGrade } from "./proScore";
import { activeCrises } from "./proCrises";
import { availableOpportunities } from "./proOpportunities";
import { overallAuditScore } from "./proAudits";

export function generateProReport(proState) {
  const state = safeObject(proState);
  const history = safeArray(state.performanceHistory);
  const latest = history[history.length - 1] || null;
  const latestAudits = safeArray(state.audits).slice(-8); // most recent department pass

  return {
    proId: state.proId,
    generatedAt: new Date().toISOString(),
    status: state.status,
    hotelConfig: state.hotelConfig,
    monthsPlayed: state.month,
    horizonMonths: state.horizonMonths,
    finalScore: state.score,
    grade: state.score ? scoreGrade(state.score.total) : null,
    performanceHistory: history,
    latest,
    phases: safeArray(state.phases),
    missions: safeArray(state.missions),
    objectives: safeArray(state.objectives),
    crises: safeArray(state.crises),
    activeCrises: activeCrises(state.crises),
    opportunities: safeArray(state.opportunities),
    availableOpportunities: availableOpportunities(state.opportunities),
    audits: latestAudits,
    overallAuditScore: overallAuditScore(latestAudits),
    diagnostics: safeArray(state.diagnostics),
    forecast: state.forecast,
    // Recommandations: the highest-severity risks and opportunities
    // still open in the latest cycle -- a light synthesis rather than a
    // fresh analysis, since the diagnostics themselves already carry
    // the substance.
    recommendations: safeArray(state.diagnostics)
      .filter((diagnostic) => diagnostic.severity === "high" || diagnostic.type === "opportunity")
      .slice(0, 10),
  };
}

function row(label, value) {
  return `<tr><td>${label}</td><td style="text-align:right">${value}</td></tr>`;
}

// A single self-contained HTML document -- no external assets, no
// template engine, opens in any browser or prints straight to PDF.
export function exportProReportHtml(report) {
  const data = safeObject(report);
  const config = safeObject(data.hotelConfig);
  const latest = safeObject(data.latest);

  const phasesRows = safeArray(data.phases).map((phase) => row(phase.title, "")).join("");
  const missionsRows = safeArray(data.missions).map((mission) => `<li>${mission.achieved ? "✓" : "○"} ${mission.title}</li>`).join("");
  const auditsRows = safeArray(data.audits).map((audit) => row(audit.department, `${audit.score}/100 (${audit.grade})`)).join("");
  const crisesRows = safeArray(data.crises).map((crisis) => `<li>${crisis.active ? "🔴" : "⚪"} ${crisis.title} (${crisis.department})</li>`).join("");
  const opportunitiesRows = safeArray(data.opportunities).map((o) => `<li>${o.status === "seized" ? "✓" : o.status === "expired" ? "✗" : "○"} ${o.title} — ROI estimé : ${o.roiEstimate} €</li>`).join("");
  const diagnosticsRows = safeArray(data.diagnostics).map((d) => `<li><strong>[${d.severity}]</strong> ${d.message}</li>`).join("");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Rapport professionnel -- ${config.name || "Hôtel"}</title>
<style>
body { font-family: system-ui, sans-serif; margin: 2rem; color: #0f172a; }
h1, h2 { color: #0f172a; }
table { border-collapse: collapse; width: 100%; margin-bottom: 1.5rem; }
td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; }
ul { padding-left: 1.2rem; }
.grade { font-size: 2.5rem; font-weight: bold; }
</style>
</head>
<body>
<h1>Rapport final -- Mode Professionnel Solo</h1>
<p>Généré le ${data.generatedAt || new Date().toISOString()}</p>
<p class="grade">Score final : ${data.finalScore?.total ?? "—"}/100 (${data.grade || "—"})</p>

<h2>Établissement</h2>
<table>
${row("Positionnement", config.positioningTier || "—")}
${row("Taille (chambres)", config.roomCount ?? "—")}
${row("Stratégie", config.strategy || "—")}
${row("Mois joués", `${data.monthsPlayed ?? 0}/${data.horizonMonths ?? 24}`)}
</table>

<h2>Performance du dernier mois</h2>
<table>
${row("Score", latest.score ?? "—")}
${row("Marge EBITDA", latest.ebitdaMargin !== undefined ? `${Math.round((latest.ebitdaMargin || 0) * 100)}%` : "—")}
${row("Occupation", latest.occupancyRate !== undefined ? `${latest.occupancyRate}%` : "—")}
${row("Risques", latest.risks ?? "—")}
${row("Opportunités", latest.opportunities ?? "—")}
</table>

<h2>Audits professionnels</h2>
<table>${auditsRows}</table>
${row("Score d'audit global", data.overallAuditScore ?? "—")}

<h2>Phases</h2>
<table>${phasesRows}</table>

<h2>Missions</h2>
<ul>${missionsRows || "<li>Aucune mission.</li>"}</ul>

<h2>Crises</h2>
<ul>${crisesRows || "<li>Aucune crise déclenchée.</li>"}</ul>

<h2>Opportunités</h2>
<ul>${opportunitiesRows || "<li>Aucune opportunité déclenchée.</li>"}</ul>

<h2>Diagnostics et recommandations</h2>
<ul>${diagnosticsRows || "<li>Aucun diagnostic.</li>"}</ul>
</body>
</html>`;
}
