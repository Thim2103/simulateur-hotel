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
import { launchProgram } from "../lib/loyalty/loyaltyProgramEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useDashboard");
jest.mock("../hooks/useTfeEngine");
jest.mock("../hooks/useClientsEngine");
jest.mock("../hooks/useRmAdvancedEngine");
jest.mock("../hooks/useProEngine");
jest.mock("../ui/gmDesk/GmDeskProvider", () => ({ ...jest.requireActual("../ui/gmDesk/GmDeskProvider"), useGmDesk: jest.fn() }));

const rooms = [{ id: 1, number: "101", type: "standard", status: "libre", housekeeping_status: "clean", price: 120, capacity: 2 }];
const rich = { finance: { revenue: [50000], costs: [0] } };
const careerState = (hotelState) => ({
  status: "active",
  day: 3,
  startDate: "2026-09-14",
  missions: [],
  objectives: [],
  storyline: { currentEventId: null, history: [] },
  skills: {},
  rewardsInbox: [],
  hotel: { rooms, reservations: [], hotelState },
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

function mount(hotelState = rich, { hash = "", applyHotelAdjustment = jest.fn().mockResolvedValue(null) } = {}) {
  useCareerContext.mockReturnValue({ careerState: careerState(hotelState), isRunning: false, error: null, startCareer: jest.fn(), nextDay: jest.fn(), applyHotelAdjustment });
  useDashboard.mockReturnValue({ dashboardState: dashboardState(), isRunning: false, error: null, isGuest: false, loadDashboardState: jest.fn().mockResolvedValue(null), setViewMode: jest.fn(), applyQuickAction: jest.fn() });
  useGmDesk.mockReturnValue({ messages: [], applyMessageDecision: jest.fn() });
  render(
    <MemoryRouter initialEntries={[`/dashboard${hash}`]}>
      <Dashboard />
    </MemoryRouter>
  );
  return { applyHotelAdjustment };
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

describe("Dashboard / loyalty club", () => {
  it("offers the club among the quick actions", () => {
    mount();
    expect(within(screen.getByTestId("quick-actions")).getByTestId("quick-loyalty")).toHaveTextContent("Club & Fidélité");
    expect(screen.getByTestId("quick-loyalty")).toHaveAttribute("data-tone", "vip");
  });

  it("opens the club's desk from there", () => {
    mount();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("quick-loyalty"));
    expect(screen.getByRole("dialog", { name: /club & fidélité/i })).toBeInTheDocument();
    expect(screen.getByTestId("loyalty-panel")).toHaveAttribute("data-launched", "false");
  });

  it("opens it from a #loyalty link", () => {
    mount(rich, { hash: "#loyalty" });
    expect(screen.getByRole("dialog", { name: /club & fidélité/i })).toBeInTheDocument();
  });

  it("launching the club applies it to the hotel with the career's day and date", () => {
    const { applyHotelAdjustment } = mount();
    fireEvent.click(screen.getByTestId("quick-loyalty"));
    fireEvent.click(screen.getByTestId("loyalty-launch"));
    expect(applyHotelAdjustment).toHaveBeenCalledTimes(1);
    const next = applyHotelAdjustment.mock.calls[0][0](careerState(rich).hotel);
    expect(next.hotelState.loyalty).toMatchObject({ launched: true, launchedDay: 3, launchedOn: "2026-09-17" });
  });

  it("a perk is turned on through the hotel adjustment", () => {
    const launched = launchProgram({ hotelState: rich }, { day: 1 }).hotelState;
    const { applyHotelAdjustment } = mount(launched);
    fireEvent.click(screen.getByTestId("quick-loyalty"));
    fireEvent.click(screen.getByTestId("loyalty-toggle-drink"));
    const next = applyHotelAdjustment.mock.calls[0][0](careerState(launched).hotel);
    expect(next.hotelState.loyalty.benefits.drink).toBe(true);
  });

  it("closes", () => {
    mount();
    fireEvent.click(screen.getByTestId("quick-loyalty"));
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
