import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReplayCompare from "./ReplayCompare";
import { useReplay } from "../hooks/useReplay";

jest.mock("../hooks/useReplay");

function renderAtCompare() {
  return render(
    <MemoryRouter initialEntries={["/replay/compare/run-a/run-b"]}>
      <Routes>
        <Route path="/replay/compare/:runIdA/:runIdB" element={<ReplayCompare />} />
      </Routes>
    </MemoryRouter>
  );
}

function comparison() {
  return {
    runA: { id: "run-a", ownerLabel: "Groupe A" },
    runB: { id: "run-b", ownerLabel: "Groupe B" },
    timeline: [
      {
        cycleIndex: 0,
        a: { kpis: { profit: 500 }, events: [{ id: "rush", message: "Rush" }], decisions: { pricingADR: 150 } },
        b: { kpis: { profit: 300 }, events: [], decisions: {} },
      },
    ],
    scoring: { a: { label: "Groupe A", finalScore: 70 }, b: { label: "Groupe B", finalScore: 50 }, leader: "a", delta: 20 },
  };
}

function baseHook(overrides = {}) {
  return {
    isRunning: false,
    error: null,
    compareRuns: jest.fn().mockResolvedValue(comparison()),
    ...overrides,
  };
}

test("compares the two runs named in the route", async () => {
  const compareRuns = jest.fn().mockResolvedValue(comparison());
  useReplay.mockReturnValue(baseHook({ compareRuns }));
  renderAtCompare();

  expect(compareRuns).toHaveBeenCalledWith("run-a", "run-b");
  expect(await screen.findByText(/groupe a vs groupe b/i)).toBeInTheDocument();
});

test("shows scoring, timeline, decisions and events once the comparison resolves", async () => {
  useReplay.mockReturnValue(baseHook());
  renderAtCompare();

  expect(await screen.findByText(/mène la comparaison/i)).toBeInTheDocument();
  expect(screen.getByText("500")).toBeInTheDocument();
  expect(screen.getByText("300")).toBeInTheDocument();
  expect(screen.getByText(/pricingADR/)).toBeInTheDocument();
  expect(screen.getByText(/rush/i)).toBeInTheDocument();
});

test("shows a loading state before the comparison resolves", () => {
  useReplay.mockReturnValue(baseHook({ isRunning: true, compareRuns: jest.fn(() => new Promise(() => {})) }));
  renderAtCompare();
  expect(screen.getByRole("status")).toBeInTheDocument();
});

test("shows an error banner when the comparison fails", async () => {
  useReplay.mockReturnValue(baseHook({ error: new Error("Introuvable"), compareRuns: jest.fn().mockRejectedValue(new Error("Introuvable")) }));
  renderAtCompare();
  expect(await screen.findByText(/introuvable/i)).toBeInTheDocument();
});
