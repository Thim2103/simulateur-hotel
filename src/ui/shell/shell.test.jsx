import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import StatusBar from "./StatusBar";
import NotificationCenter from "./NotificationCenter";
import { useOptionalCareerContext } from "../../context/CareerContext";
import { useOptionalGmDesk } from "../gmDesk/GmDeskProvider";
import { AppModeProvider } from "../../context/AppModeContext";

jest.mock("../../context/CareerContext");
jest.mock("../gmDesk/GmDeskProvider", () => ({ ...jest.requireActual("../gmDesk/GmDeskProvider"), useOptionalGmDesk: jest.fn() }));

const rooms = [
  { id: 1, number: "101", type: "standard", status: "occupée" },
  { id: 2, number: "102", type: "standard", status: "libre" },
  { id: 3, number: "201", type: "deluxe", status: "occupée" },
  { id: 4, number: "202", type: "deluxe", status: "occupée" },
];
const careerState = (hotelState = {}) => ({ day: 3, startDate: "2026-09-14", hotel: { rooms, reservations: [], hotelState: { finance: { revenue: [4000], costs: [1500] }, ...hotelState } } });

function Where() {
  const { pathname, hash } = useLocation();
  return <p data-testid="where">{pathname + hash}</p>;
}

const at = (path, ui) => render(<MemoryRouter initialEntries={[path]}>{ui}<Where /></MemoryRouter>);

describe("AppSidebar", () => {
  // Mode Normal (Étape 2, see context/AppModeContext.jsx) already puts
  // its own 5 simplified spaces in TopBar -- this rail would just
  // duplicate them, so it renders nothing while Mode Normal is on.
  it("renders nothing in Mode Normal", () => {
    window.localStorage.clear();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppModeProvider>
          <AppSidebar />
        </AppModeProvider>
      </MemoryRouter>
    );
    expect(screen.queryByTestId("app-sidebar")).not.toBeInTheDocument();
  });

  it("lists the five modules with their labels", () => {
    at("/dashboard", <AppSidebar />);
    const nav = screen.getByRole("navigation", { name: /modules de l'hôtel/i });
    const labels = within(nav).getAllByRole("link").map((link) => link.textContent);
    expect(labels).toEqual(["📊Tableau de bord", "🏨Exploitation & Plan", "👥Avis & Clients VIP", "📈Yield & Marketing", "⚙️RH & Maintenance"]);
  });

  it("points each module at its page", () => {
    at("/dashboard", <AppSidebar />);
    expect(screen.getByTestId("sidebar-dashboard")).toHaveAttribute("href", "/dashboard");
    expect(screen.getByTestId("sidebar-hotel")).toHaveAttribute("href", "/dashboard#hotel-plan");
    expect(screen.getByTestId("sidebar-vip")).toHaveAttribute("href", "/clients/reviews");
    expect(screen.getByTestId("sidebar-yield")).toHaveAttribute("href", "/dashboard#yield");
    expect(screen.getByTestId("sidebar-management")).toHaveAttribute("href", "/management");
  });

  it("marks only the dashboard current on /dashboard", () => {
    at("/dashboard", <AppSidebar />);
    expect(screen.getByTestId("sidebar-dashboard")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("sidebar-hotel")).not.toHaveAttribute("aria-current");
    expect(screen.getByTestId("sidebar-yield")).not.toHaveAttribute("aria-current");
  });

  it("tells the entries that share /dashboard apart by their hash", () => {
    at("/dashboard#hotel-plan", <AppSidebar />);
    expect(screen.getByTestId("sidebar-hotel")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("sidebar-dashboard")).not.toHaveAttribute("aria-current");
  });

  it.each([
    ["/dashboard#yield", "sidebar-yield"],
    ["/clients/reviews", "sidebar-vip"],
    ["/corporate/events", "sidebar-vip"],
    ["/marketing/campaigns", "sidebar-yield"],
    ["/management", "sidebar-management"],
    ["/staff/report", "sidebar-management"],
    ["/rooms", "sidebar-hotel"],
  ])("%s highlights %s", (path, testId) => {
    at(path, <AppSidebar />);
    expect(screen.getByTestId(testId)).toHaveAttribute("aria-current", "page");
  });

  it("navigates when a module is clicked", () => {
    at("/dashboard", <AppSidebar />);
    fireEvent.click(screen.getByTestId("sidebar-management"));
    expect(screen.getByTestId("where")).toHaveTextContent("/management");
    expect(screen.getByTestId("sidebar-management")).toHaveAttribute("aria-current", "page");
  });
});

describe("NotificationCenter", () => {
  const items = [
    { id: "incidents", tone: "danger", icon: "🔧", count: 2, label: "2 pannes à réparer", to: "/dashboard#hotel-plan" },
    { id: "vip", tone: "vip", icon: "👑", count: 1, label: "1 V.I.P. à accueillir", to: "/dashboard#hotel-plan" },
  ];

  it("shows the total on a red pill and says so to screen readers", () => {
    at("/", <NotificationCenter items={items} />);
    expect(screen.getByTestId("notification-pill")).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: /notifications, 3 en attente/i })).toBeInTheDocument();
  });

  it("has no pill when nothing waits, and says nothing is urgent when opened", () => {
    at("/", <NotificationCenter items={[]} />);
    expect(screen.queryByTestId("notification-pill")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /rien en attente/i }));
    expect(screen.getByText(/rien d'urgent/i)).toBeInTheDocument();
  });

  it("caps a big count", () => {
    at("/", <NotificationCenter items={[{ ...items[0], count: 150 }]} />);
    expect(screen.getByTestId("notification-pill")).toHaveTextContent("99+");
  });

  it("opens a list of links, each going where it can be dealt with, and closes on the click", () => {
    at("/", <NotificationCenter items={items} />);
    expect(screen.queryByRole("region", { name: /notifications urgentes/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("notification-bell"));
    const panel = screen.getByRole("region", { name: /notifications urgentes/i });
    expect(within(panel).getByTestId("notification-incidents")).toHaveTextContent("2 pannes à réparer");
    fireEvent.click(within(panel).getByTestId("notification-vip"));
    expect(screen.getByTestId("where")).toHaveTextContent("/dashboard#hotel-plan");
    expect(screen.queryByRole("region", { name: /notifications urgentes/i })).not.toBeInTheDocument();
  });

  it("closes on Escape and on a click elsewhere", () => {
    at("/", <NotificationCenter items={items} />);
    fireEvent.click(screen.getByTestId("notification-bell"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region", { name: /notifications urgentes/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("notification-bell"));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("region", { name: /notifications urgentes/i })).not.toBeInTheDocument();
  });
});

describe("StatusBar", () => {
  beforeEach(() => {
    useOptionalGmDesk.mockReturnValue({ messages: [] });
  });

  it("draws nothing without a career", () => {
    useOptionalCareerContext.mockReturnValue({ careerState: null });
    at("/dashboard", <StatusBar />);
    expect(screen.queryByTestId("status-bar")).not.toBeInTheDocument();
  });

  it("draws nothing outside the career provider", () => {
    useOptionalCareerContext.mockReturnValue(null);
    at("/dashboard", <StatusBar />);
    expect(screen.queryByTestId("status-bar")).not.toBeInTheDocument();
  });

  it("keeps treasury, date and season, occupancy and rating in view", () => {
    useOptionalCareerContext.mockReturnValue({ careerState: careerState({ guestReviews: [{ id: "a", day: 1, rating: 4, impact: 0.3, weight: 1, applied: 0 }] }) });
    at("/dashboard", <StatusBar />);
    expect(screen.getByRole("region", { name: /indicateurs de l'hôtel/i })).toBeInTheDocument();
    expect(screen.getByTestId("status-treasury")).toHaveTextContent(/2\s?500\s€/);
    expect(screen.getByTestId("status-date")).toHaveTextContent(/Jour 3/);
    expect(screen.getByTestId("status-date")).toHaveTextContent(/17 sept/);
    expect(screen.getByTestId("status-occupancy")).toHaveTextContent("75 % · 3/4");
    expect(screen.getByTestId("status-rating")).toHaveTextContent("4.0/5 · 1");
  });

  it("shows a dash for the rating while there is no review", () => {
    useOptionalCareerContext.mockReturnValue({ careerState: careerState() });
    at("/dashboard", <StatusBar />);
    expect(screen.getByTestId("status-rating")).toHaveTextContent("—");
  });

  it("puts the GM Desk messages and the breakdowns on the notification pill", () => {
    useOptionalGmDesk.mockReturnValue({ messages: [{ id: 1 }, { id: 2 }] });
    useOptionalCareerContext.mockReturnValue({ careerState: careerState({ activeIncidents: [{ id: "i1", status: "active", severity: "critical" }] }) });
    at("/dashboard", <StatusBar />);
    expect(screen.getByTestId("notification-pill")).toHaveTextContent("3");
    fireEvent.click(screen.getByTestId("notification-bell"));
    expect(screen.getByTestId("notification-incidents")).toHaveTextContent("1 panne à réparer dont 1 critique");
    expect(screen.getByTestId("notification-gm")).toHaveTextContent("2 messages au GM Desk");
  });

  it("is routed like any page element", () => {
    useOptionalCareerContext.mockReturnValue({ careerState: careerState() });
    render(
      <MemoryRouter initialEntries={["/x"]}>
        <Routes>
          <Route path="/x" element={<StatusBar />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("status-bar")).toBeInTheDocument();
  });
});
