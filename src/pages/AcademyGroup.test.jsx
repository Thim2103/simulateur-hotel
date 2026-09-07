import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AcademyGroup from "./AcademyGroup";
import { useAcademyContext } from "../context/AcademyContext";
import { createReplayLog, recordCycle } from "../lib/scenario/scenarioReplay";

jest.mock("../context/AcademyContext");

function renderAtGroup() {
  return render(
    <MemoryRouter initialEntries={["/academy/c1/group/g1"]}>
      <Routes>
        <Route path="/academy/:classId/group/:groupId" element={<AcademyGroup />} />
      </Routes>
    </MemoryRouter>
  );
}

function baseHook(overrides = {}) {
  return {
    academyState: { classes: [], groups: [{ id: "g1", classId: "c1", name: "Groupe A" }], assignments: [], runsByGroupId: {}, reportsByGroupId: {} },
    isRunning: false,
    error: null,
    loadClassState: jest.fn().mockResolvedValue(undefined),
    runGroupCycle: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

test("shows a not-started message when the group has no run yet", () => {
  useAcademyContext.mockReturnValue(baseHook());
  renderAtGroup();
  expect(screen.getByText(/aucun scénario n'a encore été assigné/i)).toBeInTheDocument();
});

test("shows objectives and daily reports once a run exists", () => {
  let log = createReplayLog();
  log = recordCycle(log, { cycleIndex: 0, score: 55, baseReport: { date: "2026-09-10" }, scenarioEvents: [] });
  const run = {
    status: "running",
    cycleIndex: 1,
    totalCycles: 5,
    scoreHistory: [55],
    objectivesStatus: { objectives: [{ id: "profit", label: "Profit positif", current: 1200, target: 0, achieved: true }] },
    replayLog: log,
  };
  useAcademyContext.mockReturnValue(baseHook({ academyState: { classes: [], groups: [{ id: "g1", classId: "c1", name: "Groupe A" }], assignments: [], runsByGroupId: { g1: run }, reportsByGroupId: {} } }));
  renderAtGroup();

  expect(screen.getByText("Profit positif")).toBeInTheDocument();
  expect(screen.getByText("Atteint")).toBeInTheDocument();
  expect(screen.getByText(/cycle 1 · 2026-09-10/i)).toBeInTheDocument();
});

test("clicking 'Jouer un cycle' calls runGroupCycle with the routed ids", () => {
  const runGroupCycle = jest.fn().mockResolvedValue({});
  const run = { status: "running", cycleIndex: 0, totalCycles: 5, scoreHistory: [], objectivesStatus: { objectives: [] }, replayLog: createReplayLog() };
  useAcademyContext.mockReturnValue(baseHook({ runGroupCycle, academyState: { classes: [], groups: [{ id: "g1", classId: "c1", name: "Groupe A" }], assignments: [], runsByGroupId: { g1: run }, reportsByGroupId: {} } }));
  renderAtGroup();

  fireEvent.click(screen.getByRole("button", { name: /jouer un cycle/i }));
  expect(runGroupCycle).toHaveBeenCalledWith("c1", "g1", {});
});
