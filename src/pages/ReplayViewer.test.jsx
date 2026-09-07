import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReplayViewer from "./ReplayViewer";
import { useReplay } from "../hooks/useReplay";

jest.mock("../hooks/useReplay");

function renderAtViewer(runId = "academie-c1-g1") {
  return render(
    <MemoryRouter initialEntries={[`/replay/${runId}`]}>
      <Routes>
        <Route path="/replay/:runId" element={<ReplayViewer />} />
      </Routes>
    </MemoryRouter>
  );
}

function run(overrides = {}) {
  return {
    id: "academie-c1-g1",
    source: "academie",
    ownerLabel: "Groupe A",
    scenarioTitle: "Budget serré",
    status: "finished",
    totalCycles: 2,
    scoreHistory: [40, 70],
    cycles: [
      {
        cycleIndex: 0,
        score: 40,
        baseReport: { date: "2026-09-10", profit: 500, nextState: { rooms: [1, 2], reservations: [1], restaurantState: { staff: [1] } } },
        scenarioEvents: [{ id: "restaurant_rush", category: "restaurant", message: "Rush du service" }],
        decisions: { pricingADR: 150 },
      },
      { cycleIndex: 1, score: 70, baseReport: { date: "2026-09-11", profit: 900, nextState: {} }, scenarioEvents: [], decisions: {} },
    ],
    ...overrides,
  };
}

function baseHook(overrides = {}) {
  const runData = overrides.replayState ? undefined : run();
  const replayState = overrides.replayState || { runsById: { [runData.id]: runData }, currentRunId: runData.id, currentCycleIndex: 0 };
  return {
    replayState,
    isRunning: false,
    error: null,
    loadReplay: jest.fn().mockResolvedValue(undefined),
    getCycle: jest.fn((cycleIndex) => replayState.runsById[replayState.currentRunId]?.cycles.find((c) => c.cycleIndex === (cycleIndex ?? replayState.currentCycleIndex))),
    nextCycle: jest.fn(),
    previousCycle: jest.fn(),
    jumpToCycle: jest.fn(),
    ...overrides,
  };
}

test("loads the replay for the routed runId", () => {
  const loadReplay = jest.fn().mockResolvedValue(undefined);
  useReplay.mockReturnValue(baseHook({ loadReplay, replayState: { runsById: {}, currentRunId: null, currentCycleIndex: 0 } }));
  renderAtViewer("academie-c1-g1");
  expect(loadReplay).toHaveBeenCalledWith("academie-c1-g1");
});

test("shows the run's title, KPIs, decisions, events and hotel state for the current cycle", () => {
  useReplay.mockReturnValue(baseHook());
  renderAtViewer();

  expect(screen.getByText("Groupe A")).toBeInTheDocument();
  expect(screen.getByText("500 €")).toBeInTheDocument(); // profit KPI
  expect(screen.getByText("pricingADR")).toBeInTheDocument();
  expect(screen.getByText(/rush du service/i)).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument(); // rooms.length
});

test("clicking a timeline cycle button jumps to that cycle", () => {
  const jumpToCycle = jest.fn();
  useReplay.mockReturnValue(baseHook({ jumpToCycle }));
  renderAtViewer();

  fireEvent.click(screen.getByRole("button", { name: /cycle 2/i }));
  expect(jumpToCycle).toHaveBeenCalledWith(1);
});

test("previous/next buttons call previousCycle/nextCycle", () => {
  const nextCycle = jest.fn();
  const previousCycle = jest.fn();
  useReplay.mockReturnValue(baseHook({ nextCycle, previousCycle }));
  renderAtViewer();

  fireEvent.click(screen.getByRole("button", { name: /cycle suivant/i }));
  expect(nextCycle).toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /cycle précédent/i })).toBeDisabled();
});

test("shows a loading state before the run is loaded", () => {
  useReplay.mockReturnValue(baseHook({ isRunning: true, replayState: { runsById: {}, currentRunId: null, currentCycleIndex: 0 } }));
  renderAtViewer();
  expect(screen.getByRole("status")).toBeInTheDocument();
});

test("shows an error banner when the load fails with nothing cached", () => {
  useReplay.mockReturnValue(baseHook({ error: new Error("Replay introuvable"), replayState: { runsById: {}, currentRunId: null, currentCycleIndex: 0 } }));
  renderAtViewer();
  expect(screen.getByText(/replay introuvable/i)).toBeInTheDocument();
});
