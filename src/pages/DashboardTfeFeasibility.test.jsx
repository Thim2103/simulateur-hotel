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

vi.mock("../context/CareerContext");
vi.mock("../hooks/useDashboard");
vi.mock("../hooks/useTfeEngine");
vi.mock("../hooks/useClientsEngine");
vi.mock("../hooks/useRmAdvancedEngine");
vi.mock("../hooks/useProEngine");
vi.mock("../ui/gmDesk/GmDeskProvider", async (importOriginal) => ({ ...(await importOriginal()), useGmDesk: jest.fn() }));

const rooms = [{ id: 1, number: "101", type: "standard", status: "libre", housekeeping_status: "clean", price: 120, capacity: 2 }];
const rich = () => ({ finance: { revenue: [500000], costs: [0], payroll: 9000, fixedCosts: 4000 }, expansion: { availableCapital: 0 } });
const careerState = (hotelState) => ({
  status: "active",
  day: 3,
  startDate: "2026-09-14",
  missions: [],
  objectives: [],
  storyline: { currentEventId: null, history: [] },
  skills: {},
  rewardsInbox: [],
  hotel: { rooms, reservations: [], hotelState, restaurantState: { finance: { revenue: [0], costs: [0] } } },
});
const dashboardState = () => ({
  viewMode: "casual",
  kpis: { occupancyRate: 50, averagePrice: 120, adr: 130, revenueToday: 1800, profit: 400, satisfaction: 4.1, staffCount: 4, date: "2026-09-16" },
  notifications: { problems: [], alerts: [], opportunities: [] },
  insights: { hasInsights: false, diagnostics: [], recommendations: [] },
  quickActions: [],
  replaySummary: null,
  careerSummary: null,
  metadata: {},
});

function mount(hotelState = rich(), { hash = "" } = {}) {
  useCareerContext.mockReturnValue({ careerState: careerState(hotelState), isRunning: false, error: null, startCareer: jest.fn(), nextDay: jest.fn(), applyHotelAdjustment: jest.fn().mockResolvedValue(null) });
  useDashboard.mockReturnValue({ dashboardState: dashboardState(), isRunning: false, error: null, isGuest: false, loadDashboardState: jest.fn().mockResolvedValue(null), setViewMode: jest.fn(), applyQuickAction: jest.fn() });
  useGmDesk.mockReturnValue({ messages: [], applyMessageDecision: jest.fn() });
  render(
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

describe("Dashboard / TFE feasibility desk", () => {
  it("offers the feasibility plan among the quick actions", () => {
    mount();
    expect(within(screen.getByTestId("quick-actions")).getByTestId("quick-tfe-feasibility")).toHaveTextContent("Plan de faisabilité");
  });

  it("opens the desk from there", () => {
    mount();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("quick-tfe-feasibility"));
    expect(screen.getByRole("dialog", { name: /plan de faisabilité tfe/i })).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByTestId("tfe-feasibility-panel")).toBeInTheDocument();
  });

  it("opens it from a #tfe-feasibility link (the top-bar's Finance menu)", () => {
    mount(rich(), { hash: "#tfe-feasibility" });
    expect(screen.getByRole("dialog", { name: /plan de faisabilité tfe/i })).toBeInTheDocument();
  });

  it("closes", () => {
    mount(rich(), { hash: "#tfe-feasibility" });
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
