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
import { advanceMediaCrisis, respondToCrisis, activeCrisis } from "../lib/mediaCrisis/mediaCrisisEngine";

vi.mock("../context/CareerContext");
vi.mock("../hooks/useDashboard");
vi.mock("../hooks/useTfeEngine");
vi.mock("../hooks/useClientsEngine");
vi.mock("../hooks/useRmAdvancedEngine");
vi.mock("../hooks/useProEngine");
vi.mock("../ui/gmDesk/GmDeskProvider", async (importOriginal) => ({ ...(await importOriginal()), useGmDesk: jest.fn() }));

const START = "2026-09-14";
const ONSET = "2026-09-24"; // career day 10
const rooms = [{ id: 1, number: "101", type: "standard", status: "libre", housekeeping_status: "clean", price: 120, capacity: 2 }];
const baseHotel = () => ({
  finance: { revenue: [50000], costs: [0] },
  progression: { player: { reputation: 70 } },
  hotelEvents: { today: null, audits: [{ id: `audit:${ONSET}`, day: 10, date: ONSET, score: 30, outcome: "warning", reputation: -4, untilDay: 25 }] },
});
const crisisHotel = () => advanceMediaCrisis(baseHotel(), { date: ONSET, day: 10 });

// Day 11 of the career: the morning after the crisis broke (2026-09-25).
const careerState = (hotelState) => ({
  status: "active",
  day: 11,
  startDate: START,
  missions: [],
  objectives: [],
  storyline: { currentEventId: null, history: [] },
  skills: {},
  rewardsInbox: [],
  hotel: { rooms, reservations: [], hotelState },
});
const dashboardState = () => ({
  viewMode: "casual",
  kpis: { occupancyRate: 50, averagePrice: 120, adr: 130, revenueToday: 1800, profit: 400, satisfaction: 4.1, staffCount: 4, date: "2026-09-24" },
  notifications: { problems: [], alerts: [], opportunities: [] },
  insights: { hasInsights: false, diagnostics: [], recommendations: [] },
  quickActions: [],
  replaySummary: null,
  careerSummary: null,
  metadata: {},
});

function mount(hotelState, { hash = "", applyHotelAdjustment = jest.fn().mockResolvedValue(null) } = {}) {
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

describe("Dashboard / media crisis", () => {
  it("shows nothing about a crisis when there is none", () => {
    mount(baseHotel());
    expect(screen.queryByTestId("media-crisis-banner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("rehab-banner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("alert-crisis")).not.toBeInTheDocument();
  });

  it("raises the red alert on the dashboard, above everything else", () => {
    mount(crisisHotel());
    const banner = screen.getByTestId("media-crisis-banner");
    expect(banner).toHaveAttribute("data-decided", "false");
    expect(banner).toHaveTextContent("Intoxication alimentaire au restaurant");
    // Ahead of the quick actions and the Bento grid.
    expect(banner.compareDocumentPosition(screen.getByTestId("quick-actions")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(banner.compareDocumentPosition(screen.getByTestId("dashboard-bento")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("puts the crisis first in the urgent alerts, flagged as a priority", () => {
    mount(crisisHotel());
    const alerts = within(screen.getByTestId("bento-alerts"));
    const item = alerts.getByTestId("alert-crisis");
    expect(item).toHaveAttribute("data-priority", "true");
    expect(item).toHaveAttribute("href", "/dashboard#crisis");
    expect(item).toHaveTextContent(/Crise médiatique : Intoxication alimentaire au restaurant/);
    expect(alerts.getAllByRole("link")[0]).toBe(item);
  });

  it("opens the crisis desk from the banner", () => {
    mount(crisisHotel());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("crisis-open"));
    expect(screen.getByRole("dialog", { name: /crise médiatique/i })).toBeInTheDocument();
  });

  it("opens it too when the notification centre sends us here (#crisis)", () => {
    mount(crisisHotel(), { hash: "#crisis" });
    expect(screen.getByRole("dialog", { name: /crise médiatique/i })).toBeInTheDocument();
  });

  it("answering applies the answer to the hotel, with the day and the calendar date", () => {
    const { applyHotelAdjustment } = mount(crisisHotel());
    fireEvent.click(screen.getByTestId("crisis-open"));
    fireEvent.click(screen.getByTestId("crisis-choose-apology"));
    expect(applyHotelAdjustment).toHaveBeenCalledTimes(1);
    const hotel = careerState(crisisHotel()).hotel;
    const next = applyHotelAdjustment.mock.calls[0][0](hotel);
    expect(activeCrisis(next.hotelState).decision).toMatchObject({ type: "apology", day: 11, date: "2026-09-25", cost: 2000 });
  });

  it("the audits, chosen from the desk, end the crisis and announce the rehabilitation", () => {
    const { applyHotelAdjustment } = mount(crisisHotel());
    fireEvent.click(screen.getByTestId("crisis-open"));
    fireEvent.click(screen.getByTestId("crisis-choose-audit"));
    const next = applyHotelAdjustment.mock.calls[0][0](careerState(crisisHotel()).hotel);
    expect(activeCrisis(next.hotelState)).toBeNull();
    expect(next.hotelState.mediaCrisis.rehab).toMatchObject({ boost: 0.15 });
  });

  it("calms the banner once answered", () => {
    const answered = respondToCrisis({ hotelState: crisisHotel() }, "deny", { date: "2026-09-25", day: 11 }).hotelState;
    mount(answered);
    expect(screen.getByTestId("media-crisis-banner")).toHaveAttribute("data-decided", "true");
    expect(screen.getByTestId("alert-crisis")).not.toHaveAttribute("data-priority");
  });

  it("announces the rehabilitation campaign after the audits", () => {
    const rehabilitated = respondToCrisis({ hotelState: crisisHotel() }, "audit", { date: "2026-09-25", day: 11 }).hotelState;
    mount(rehabilitated);
    expect(screen.queryByTestId("media-crisis-banner")).not.toBeInTheDocument();
    expect(screen.getByTestId("rehab-banner")).toHaveTextContent("L'hôtel le plus sûr de la ville");
  });
});
