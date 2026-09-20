import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DailyReview from "./DailyReview";
import { useDailyReview } from "../hooks/useDailyReview";
import { useGmDesk } from "../ui/gmDesk/GmDeskProvider";

jest.mock("../hooks/useDailyReview");
jest.mock("../ui/gmDesk/GmDeskProvider", () => ({
  ...jest.requireActual("../ui/gmDesk/GmDeskProvider"),
  useGmDesk: jest.fn(),
}));

beforeEach(() => {
  useGmDesk.mockReturnValue({ messages: [], applyMessageDecision: jest.fn() });
});

const yieldSummary = { enabled: true, adjusted: 6, raised: 4, lowered: 2, revenueDelta: 310, byRule: { occupancy: 4, lastMinute: 2 } };
const running = { id: 1, typeId: "digital", name: "Campagne digitale & réseaux sociaux", icon: "📱", daysLeft: 4, extraBookings: 3, extraRevenue: 1200, cost: 2500, roi: -0.52 };
const ended = { id: 2, typeId: "corporate", name: "Partenariat entreprises & salons", icon: "🤝", daysLeft: 0, extraBookings: 12, extraRevenue: 6000, cost: 4000, roi: 0.5 };

function reviewWith(growth, demand = null) {
  useDailyReview.mockReturnValue({
    review: { day: 4, summary: { revenue: 3000, profit: 200, satisfaction: 4, staffMorale: 60 }, causalChain: [], attentionItems: [], growth, demand },
    isRunning: false,
    error: null,
    loadReview: jest.fn().mockResolvedValue(null),
  });
}

test("reports what Yield Management did: adjusted bookings, raises and cuts, expected revenue, rules", () => {
  reviewWith({ yield: yieldSummary, marketingFactor: 1, campaigns: [], running: [], ended: [] });
  render(<DailyReview />, { wrapper: MemoryRouter });

  expect(screen.getByRole("heading", { name: /yield & marketing/i })).toBeInTheDocument();
  const block = screen.getByTestId("growth-yield");
  expect(block).toHaveTextContent(/yield management actif/i);
  expect(block).toHaveTextContent(/6 réservation\(s\) ajustée\(s\) \(4 hausse\(s\), 2 baisse\(s\)\)/);
  expect(block).toHaveTextContent(/\+310 € de revenu attendu/);
  const rules = screen.getAllByTestId("growth-yield-rule");
  expect(rules.map((rule) => rule.textContent)).toEqual(["occupation élevée ×4", "dernière minute ×2"]);
  expect(screen.queryByTestId("growth-campaigns")).not.toBeInTheDocument();
});

test("a quiet Yield day says so", () => {
  reviewWith({ yield: { ...yieldSummary, adjusted: 0, raised: 0, lowered: 0, revenueDelta: 0, byRule: {} }, marketingFactor: 1, campaigns: [], running: [], ended: [] });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("growth-yield")).toHaveTextContent(/aucune réservation à ajuster/i);
  expect(screen.queryAllByTestId("growth-yield-rule")).toHaveLength(0);
});

test("a net loss from the pricing rules is shown as a loss", () => {
  reviewWith({ yield: { ...yieldSummary, revenueDelta: -120 }, marketingFactor: 1, campaigns: [], running: [], ended: [] });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("growth-yield")).toHaveTextContent(/−120 € de revenu attendu/);
});

test("reports the marketing lift of the day and each running campaign's return so far", () => {
  reviewWith({ yield: null, marketingFactor: 1.1, campaigns: [{ typeId: "digital", name: running.name, factor: 1.1 }], running: [running], ended: [] });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("growth-campaigns")).toHaveTextContent(/demande ×1\.10 aujourd'hui/);
  const item = screen.getByTestId("growth-campaign-running");
  expect(item).toHaveAttribute("data-type", "digital");
  expect(item).toHaveTextContent(/4 jour\(s\) restant\(s\).*3 réservation\(s\) supplémentaire\(s\)/);
  expect(screen.queryByTestId("growth-yield")).not.toBeInTheDocument();
});

test("announces a campaign that ended today, with its ROI", () => {
  reviewWith({ yield: null, marketingFactor: 1, campaigns: [], running: [], ended: [ended] });
  render(<DailyReview />, { wrapper: MemoryRouter });
  const item = screen.getByTestId("growth-campaign-ended");
  expect(item).toHaveTextContent(/partenariat entreprises & salons terminée/i);
  expect(item).toHaveTextContent(/12 réservation\(s\) supplémentaire\(s\)/);
  expect(item).toHaveTextContent(/ROI \+50 %/);
});

test("a campaign that lost money shows a negative ROI", () => {
  reviewWith({ yield: null, marketingFactor: 1, campaigns: [], running: [], ended: [{ ...ended, roi: -0.4 }] });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("growth-campaign-ended")).toHaveTextContent(/ROI −40 %/);
});

test("the demand section lists the marketing factor among the drivers", () => {
  reviewWith(
    { yield: null, marketingFactor: 1.2, campaigns: [], running: [running], ended: [] },
    { tone: "strong", headline: "Demande forte (130 %) grâce à vos campagnes marketing.", newBookings: 5, turnedAway: 0, drivers: [{ key: "marketing", factor: 1.2 }] }
  );
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("demand-driver")).toHaveTextContent("Marketing ×1.20");
});

test("has no yield & marketing section when neither lever is in play", () => {
  reviewWith(null);
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.queryByRole("heading", { name: /yield & marketing/i })).not.toBeInTheDocument();
});
