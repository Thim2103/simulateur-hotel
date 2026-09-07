import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AcademyReview from "./AcademyReview";
import { useAcademyContext } from "../context/AcademyContext";
import { createReplayLog, recordCycle } from "../lib/scenario/scenarioReplay";

jest.mock("../context/AcademyContext");

function renderAtReview() {
  return render(
    <MemoryRouter initialEntries={["/academy/c1/review"]}>
      <Routes>
        <Route path="/academy/:classId/review" element={<AcademyReview />} />
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
    generateFinalReport: jest.fn(),
    ...overrides,
  };
}

function finalReport() {
  return {
    classId: "c1",
    className: "Classe A",
    groupCount: 1,
    completedCount: 1,
    classAverageScore: 70,
    bestGroup: { groupId: "g1", groupName: "Groupe A" },
    worstGroup: { groupId: "g1", groupName: "Groupe A" },
    ranking: [{ rank: 1, groupId: "g1", groupName: "Groupe A", currentScore: 70 }],
    groupReports: [{ groupId: "g1", groupName: "Groupe A", evaluation: { finalScore: 70, grade: "B", gradeLabel: "Bien", passed: true, recommendations: [] } }],
  };
}

test("prompts to generate the final report before one exists", () => {
  useAcademyContext.mockReturnValue(baseHook());
  renderAtReview();
  expect(screen.getByText(/cliquez sur « générer le rapport final »/i)).toBeInTheDocument();
});

test("clicking generate calls generateFinalReport and renders the class summary", async () => {
  const generateFinalReport = jest.fn().mockResolvedValue(finalReport());
  useAcademyContext.mockReturnValue(baseHook({ generateFinalReport }));
  renderAtReview();

  fireEvent.click(screen.getByRole("button", { name: /générer le rapport final/i }));

  expect(generateFinalReport).toHaveBeenCalledWith("c1");
  expect(await screen.findByText("70")).toBeInTheDocument();
  expect(screen.getByText(/1\/1/)).toBeInTheDocument();
});

test("shows the replay for the selected group's recorded cycles", () => {
  let log = createReplayLog();
  log = recordCycle(log, { cycleIndex: 0, score: 42, baseReport: { date: "2026-09-10" }, scenarioEvents: [] });
  useAcademyContext.mockReturnValue(
    baseHook({ academyState: { classes: [], groups: [{ id: "g1", classId: "c1", name: "Groupe A" }], assignments: [], runsByGroupId: { g1: { replayLog: log } }, reportsByGroupId: {} } })
  );
  renderAtReview();

  expect(screen.getByText(/cycle 1 · 2026-09-10/i)).toBeInTheDocument();
  expect(screen.getByText(/score : 42/i)).toBeInTheDocument();
});
