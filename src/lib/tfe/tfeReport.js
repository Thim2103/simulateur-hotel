// Assembles the final TFE report ("rapport final TFE (résultats,
// diagnostics, recommandations)", section 1/4), and its self-contained
// HTML export ("export HTML du rapport final", section 1) -- same
// "plain enough to open in any browser or print-to-PDF" approach
// lib/finance/financeReports.js's exportFinancialReportHtml() already
// uses.
import { safeArray, safeObject } from "../safe";
import { scoreGrade } from "./tfeScore";

export function generateTfeReport(tfeState) {
  const state = safeObject(tfeState);
  const history = safeArray(state.performanceHistory);
  const latest = history[history.length - 1] || null;

  return {
    tfeId: state.tfeId,
    generatedAt: new Date().toISOString(),
    status: state.status,
    hotelConfig: state.hotelConfig,
    monthsPlayed: state.month,
    horizonMonths: state.horizonMonths,
    finalScore: state.score,
    grade: state.score ? scoreGrade(state.score.total) : null,
    performanceHistory: history,
    latest,
    chapters: safeArray(state.chapters),
    missions: safeArray(state.missions),
    objectives: safeArray(state.objectives),
    diagnostics: safeArray(state.diagnostics),
    forecast: state.forecast,
    // Recommandations: the highest-severity risks and opportunities
    // still open in the latest cycle -- a light synthesis rather than a
    // fresh analysis, since the diagnostics themselves already carry
    // the substance.
    recommendations: safeArray(state.diagnostics)
      .filter((diagnostic) => diagnostic.severity === "high" || diagnostic.type === "opportunity")
      .slice(0, 8),
  };
}

function row(label, value) {
  return `<tr><td>${label}</td><td style="text-align:right">${value}</td></tr>`;
}

// A single self-contained HTML document -- no external assets, no
// template engine, opens in any browser or prints straight to PDF.
export function exportTfeReportHtml(report) {
  const data = safeObject(report);
  const config = safeObject(data.hotelConfig);
  const latest = safeObject(data.latest);

  const chaptersRows = safeArray(data.chapters).map((chapter) => row(chapter.title, "")).join("");
  const missionsRows = safeArray(data.missions)
    .map((mission) => `<li>${mission.achieved ? "✓" : "○"} ${mission.title}</li>`)
    .join("");
  const diagnosticsRows = safeArray(data.diagnostics)
    .map((d) => `<li><strong>[${d.severity}]</strong> ${d.message}</li>`)
    .join("");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Rapport TFE -- ${config.name || "Hôtel"}</title>
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
<h1>Rapport final TFE</h1>
<p>Généré le ${data.generatedAt || new Date().toISOString()}</p>
<p class="grade">Score final : ${data.finalScore?.total ?? "—"}/100 (${data.grade || "—"})</p>

<h2>Établissement</h2>
<table>
${row("Positionnement", config.positioningTier || "—")}
${row("Taille (chambres)", config.roomCount ?? "—")}
${row("Stratégie", config.strategy || "—")}
${row("Mois joués", `${data.monthsPlayed ?? 0}/${data.horizonMonths ?? 36}`)}
</table>

<h2>Performance du dernier mois</h2>
<table>
${row("Score", latest.score ?? "—")}
${row("Marge EBITDA", latest.ebitdaMargin !== undefined ? `${Math.round((latest.ebitdaMargin || 0) * 100)}%` : "—")}
${row("Occupation", latest.occupancyRate !== undefined ? `${latest.occupancyRate}%` : "—")}
${row("Risques", latest.risks ?? "—")}
${row("Opportunités", latest.opportunities ?? "—")}
</table>

<h2>Chapitres</h2>
<table>${chaptersRows}</table>

<h2>Missions</h2>
<ul>${missionsRows || "<li>Aucune mission.</li>"}</ul>

<h2>Diagnostics et recommandations</h2>
<ul>${diagnosticsRows || "<li>Aucun diagnostic.</li>"}</ul>
</body>
</html>`;
}
