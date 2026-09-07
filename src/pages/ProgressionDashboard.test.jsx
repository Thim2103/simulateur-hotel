import { render, screen } from "@testing-library/react";
import ProgressionDashboard from "./ProgressionDashboard";
import { useProgression } from "../hooks/useProgression";

jest.mock("../hooks/useProgression");

function sampleReport(overrides = {}) {
  return {
    reputation: 72,
    xp: 150,
    level: { level: 2, title: "Gérant confirmé", xp: 150, xpForNextLevel: 300, xpToNextLevel: 150, progress: 25 },
    objectivesCompleted: [{ id: "profitable_day", name: "Journée rentable", description: "Terminer la journée avec un profit positif." }],
    newAchievements: [{ id: "first_profit", name: "Premiers bénéfices", description: "Premier jour rentable." }],
    rewards: [{ id: "objective_profitable_day", type: "xp", amount: 15, description: "+15 XP pour l'objectif \"Journée rentable\"." }],
    storylineEvents: [{ id: "achievement_first_profit", title: "Succès débloqué", message: "\"Premiers bénéfices\" : Premier jour rentable." }],
    ...overrides,
  };
}

test("shows a loading state before any report is available", () => {
  useProgression.mockReturnValue({ updateProgression: jest.fn().mockResolvedValue(sampleReport()), progressionReport: null, isRunning: true, error: null });
  render(<ProgressionDashboard />);
  expect(screen.getByText(/calcul de la progression en cours/i)).toBeInTheDocument();
});

test("shows an error banner when the engine fails", () => {
  useProgression.mockReturnValue({ updateProgression: jest.fn().mockResolvedValue(null), progressionReport: null, isRunning: false, error: new Error("Session Supabase non authentifiee.") });
  render(<ProgressionDashboard />);
  expect(screen.getByText(/impossible de calculer la progression/i)).toBeInTheDocument();
});

test("displays reputation, xp, level, objectives, achievements, rewards and storyline once a report is available", () => {
  useProgression.mockReturnValue({ updateProgression: jest.fn().mockResolvedValue(sampleReport()), progressionReport: sampleReport(), isRunning: false, error: null });
  render(<ProgressionDashboard />);

  expect(screen.getByText("72/100")).toBeInTheDocument();
  expect(screen.getByText("150")).toBeInTheDocument();
  expect(screen.getByText("2 · Gérant confirmé")).toBeInTheDocument();
  expect(screen.getByText("Journée rentable")).toBeInTheDocument();
  expect(screen.getAllByText(/premiers bénéfices/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/pour l'objectif/i)).toBeInTheDocument();
  expect(screen.getByText("Succès débloqué")).toBeInTheDocument();
});

test("falls back to empty-state messages when nothing happened today", () => {
  useProgression.mockReturnValue({
    updateProgression: jest.fn().mockResolvedValue(sampleReport()),
    progressionReport: sampleReport({ objectivesCompleted: [], newAchievements: [], rewards: [], storylineEvents: [] }),
    isRunning: false,
    error: null,
  });
  render(<ProgressionDashboard />);

  expect(screen.getByText(/aucun objectif complété/i)).toBeInTheDocument();
  expect(screen.getByText(/aucun nouveau succès/i)).toBeInTheDocument();
  expect(screen.getByText(/aucune récompense/i)).toBeInTheDocument();
  expect(screen.getByText(/aucun événement narratif/i)).toBeInTheDocument();
});

test("calls updateProgression() once on mount", () => {
  const updateProgression = jest.fn().mockResolvedValue(sampleReport());
  useProgression.mockReturnValue({ updateProgression, progressionReport: null, isRunning: false, error: null });
  render(<ProgressionDashboard />);
  expect(updateProgression).toHaveBeenCalledTimes(1);
});
