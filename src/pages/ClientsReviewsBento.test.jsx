import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClientsReviews from "./ClientsReviews";
import { useCareerContext } from "../context/CareerContext";
import { useClientsEngine } from "../hooks/useClientsEngine";
import { baseImpact } from "../lib/clients/guestReviewEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useClientsEngine");
jest.mock("../components/charts/LineChart", () => () => null);
jest.mock("../components/charts/AreaChart", () => () => null);

const review = (id, rating, extra = {}) => ({
  id: `stay:${id}`, source: "stay", reservationId: id, guestName: `Client ${id}`, profile: "family", weight: 1, roomNumber: `10${id}`, nights: 2, nightPrice: 110,
  rating, text: `Avis numéro ${id}`, day: 3, date: "2026-09-12", impact: baseImpact(rating, 1), applied: 0, ...extra,
});
const vip = (id, rating) => review(id, rating, { profile: "vip", weight: 3, impact: baseImpact(rating, 3) });

function setup(hotelState) {
  const state = { day: 4, status: "active", hotel: { hotelState: { finance: { revenue: [10000], costs: [0] }, ...hotelState } }, missions: [], objectives: [] };
  useCareerContext.mockReturnValue({ careerState: state, isRunning: false, error: null, applyHotelAdjustment: jest.fn().mockResolvedValue(null) });
  useClientsEngine.mockReturnValue({
    clientsState: { satisfaction: 68, loyalty: 55, reviews: { avgRating: 3.9, count: 18, positive: 76, negative: 11, trend: "stable" }, complaints: [], replayLog: { entries: [] } },
    isRunning: false,
    error: null,
    loadClientsState: jest.fn().mockResolvedValue(null),
    applyClientsAction: jest.fn().mockResolvedValue(null),
  });
  render(<ClientsReviews />, { wrapper: MemoryRouter });
}

describe("Clients / Avis as Bento cards", () => {
  it("shows the stars in gold, the empty ones muted, still one 'Note x sur 5'", () => {
    setup({ guestReviews: [review(1, 4)] });
    const stars = within(screen.getByTestId("stay-review")).getByLabelText("Note 4 sur 5");
    expect(stars).toHaveTextContent("★★★★☆");
    expect(within(stars).getByText("★★★★")).toHaveClass("text-[#f5b301]");
    expect(within(stars).getByText("☆")).toHaveClass("text-slate-300");
  });

  it.each([
    ["family", "Familial", "success"],
    ["business", "Business", "action"],
    ["long-stay", "Long séjour", "mice"],
    ["vip", "V.I.P.", "vip"],
  ])("the %s profile badge is %s in the %s tone", (profile, label, tone) => {
    setup({ guestReviews: [review(1, 4, { profile })] });
    const badge = within(screen.getByTestId("stay-review")).getByText(new RegExp(label.replace(/\./g, "\\."), "i"));
    expect(badge).toHaveClass("badge-status");
    expect(badge).toHaveAttribute("data-tone", tone);
  });

  it("marks a bad review still waiting as 'À traiter', with a red answer button", () => {
    setup({ guestReviews: [review(1, 1)] });
    expect(screen.getByTestId("todo-stay:1")).toHaveTextContent("À traiter");
    expect(screen.getByTestId("todo-stay:1")).toHaveAttribute("data-tone", "danger");
    expect(screen.getByTestId("respond-stay:1")).toHaveAttribute("data-tone", "danger");
  });

  it("a good review needs no tag, just an ordinary answer button", () => {
    setup({ guestReviews: [review(1, 5)] });
    expect(screen.queryByTestId("todo-stay:1")).not.toBeInTheDocument();
    expect(screen.getByTestId("respond-stay:1")).toHaveAttribute("data-tone", "action");
  });

  it("tags an answered review 'Répondu', without the button or the 'À traiter' tag", () => {
    setup({ guestReviews: [review(1, 1)], reviewResponses: { "stay:1": { type: "courteous", day: 4, cost: 0, applied: 0 } } });
    expect(screen.getByTestId("answered-stay:1")).toHaveTextContent(/^✅Répondu/);
    expect(screen.queryByTestId("todo-stay:1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("respond-stay:1")).not.toBeInTheDocument();
  });

  it("frames a V.I.P.'s review in gold and shows its weight", () => {
    setup({ guestReviews: [vip(2, 5), review(1, 3)] });
    const cards = screen.getAllByTestId("stay-review");
    const vipCard = cards.find((card) => card.getAttribute("data-vip") === "true");
    expect(vipCard).toHaveClass("border-amber-300");
    expect(within(vipCard).getByText("Poids ×3")).toHaveAttribute("data-tone", "vip");
    const other = cards.find((card) => card.getAttribute("data-vip") === "false");
    expect(other).not.toHaveClass("border-amber-300");
  });

  it("lifts the front page in a golden frame", () => {
    setup({ pressHighlights: [{ id: "press:1", day: 3, guestName: "Client 2", followers: 90000, headline: "Un séjour de rêve", text: "Un hôtel exceptionnel" }] });
    const article = screen.getByTestId("press-highlight");
    expect(article).toHaveClass("border-amber-300/70");
    expect(article).toHaveTextContent("Un séjour de rêve");
  });

  it("filters are soft chips, the pressed one filled", () => {
    setup({ guestReviews: [review(1, 5)] });
    const group = within(screen.getByRole("group", { name: /filtrer les avis de séjour/i }));
    expect(group.getByRole("button", { name: "Tous" })).toHaveClass("bg-[var(--ds-action)]");
    expect(group.getByRole("button", { name: "V.I.P." })).toHaveClass("bg-slate-100");
  });

  it("a breakdown review gets a stars row and a technical-problem badge", () => {
    setup({
      incidentReviews: [{ id: "inc:1", incidentId: "i1", day: 3, rating: 2, text: "La laverie était en panne", zone: "laundry" }],
      activeIncidents: [{ id: "i1", zone: "laundry", status: "active", severity: "minor", message: "x" }],
    });
    const card = screen.getByTestId("incident-review");
    expect(within(card).getByLabelText("Note 2 sur 5")).toBeInTheDocument();
    expect(within(card).getByText("Problème technique")).toHaveAttribute("data-tone", "vip");
    expect(within(card).getByText("Panne en cours")).toHaveAttribute("data-tone", "danger");
  });
});
