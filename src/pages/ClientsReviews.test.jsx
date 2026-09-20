import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClientsReviews from "./ClientsReviews";
import { useCareerContext } from "../context/CareerContext";
import { useClientsEngine } from "../hooks/useClientsEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useClientsEngine");
// Chart.js needs a real <canvas>, which jsdom lacks: it survives one render but throws on the re-render a filter click triggers.
jest.mock("../components/charts/LineChart", () => () => null);
jest.mock("../components/charts/AreaChart", () => () => null);

function careerState(overrides = {}) {
  return { day: 3, status: "active", hotel: {}, missions: [], objectives: [], ...overrides };
}

function clientsState(overrides = {}) {
  return {
    satisfaction: 68,
    loyalty: 55,
    reviews: { avgRating: 3.9, count: 18, positive: 76, negative: 11, trend: "improving" },
    complaints: [{ type: "chambre", severity: "medium", resolved: false }],
    replayLog: { entries: [{ cycleIndex: 0, satisfaction: 68, avgRating: 3.9 }] },
    ...overrides,
  };
}

function clientsHook(overrides = {}) {
  return {
    clientsState: null, isRunning: false, error: null,
    loadClientsState: jest.fn().mockResolvedValue(null),
    applyClientsAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the clients state on mount", () => {
  const loadClientsState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue({ careerState: careerState(), isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook({ loadClientsState }));
  render(<ClientsReviews />, { wrapper: MemoryRouter });
  expect(loadClientsState).toHaveBeenCalled();
});

test("prompts to start career when none exists", () => {
  useCareerContext.mockReturnValue({ careerState: null, isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook());
  render(<ClientsReviews />, { wrapper: MemoryRouter });
  expect(screen.getByText(/démarrez votre carrière/i)).toBeInTheDocument();
});

test("shows review KPIs and trend badge", () => {
  useCareerContext.mockReturnValue({ careerState: careerState(), isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook({ clientsState: clientsState() }));
  render(<ClientsReviews />, { wrapper: MemoryRouter });

  expect(screen.getByText("3.9/5")).toBeInTheDocument();
  expect(screen.getByText("76%")).toBeInTheDocument(); // positifs
  expect(screen.getByText(/en hausse/i)).toBeInTheDocument(); // trend improving
});

test("shows complaints list", () => {
  useCareerContext.mockReturnValue({ careerState: careerState(), isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook({ clientsState: clientsState() }));
  render(<ClientsReviews />, { wrapper: MemoryRouter });

  expect(screen.getByText(/chambre/i)).toBeInTheDocument();
});

describe("incident-related reviews history", () => {
  const hotelState = {
    activeIncidents: [
      { id: "i-old", zone: "laundry", status: "resolved" },
      { id: "i-new", zone: "laundry", status: "active" },
    ],
    incidentReviews: [
      { id: "review:i-old:1", incidentId: "i-old", zone: "laundry", day: 1, rating: 2, text: "Ancienne panne de buanderie." },
      { id: "review:i-new:3", incidentId: "i-new", zone: "laundry", day: 3, rating: 1, text: "Machine à laver HS, pas de serviettes propres." },
    ],
  };

  function renderWith(hs) {
    useCareerContext.mockReturnValue({ careerState: careerState({ hotel: { hotelState: hs } }), isRunning: false, error: null });
    useClientsEngine.mockReturnValue(clientsHook({ clientsState: clientsState() }));
    render(<ClientsReviews />, { wrapper: MemoryRouter });
  }

  test("lists every incident review, newest first, with a 'Problème technique' badge and the incident's current status", () => {
    renderWith(hotelState);
    const items = screen.getAllByTestId("incident-review");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Machine à laver HS, pas de serviettes propres.");
    expect(items[0]).toHaveTextContent(/jour 3/i);
    expect(within(items[0]).getByText("Problème technique")).toBeInTheDocument();
    expect(within(items[0]).getByText("Panne en cours")).toBeInTheDocument();
    expect(within(items[1]).getByText("Réparée")).toBeInTheDocument();
    expect(within(items[0]).getByLabelText("Note 1 sur 5")).toBeInTheDocument();
  });

  test("shows the total count in the section heading", () => {
    renderWith(hotelState);
    expect(screen.getByRole("heading", { name: /avis liés aux pannes \(2\)/i })).toBeInTheDocument();
  });

  test("filters by whether the incident is still open or already repaired", () => {
    renderWith(hotelState);

    fireEvent.click(screen.getByRole("button", { name: "Pannes en cours" }));
    expect(screen.getAllByTestId("incident-review")).toHaveLength(1);
    expect(screen.getByTestId("incident-review")).toHaveTextContent(/machine à laver/i);
    expect(screen.getByRole("button", { name: "Pannes en cours" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Pannes réparées" }));
    expect(screen.getByTestId("incident-review")).toHaveTextContent(/ancienne panne/i);

    fireEvent.click(screen.getByRole("button", { name: "Tous" }));
    expect(screen.getAllByTestId("incident-review")).toHaveLength(2);
  });

  test("says so when a filter matches nothing", () => {
    renderWith({ ...hotelState, activeIncidents: [{ id: "i-old", status: "resolved" }, { id: "i-new", status: "resolved" }] });
    fireEvent.click(screen.getByRole("button", { name: "Pannes en cours" }));
    expect(screen.queryByTestId("incident-review")).not.toBeInTheDocument();
    expect(screen.getByText(/aucun avis dans cette catégorie/i)).toBeInTheDocument();
  });

  test("shows an empty state, and no filter buttons, when there are no incident reviews", () => {
    renderWith({});
    expect(screen.getByText(/aucun avis lié à une panne/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pannes en cours" })).not.toBeInTheDocument();
  });
});
