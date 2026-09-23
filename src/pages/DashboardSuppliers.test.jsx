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
import { isOwned } from "../lib/suppliers/suppliersEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useDashboard");
jest.mock("../hooks/useTfeEngine");
jest.mock("../hooks/useClientsEngine");
jest.mock("../hooks/useRmAdvancedEngine");
jest.mock("../hooks/useProEngine");
jest.mock("../ui/gmDesk/GmDeskProvider", () => ({ ...jest.requireActual("../ui/gmDesk/GmDeskProvider"), useGmDesk: jest.fn() }));

const rooms = [{ id: 1, number: "101", type: "standard", status: "libre", housekeeping_status: "clean", price: 120, capacity: 2 }];
const rich = () => ({ finance: { revenue: [500000], costs: [0] }, expansion: { availableCapital: 0 } });
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

function mount(hotelState = rich(), { hash = "", applyHotelAdjustment = jest.fn().mockResolvedValue(null) } = {}) {
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

describe("Dashboard / suppliers & equipment catalogue", () => {
  it("offers the catalogue among the quick actions", () => {
    mount();
    expect(within(screen.getByTestId("quick-actions")).getByTestId("quick-suppliers")).toHaveTextContent("Fournisseurs");
  });

  it("opens the desk from there", () => {
    mount();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("quick-suppliers"));
    expect(screen.getByRole("dialog", { name: /fournisseurs & catalogue/i })).toBeInTheDocument();
  });

  it("opens it from a #suppliers link (the top-bar's Hôtel menu)", () => {
    mount(rich(), { hash: "#suppliers" });
    expect(screen.getByRole("dialog", { name: /fournisseurs & catalogue/i })).toBeInTheDocument();
  });

  it("placing an order applies it to the hotel with the career's day and date", () => {
    const { applyHotelAdjustment } = mount();
    fireEvent.click(screen.getByTestId("quick-suppliers"));
    fireEvent.click(screen.getByTestId("supplier-add-furniture-rooms-entry"));
    fireEvent.click(screen.getByTestId("suppliers-checkout"));
    expect(applyHotelAdjustment).toHaveBeenCalledTimes(1);
    const next = applyHotelAdjustment.mock.calls[0][0](careerState(rich()).hotel);
    expect(isOwned(next.hotelState, "furniture-rooms-entry")).toBe(true);
    expect(next.hotelState.suppliers.purchases[0]).toMatchObject({ day: 3, date: "2026-09-17" });
  });

  it("closes", () => {
    mount(rich(), { hash: "#suppliers" });
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
