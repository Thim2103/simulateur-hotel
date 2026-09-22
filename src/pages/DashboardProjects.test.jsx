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
import { activeProject, startProject } from "../lib/expansion/majorProjectsEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useDashboard");
jest.mock("../hooks/useTfeEngine");
jest.mock("../hooks/useClientsEngine");
jest.mock("../hooks/useRmAdvancedEngine");
jest.mock("../hooks/useProEngine");
jest.mock("../ui/gmDesk/GmDeskProvider", () => ({ ...jest.requireActual("../ui/gmDesk/GmDeskProvider"), useGmDesk: jest.fn() }));

const rooms = [{ id: 1, number: "101", type: "standard", status: "libre", housekeeping_status: "clean", price: 120, capacity: 2 }];
const rich = () => ({ finance: { revenue: [500000], costs: [0] }, structure: { starRating: 3 }, expansion: { availableCapital: 0 } });
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

describe("Dashboard / major projects", () => {
  it("offers the building site among the quick actions (Game Balancing V1.0, Lot 5)", () => {
    mount();
    expect(within(screen.getByTestId("quick-actions")).getByTestId("quick-projects")).toHaveTextContent("Grands chantiers");
  });

  it("opens the desk from there", () => {
    mount();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("quick-projects"));
    expect(screen.getByRole("dialog", { name: /chantiers & extensions/i })).toBeInTheDocument();
  });

  it("opens the building site desk from a #projects link (the top-bar's Hôtel menu)", () => {
    mount(rich(), { hash: "#projects" });
    expect(screen.getByRole("dialog", { name: /chantiers & extensions/i })).toBeInTheDocument();
  });

  it("opens it from the hotel plan's chip", () => {
    mount();
    const chip = screen.getByTestId("schematic-projects");
    expect(chip).toHaveAttribute("data-works", "false");
    expect(chip).toHaveAccessibleName("Grands chantiers et extensions");
    fireEvent.click(chip);
    expect(within(screen.getByRole("dialog")).getByTestId("projects-panel")).toBeInTheDocument();
  });

  it("starting a project applies it to the hotel with the career's day", () => {
    const { applyHotelAdjustment } = mount();
    fireEvent.click(screen.getByTestId("schematic-projects"));
    fireEvent.click(screen.getByTestId("project-start-spa"));
    expect(applyHotelAdjustment).toHaveBeenCalledTimes(1);
    const next = applyHotelAdjustment.mock.calls[0][0](careerState(rich()).hotel);
    expect(activeProject(next.hotelState)).toMatchObject({ id: "spa", startedOnDay: 3, completesOnDay: 10 });
  });

  it("starts a wing at the chosen size, from the #projects desk", () => {
    const { applyHotelAdjustment } = mount(rich(), { hash: "#projects" });
    fireEvent.change(screen.getByTestId("project-size-wing"), { target: { value: "15" } });
    fireEvent.click(screen.getByTestId("project-start-wing"));
    const next = applyHotelAdjustment.mock.calls[0][0](careerState(rich()).hotel);
    expect(activeProject(next.hotelState)).toMatchObject({ id: "wing", size: 15, completesOnDay: 8 });
  });

  it("shows the works under way on the chip and in the desk, day by day", () => {
    const under = startProject({ hotelState: rich() }, "eco", { day: 2 }).hotelState;
    mount(under);
    expect(screen.getByTestId("schematic-projects")).toHaveAttribute("data-works", "true");
    expect(screen.getByTestId("schematic-projects")).toHaveAccessibleName(/un chantier est en cours/);
    fireEvent.click(screen.getByTestId("schematic-projects"));
    expect(screen.getByRole("meter", { name: /avancement des travaux/i })).toHaveAttribute("aria-valuenow", "33");
  });

  it("closes", () => {
    mount(rich(), { hash: "#projects" });
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
