// Integration test: Analytics + Finance -- financeDiagnosticsToAnalytics()
// output merges cleanly into a real analyzeRun() Analysis object's own
// diagnostics list (see the Refonte Finance request's section 5:
// "intégrer les diagnostics financiers dans analyticsEngine").
import { createGuestHotelBundle } from "../guest";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildReplayRunFromCareerRun } from "../replay/replayEngine";
import { analyzeRun } from "../analytics/analyticsEngine";
import { runFinanceCycle } from "./financeEngine";
import { financeDiagnosticsToAnalytics, generateFinancialReport } from "./financeReports";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

test("financeDiagnosticsToAnalytics() output can be concatenated into a real Analysis object's diagnostics", async () => {
  const career = startCareer({ playerId: "player-1", ...createGuestHotelBundle({ referenceDate: REFERENCE_DATE }) });
  const { state: playedCareer } = await runCareerDay({ state: career, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  const replayRun = buildReplayRunFromCareerRun({
    playerId: playedCareer.playerId,
    replayLog: playedCareer.replayLog,
    scoreHistory: playedCareer.scoreHistory,
    status: playedCareer.status,
    day: playedCareer.day,
  });
  const analysis = analyzeRun(replayRun);

  const financeState = runFinanceCycle({ hotelBundle: playedCareer.hotel, referenceDate: REFERENCE_DATE });
  const financeDiagnostics = generateFinancialReport(financeState).diagnostics;
  const adapted = financeDiagnosticsToAnalytics(financeDiagnostics);

  const combined = [...analysis.diagnostics, ...adapted];

  // Every entry (Analytics' own, and the adapted Finance ones) shares the
  // exact same {type, severity, message, cycleIndex} shape.
  combined.forEach((diagnostic) => {
    expect(["anomaly", "error", "opportunity"]).toContain(diagnostic.type);
    expect(diagnostic).toHaveProperty("severity");
    expect(diagnostic).toHaveProperty("message");
    expect(diagnostic).toHaveProperty("cycleIndex");
  });
});
