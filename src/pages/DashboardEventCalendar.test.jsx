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
import { eventsOn } from "../lib/hotelEvents/hotelEventsEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useDashboard");
jest.mock("../hooks/useTfeEngine");
jest.mock("../hooks/useClientsEngine");
jest.mock("../hooks/useRmAdvancedEngine");
jest.mock("../hooks/useProEngine");
jest.mock("../ui/gmDesk/GmDeskProvider", () => ({ ...jest.requireActual("../ui/gmDesk/GmDeskProvider"), useGmDesk: jest.fn() }));

const DAY = 86400000;
const iso = (date) => date.toISOString().slice(0, 10);
function firstDayOf(id) {
  for (let i = 0; i < 900; i += 1) {
    const date = new Date(Date.parse("2026-01-01T12:00:00Z") + i * DAY);
    if (eventsOn(date).some((event) => event.id === id && event.dayNumber === 1)) return date;
  }
  throw new Error("no such date");
}
const FESTIVAL = firstDayOf("music-festival");

const rooms = [{ id: 1, number: "101", type: "standard", status: "libre", housekeeping_status: "clean", price: 120, capacity: 2 }];
// Career day 0 starts 4 days before the festival.
const careerState = () => ({
  status: "active",
  day: 0,
  startDate: iso(new Date(FESTIVAL.getTime() - 4 * DAY)),
  missions: [],
  objectives: [],
  storyline: { currentEventId: null, history: [] },
  skills: {},
  rewardsInbox: [],
  hotel: { rooms, reservations: [], hotelState: { finance: { revenue: [1000], costs: [0] } } },
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

beforeEach(() => {
  useCareerContext.mockReturnValue({ careerState: careerState(), isRunning: false, error: null, startCareer: jest.fn(), nextDay: jest.fn(), applyHotelAdjustment: jest.fn().mockResolvedValue(null) });
  useDashboard.mockReturnValue({ dashboardState: dashboardState(), isRunning: false, error: null, isGuest: false, loadDashboardState: jest.fn().mockResolvedValue(null), setViewMode: jest.fn(), applyQuickAction: jest.fn() });
  useGmDesk.mockReturnValue({ messages: [], applyMessageDecision: jest.fn() });
  useTfeEngine.mockReturnValue({ tfeState: null, loadTfeState: jest.fn().mockResolvedValue(null) });
  useClientsEngine.mockReturnValue({ clientsState: null, loadClientsState: jest.fn().mockResolvedValue(null) });
  useRmAdvancedEngine.mockReturnValue({ rmAdvancedState: null, loadRmAdvancedState: jest.fn().mockResolvedValue(null) });
  useProEngine.mockReturnValue({ proState: null, loadProState: jest.fn().mockResolvedValue(null) });
});

const mount = () => render(<MemoryRouter><Dashboard /></MemoryRouter>);

describe("Dashboard / event calendar", () => {
  it("shows the calendar under the Bento grid", () => {
    mount();
    const widget = screen.getByTestId("event-calendar");
    expect(widget.compareDocumentPosition(screen.getByTestId("dashboard-bento")) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(within(widget).getByRole("heading", { name: "Calendrier des événements" })).toBeInTheDocument();
  });

  it("announces the festival four days out, from the career's own date", () => {
    mount();
    expect(screen.getByTestId("calendar-when-music-festival")).toHaveTextContent("dans 4 jours");
  });

  it("preparing the prices opens the yield desk", () => {
    mount();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("calendar-prepare-music-festival"));
    expect(screen.getByRole("dialog", { name: /yield management & marketing/i })).toBeInTheDocument();
  });

  it("keeps the season banner of the day", () => {
    mount();
    expect(screen.getByTestId("season-events-banner")).toBeInTheDocument();
  });
});
