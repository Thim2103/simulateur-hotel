import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardBento, { QuickActions, TodaySummaryCard, SeasonCard, OccupancyRevenueCard, UrgentAlertsCard } from "./DashboardBento";

const wrap = (ui) => render(ui, { wrapper: MemoryRouter });

const rooms = [
  { id: 1, number: "101", type: "standard", status: "occupée" },
  { id: 2, number: "102", type: "standard", status: "occupée" },
  { id: 3, number: "103", type: "standard", status: "libre" },
  { id: 4, number: "104", type: "standard", status: "occupée" },
];
const review = (extra = {}) => ({
  summary: { revenue: 3200, profit: 450, satisfaction: 4.2, staffMorale: 68 },
  causalChain: ["Première cause", "Deuxième cause", "Troisième cause", "Quatrième cause", "Cinquième cause"],
  ...extra,
});
const calendar = (extra = {}) => ({
  date: "2026-09-16",
  season: { id: "summer", label: "Haute saison", icon: "☀️", tier: "high", demandPercent: 20, effects: [] },
  ongoing: [],
  upcoming: [],
  ended: [],
  ...extra,
});

describe("QuickActions", () => {
  it("opens the yield & marketing desk from the pricing and the campaign buttons", () => {
    const onOpenGrowth = jest.fn();
    wrap(<QuickActions onOpenGrowth={onOpenGrowth} />);
    fireEvent.click(screen.getByRole("button", { name: /ajuster tarifs \(yield\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /lancer campagne/i }));
    expect(onOpenGrowth).toHaveBeenCalledTimes(2);
  });

  it("links to the reviews, with the number of bad ones waiting", () => {
    wrap(<QuickActions onOpenGrowth={jest.fn()} reviewsToAnswer={3} />);
    const link = screen.getByRole("link", { name: /répondre aux avis/i });
    expect(link).toHaveAttribute("href", "/clients/reviews");
    expect(screen.getByTestId("quick-reviews-count")).toHaveTextContent("3");
  });

  it("shows no count when no review waits", () => {
    wrap(<QuickActions onOpenGrowth={jest.fn()} />);
    expect(screen.queryByTestId("quick-reviews-count")).not.toBeInTheDocument();
  });
});

describe("TodaySummaryCard", () => {
  it("says results are coming before the first day", () => {
    wrap(<TodaySummaryCard review={null} />);
    expect(screen.getByRole("heading", { name: "Résumé de la journée" })).toBeInTheDocument();
    expect(screen.getByText(/pas encore de résultats/i)).toBeInTheDocument();
  });

  it("gives the four figures of the day", () => {
    wrap(<TodaySummaryCard review={review()} />);
    const card = screen.getByTestId("bento-summary");
    expect(within(card).getByText("Recette").nextSibling).toHaveTextContent(/3\s?200\s€/);
    expect(within(card).getByText("Résultat").nextSibling).toHaveTextContent(/450\s€/);
    expect(within(card).getByText("Satisfaction").nextSibling).toHaveTextContent("4.2/5");
    expect(within(card).getByText("Moral équipe").nextSibling).toHaveTextContent("68/100");
  });

  it("shows the first four causes only, numbered, and links to the full report", () => {
    wrap(<TodaySummaryCard review={review()} />);
    const items = within(screen.getByTestId("bento-causal-chain")).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent("1Première cause");
    expect(screen.queryByText("Cinquième cause")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voir le rapport complet/i })).toHaveAttribute("href", "/daily-review");
  });

  it("copes with missing figures and no causes", () => {
    wrap(<TodaySummaryCard review={review({ summary: { revenue: 0, profit: 0, satisfaction: null, staffMorale: undefined }, causalChain: [] })} />);
    const card = screen.getByTestId("bento-summary");
    expect(within(card).getByText("Satisfaction").nextSibling).toHaveTextContent("—");
    expect(within(card).getByText("Moral équipe").nextSibling).toHaveTextContent("—");
    expect(screen.queryByTestId("bento-causal-chain")).not.toBeInTheDocument();
  });
});

describe("SeasonCard", () => {
  it("shows the season and normal weather", () => {
    wrap(<SeasonCard calendar={calendar()} />);
    expect(screen.getByTestId("bento-weather")).toHaveTextContent("Météo : conditions normales");
    expect(screen.getByTestId("season-badge")).toHaveTextContent("Haute saison");
  });

  it("reports a heat or cold wave as the weather", () => {
    wrap(<SeasonCard calendar={calendar({ ongoing: [{ id: "heat", kind: "climate", name: "Canicule", icon: "🔥", description: "", effects: [], dayNumber: 1, totalDays: 3, endsToday: false }] })} />);
    expect(screen.getByTestId("bento-weather")).toHaveTextContent("Météo : Canicule");
  });

  it("does not break without a calendar", () => {
    wrap(<SeasonCard calendar={null} />);
    expect(screen.getByTestId("bento-weather")).toHaveTextContent("conditions normales");
  });
});

describe("OccupancyRevenueCard", () => {
  it("shows the occupancy gauge and the rooms sold tonight", () => {
    wrap(<OccupancyRevenueCard rooms={rooms} kpis={{ revenueToday: 1800 }} hotelState={{}} />);
    expect(screen.getByRole("img", { name: "Occupation : 75 %" })).toBeInTheDocument();
    const card = screen.getByTestId("bento-occupancy");
    expect(card).toHaveTextContent("3 chambres sur 4 ce soir");
    expect(card).toHaveTextContent(/recette du dernier jour\s*1\s?800\s€/);
  });

  it("draws the revenue curve of the last 14 days once there are two", () => {
    const revenue = Array.from({ length: 20 }, (_, i) => 1000 + i * 10);
    wrap(<OccupancyRevenueCard rooms={rooms} kpis={null} hotelState={{ finance: { revenue } }} />);
    expect(screen.getByRole("img", { name: "Revenus des 14 derniers jours" })).toBeInTheDocument();
  });

  it("promises the curve for later while there is none", () => {
    wrap(<OccupancyRevenueCard rooms={rooms} kpis={null} hotelState={{ finance: { revenue: [1000] } }} />);
    expect(screen.getByText(/apparaîtra après quelques journées/i)).toBeInTheDocument();
  });

  it("is happy with no rooms at all", () => {
    wrap(<OccupancyRevenueCard rooms={[]} kpis={null} hotelState={undefined} />);
    expect(screen.getByRole("img", { name: "Occupation : 0 %" })).toBeInTheDocument();
  });
});

describe("UrgentAlertsCard", () => {
  it("lists the urgent things as links", () => {
    wrap(<UrgentAlertsCard items={[{ id: "vip", tone: "vip", icon: "👑", count: 2, label: "2 V.I.P. à accueillir", to: "/dashboard#hotel-plan" }, { id: "reviews", tone: "danger", icon: "⭐", count: 1, label: "1 avis négatif sans réponse", to: "/clients/reviews" }]} />);
    expect(screen.getByRole("heading", { name: "Alertes urgentes" })).toBeInTheDocument();
    expect(screen.getByTestId("alert-vip")).toHaveAttribute("href", "/dashboard#hotel-plan");
    expect(screen.getByTestId("alert-reviews")).toHaveTextContent("1 avis négatif sans réponse");
  });

  it("says nothing is urgent", () => {
    wrap(<UrgentAlertsCard items={[]} />);
    expect(screen.getByText(/rien d'urgent/i)).toBeInTheDocument();
  });
});

describe("DashboardBento", () => {
  it("lays out the four cards in one grid", () => {
    wrap(<DashboardBento review={review()} calendar={calendar()} rooms={rooms} kpis={{ revenueToday: 1 }} hotelState={{}} alerts={[]} />);
    const grid = screen.getByTestId("dashboard-bento");
    expect(grid).toHaveClass("bento-grid");
    ["bento-summary", "bento-season", "bento-occupancy", "bento-alerts"].forEach((id) => expect(within(grid).getByTestId(id)).toBeInTheDocument());
  });
});
