import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReplayExport from "./ReplayExport";
import { useReplay } from "../hooks/useReplay";

jest.mock("../hooks/useReplay");

function renderAtExport() {
  return render(
    <MemoryRouter initialEntries={["/replay/academie-c1-g1/export"]}>
      <Routes>
        <Route path="/replay/:runId/export" element={<ReplayExport />} />
      </Routes>
    </MemoryRouter>
  );
}

function run() {
  return {
    id: "academie-c1-g1",
    ownerLabel: "Groupe A",
    scenarioTitle: "Budget serré",
    status: "finished",
    totalCycles: 2,
    scoreHistory: [40, 70],
    cycles: [{ cycleIndex: 0 }, { cycleIndex: 1 }],
  };
}

function baseHook(overrides = {}) {
  const replayState = overrides.replayState || { runsById: { "academie-c1-g1": run() }, currentRunId: "academie-c1-g1", currentCycleIndex: 0 };
  return {
    replayState,
    isRunning: false,
    error: null,
    loadReplay: jest.fn().mockResolvedValue(undefined),
    exportReplay: jest.fn().mockReturnValue({
      payload: { eventFrequency: { rush: 2 } },
      json: JSON.stringify({ id: "academie-c1-g1" }),
      html: "<h1>Groupe A</h1>",
    }),
    ...overrides,
  };
}

test("loads the replay for the routed runId", () => {
  const loadReplay = jest.fn().mockResolvedValue(undefined);
  useReplay.mockReturnValue(baseHook({ loadReplay, replayState: { runsById: {}, currentRunId: null, currentCycleIndex: 0 } }));
  renderAtExport();
  expect(loadReplay).toHaveBeenCalledWith("academie-c1-g1");
});

test("shows the run summary, score chart and event frequency", () => {
  useReplay.mockReturnValue(baseHook());
  renderAtExport();

  expect(screen.getByText("Groupe A · Budget serré")).toBeInTheDocument();
  expect(screen.getByText("70")).toBeInTheDocument(); // final score KPI
  expect(screen.getByText("rush")).toBeInTheDocument();
  expect(screen.getByText(/2 occurrence/i)).toBeInTheDocument();
});

test("clicking 'Exporter PDF' calls window.print", () => {
  const printSpy = jest.spyOn(window, "print").mockImplementation(() => {});
  useReplay.mockReturnValue(baseHook());
  renderAtExport();

  fireEvent.click(screen.getByRole("button", { name: /exporter pdf/i }));
  expect(printSpy).toHaveBeenCalled();
  printSpy.mockRestore();
});

test("shows a loading state before the run is loaded", () => {
  useReplay.mockReturnValue(baseHook({ isRunning: true, replayState: { runsById: {}, currentRunId: null, currentCycleIndex: 0 } }));
  renderAtExport();
  expect(screen.getByRole("status")).toBeInTheDocument();
});
