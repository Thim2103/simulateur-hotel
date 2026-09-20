import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { useCareerContext } from "../context/CareerContext";
import { useDashboard } from "../hooks/useDashboard";
import { useTfeEngine } from "../hooks/useTfeEngine";
import { useClientsEngine } from "../hooks/useClientsEngine";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";
import { useProEngine } from "../hooks/useProEngine";
import { useGmDesk } from "../ui/gmDesk/GmDeskProvider";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useDashboard");
jest.mock("../hooks/useTfeEngine");
jest.mock("../hooks/useClientsEngine");
jest.mock("../hooks/useRmAdvancedEngine");
jest.mock("../hooks/useProEngine");
jest.mock("../ui/gmDesk/GmDeskProvider", () => ({ ...jest.requireActual("../ui/gmDesk/GmDeskProvider"), useGmDesk: jest.fn() }));

const rooms = [
  { id: 1, number: "101", type: "standard", status: "occupée", housekeeping_status: "clean", price: 120, capacity: 2 },
  { id: 2, number: "102", type: "standard", status: "libre", housekeeping_status: "clean", price: 120, capacity: 2 },
];

function careerState(hotelState = {}) {
  return {
    status: "active",
    day: 3,
    startDate: "2026-09-14",
    missions: [],
    objectives: [],
    storyline: { currentEventId: null, history: [] },
    skills: {},
    rewardsInbox: [],
    hotel: { rooms, reservations: [], hotelState: { finance: { revenue: [1000, 1400, 1800], costs: [300, 300, 300] }, ...hotelState } },
  };
}

const dashboardState = () => ({
  viewMode: "casual",
  kpis: { occupancyRate: 50, averagePrice: 120, adr: 130, revenueToday: 1800, profit: 400, satisfaction: 4.1, staffCount: 4, date: "2026-09-17" },
  notifications: { problems: [], alerts: [], opportunities: [] },
  insights: { hasInsights: false, diagnostics: [], recommendations: [] },
  quickActions: [],
  replaySummary: null,
  careerSummary: null,
  metadata: {},
});

function mount({ hotelState, hash = "", messages = [] } = {}) {
  useCareerContext.mockReturnValue({ careerState: careerState(hotelState), isRunning: false, error: null, startCareer: jest.fn(), nextDay: jest.fn(), applyHotelAdjustment: jest.fn().mockResolvedValue(null) });
  useDashboard.mockReturnValue({ dashboardState: dashboardState(), isRunning: false, error: null, isGuest: false, loadDashboardState: jest.fn().mockResolvedValue(null), setViewMode: jest.fn(), applyQuickAction: jest.fn() });
  useGmDesk.mockReturnValue({ messages, applyMessageDecision: jest.fn() });
  return render(
    <MemoryRouter initialEntries={[`/dashboard${hash}`]}>
      <Dashboard />
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  useTfeEngine.mockReturnValue({ tfeState: null, loadTfeState: jest.fn().mockResolvedValue(null) });
  useClientsEngine.mockReturnValue({ clientsState: null, loadClientsState: jest.fn().mockResolvedValue(null) });
  useRmAdvancedEngine.mockReturnValue({ rmAdvancedState: null, loadRmAdvancedState: jest.fn().mockResolvedValue(null) });
  useProEngine.mockReturnValue({ proState: null, loadProState: jest.fn().mockResolvedValue(null) });
});

afterEach(() => {
  delete window.HTMLElement.prototype.scrollIntoView;
});

describe("Dashboard as a Bento grid", () => {
  it("lays the four cards out, with the quick actions above them", () => {
    mount();
    const grid = screen.getByTestId("dashboard-bento");
    expect(within(grid).getByRole("heading", { name: "Résumé de la journée" })).toBeInTheDocument();
    expect(within(grid).getByRole("heading", { name: "Saison & événements" })).toBeInTheDocument();
    expect(within(grid).getByRole("heading", { name: "Occupation & revenus" })).toBeInTheDocument();
    expect(within(grid).getByRole("heading", { name: "Alertes urgentes" })).toBeInTheDocument();
    expect(screen.getByTestId("quick-actions")).toBeInTheDocument();
  });

  it("keeps everything the page already had", () => {
    mount();
    expect(screen.getByRole("heading", { name: /mon hôtel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /jouer la journée/i })).toBeInTheDocument();
    expect(screen.getByTestId("season-events-banner")).toBeInTheDocument();
    expect(screen.getByText("Taux d'occupation")).toBeInTheDocument();
    expect(screen.getByText(/ce qui demande votre attention/i)).toBeInTheDocument();
    expect(screen.getByText(/décisions du jour/i)).toBeInTheDocument();
  });

  it("shows the urgent things: breakdowns, unanswered bad reviews, GM Desk messages", () => {
    mount({
      hotelState: {
        activeIncidents: [{ id: "i1", status: "active", severity: "critical" }],
        guestReviews: [{ id: "r1", day: 2, rating: 1, impact: -1.2, weight: 1, applied: 0 }],
      },
      messages: [{ id: 1 }],
    });
    const alerts = screen.getByTestId("bento-alerts");
    expect(within(alerts).getByTestId("alert-incidents")).toHaveTextContent("1 panne à réparer dont 1 critique");
    expect(within(alerts).getByTestId("alert-reviews")).toHaveTextContent("1 avis négatif sans réponse");
    expect(within(alerts).getByTestId("alert-gm")).toHaveTextContent("1 message au GM Desk");
    expect(screen.getByTestId("quick-reviews-count")).toHaveTextContent("1");
  });

  it("says nothing is urgent on a quiet day", () => {
    mount();
    expect(within(screen.getByTestId("bento-alerts")).getByText(/rien d'urgent/i)).toBeInTheDocument();
  });

  it("shows the occupancy gauge and the revenue curve", () => {
    mount();
    expect(screen.getByRole("img", { name: "Occupation : 50 %" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Revenus des 3 derniers jours" })).toBeInTheDocument();
  });

  it("opens the yield & marketing desk from the quick actions", () => {
    mount();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("quick-yield"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens the same desk when the sidebar's Yield & Marketing brings us here (#yield)", () => {
    mount({ hash: "#yield" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("scrolls to the hotel plan for #hotel-plan, and does not open the desk", () => {
    mount({ hash: "#hotel-plan" });
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.getElementById("hotel-plan")).toContainElement(screen.getByTestId("schematic-hotel-view"));
  });

  it("does not open the desk on a plain visit", () => {
    mount();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
