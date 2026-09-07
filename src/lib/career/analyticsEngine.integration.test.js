// Integration test: analyticsEngine analyzes a career's replay directly --
// section 8 of the request ("analyser les journées, générer des
// diagnostics, générer des recommandations").
import { runCareerDay, startCareer } from "./careerEngine";
import { buildReplayRunFromCareerRun } from "../replay/replayEngine";
import { analyzeRun } from "../analytics/analyticsEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function baseState() {
  return startCareer({
    playerId: "player-1",
    hotelState: { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 } },
    restaurantState: { finance: { revenue: [0], costs: [0], months: {} }, menu: [], staff: [], operations: [] },
    rooms: [{ id: 1, number: "101", status: "libre", housekeeping_status: "clean" }],
    reservations: [{ id: 1, room_id: 1, client_name: "Ada", status: "confirmée", arrival: "2026-09-10", departure: "2026-09-12" }],
  });
}

test("analyzeRun produces KPI/diagnostics/recommendations directly from a career's days", async () => {
  let state = baseState();
  for (let i = 0; i < 3; i += 1) {
    const referenceDate = new Date(REFERENCE_DATE);
    referenceDate.setDate(referenceDate.getDate() + i);
    // eslint-disable-next-line no-await-in-loop
    ({ state } = await runCareerDay({ state, referenceDate, rng: () => 0.999 }));
  }

  const replayRun = buildReplayRunFromCareerRun({ playerId: "player-1", replayLog: state.replayLog, scoreHistory: state.scoreHistory, status: state.status, day: state.day });
  const analysis = analyzeRun(replayRun);

  expect(analysis.runId).toBe("career-player-1");
  expect(analysis.kpis.profit).toEqual(expect.objectContaining({ count: 3 }));
  expect(Array.isArray(analysis.diagnostics)).toBe(true);
  expect(Array.isArray(analysis.recommendations)).toBe(true);
});
