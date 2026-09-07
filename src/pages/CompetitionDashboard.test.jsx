import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CompetitionDashboard from "./CompetitionDashboard";
import { useCompetitionContext } from "../context/CompetitionContext";

jest.mock("../context/CompetitionContext");

function baseHook(overrides = {}) {
  return {
    competitionState: { matches: [], players: [], runsByPlayerId: {}, reportsByPlayerId: {} },
    isRunning: false,
    error: null,
    loadCompetitionState: jest.fn().mockResolvedValue(undefined),
    createCompetition: jest.fn().mockResolvedValue({ id: "m1" }),
    ...overrides,
  };
}

test("loads the match roster on mount", () => {
  const loadCompetitionState = jest.fn().mockResolvedValue(undefined);
  useCompetitionContext.mockReturnValue(baseHook({ loadCompetitionState }));
  render(<CompetitionDashboard />, { wrapper: MemoryRouter });
  expect(loadCompetitionState).toHaveBeenCalledWith();
});

test("shows an empty state when there are no competitions yet", () => {
  useCompetitionContext.mockReturnValue(baseHook());
  render(<CompetitionDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune compétition pour le moment/i)).toBeInTheDocument();
});

test("creating a competition calls createCompetition with the typed name", () => {
  const createCompetition = jest.fn().mockResolvedValue({ id: "m1" });
  useCompetitionContext.mockReturnValue(baseHook({ createCompetition }));
  render(<CompetitionDashboard />, { wrapper: MemoryRouter });

  fireEvent.change(screen.getByPlaceholderText(/saison 1/i), { target: { value: "Saison 1" } });
  fireEvent.click(screen.getByRole("button", { name: /créer la compétition/i }));

  expect(createCompetition).toHaveBeenCalledWith("Saison 1");
});

test("lists existing competitions with their player count and a link to open them", () => {
  useCompetitionContext.mockReturnValue(
    baseHook({
      competitionState: {
        matches: [{ id: "m1", name: "Saison 1" }],
        players: [{ id: "p1", matchId: "m1" }],
        runsByPlayerId: {},
        reportsByPlayerId: {},
      },
    })
  );
  render(<CompetitionDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByText("Saison 1")).toBeInTheDocument();
  expect(screen.getByText(/1 joueur/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /ouvrir le match/i })).toHaveAttribute("href", "/competition/m1");
});

test("shows an error banner when a request fails", () => {
  useCompetitionContext.mockReturnValue(baseHook({ error: new Error("Supabase indisponible") }));
  render(<CompetitionDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByText(/supabase indisponible/i)).toBeInTheDocument();
});
