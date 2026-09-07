// Packages a ReplayRun into an exportable payload. There is no PDF
// generation library in this project's dependencies (adding one is out of
// scope here); "PDF" export instead means a clean, print-ready HTML
// summary the browser's own print-to-PDF handles -- see
// pages/ReplayExport.jsx, which renders buildSummaryHtml() and calls
// window.print().
import { safeArray } from "../safe";
import { allKpiSeries } from "./replayKpis";
import { eventFrequency } from "./replayEvents";

// The full, structured export: everything a JSON download or an external
// tool would want, with nothing left implicit.
export function buildExportPayload(run) {
  return {
    id: run?.id,
    source: run?.source,
    ownerLabel: run?.ownerLabel,
    scenarioTitle: run?.scenarioTitle,
    status: run?.status,
    totalCycles: run?.totalCycles,
    scoreHistory: safeArray(run?.scoreHistory),
    finalReport: run?.finalReport || null,
    kpiSeries: allKpiSeries(run?.cycles),
    eventFrequency: eventFrequency(run?.cycles),
    cycles: safeArray(run?.cycles),
    exportedAt: new Date().toISOString(),
  };
}

export function toJson(run) {
  return JSON.stringify(buildExportPayload(run), null, 2);
}

// A compact, human-readable HTML summary -- one screen, print-friendly,
// no external assets -- for the "PDF" export path.
export function buildSummaryHtml(run) {
  const payload = buildExportPayload(run);
  const finalScore = payload.scoreHistory.length ? payload.scoreHistory[payload.scoreHistory.length - 1] : "—";
  const eventRows = Object.entries(payload.eventFrequency)
    .map(([eventId, count]) => `<tr><td>${eventId}</td><td>${count}</td></tr>`)
    .join("");

  return `
    <h1>${payload.ownerLabel || payload.id}</h1>
    <p>Scénario : ${payload.scenarioTitle || "—"} · Statut : ${payload.status} · Cycles : ${payload.totalCycles}</p>
    <p>Score final : ${finalScore}</p>
    <h2>Événements</h2>
    <table><thead><tr><th>Événement</th><th>Occurrences</th></tr></thead><tbody>${eventRows || "<tr><td colspan=\"2\">Aucun</td></tr>"}</tbody></table>
    <p><em>Exporté le ${new Date(payload.exportedAt).toLocaleString("fr-FR")}</em></p>
  `;
}
