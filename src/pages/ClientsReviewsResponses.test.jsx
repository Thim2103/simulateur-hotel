import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClientsReviews from "./ClientsReviews";
import { useCareerContext } from "../context/CareerContext";
import { useClientsEngine } from "../hooks/useClientsEngine";
import { baseImpact, respondToReview } from "../lib/clients/guestReviewEngine";

vi.mock("../context/CareerContext");
vi.mock("../hooks/useClientsEngine");
vi.mock("../components/charts/LineChart", () => ({ default: () => null }));
vi.mock("../components/charts/AreaChart", () => ({ default: () => null }));

const review = (id, rating, extra = {}) => ({
  id: `stay:${id}`, source: "stay", reservationId: id, guestName: `Client ${id}`, profile: "family", weight: 1, roomNumber: `10${id}`, nights: 2, nightPrice: 110,
  rating, text: `Avis numéro ${id}`, day: 3, date: "2026-09-12", impact: baseImpact(rating, 1), applied: 0, ...extra,
});
const vip = (id, rating) => review(id, rating, { profile: "vip", weight: 3, impact: baseImpact(rating, 3) });

function setup(hotelState, { applyHotelAdjustment = jest.fn().mockResolvedValue(null) } = {}) {
  const state = { day: 4, status: "active", hotel: { hotelState: { finance: { revenue: [10000], costs: [0] }, ...hotelState } }, missions: [], objectives: [] };
  useCareerContext.mockReturnValue({ careerState: state, isRunning: false, error: null, applyHotelAdjustment });
  useClientsEngine.mockReturnValue({
    clientsState: { satisfaction: 68, loyalty: 55, reviews: { avgRating: 3.9, count: 18, positive: 76, negative: 11, trend: "stable" }, complaints: [], replayLog: { entries: [] } },
    isRunning: false,
    error: null,
    loadClientsState: jest.fn().mockResolvedValue(null),
    applyClientsAction: jest.fn().mockResolvedValue(null),
  });
  render(<ClientsReviews />, { wrapper: MemoryRouter });
  return { applyHotelAdjustment };
}

describe("Clients / Avis: the reviews of the stays", () => {
  it("says so when there is none yet", () => {
    setup({});
    expect(screen.getByText(/aucun avis de séjour pour l'instant/i)).toBeInTheDocument();
  });

  it("lists each review with its stars, guest, room, profile and text", () => {
    setup({ guestReviews: [review(1, 5), vip(2, 1)] });
    const cards = screen.getAllByTestId("stay-review");
    expect(cards).toHaveLength(2);
    const vipCard = cards.find((card) => card.getAttribute("data-profile") === "vip");
    expect(vipCard).toHaveAttribute("data-vip", "true");
    expect(vipCard).toHaveTextContent(/influenceur \/ v\.i\.p\./i);
    expect(vipCard).toHaveTextContent("Poids ×3");
    expect(vipCard).toHaveTextContent("Avis numéro 2");
    expect(vipCard).toHaveTextContent("Client 2 · chambre 102");
    expect(within(vipCard).getByLabelText("Note 1 sur 5")).toBeInTheDocument();
  });

  it("a bad review offers to answer or offer a commercial gesture, a good one just to answer", () => {
    setup({ guestReviews: [review(1, 5), review(2, 1)] });
    expect(screen.getByTestId("respond-stay:2")).toHaveTextContent(/répondre \/ offrir un geste commercial/i);
    expect(screen.getByTestId("respond-stay:1")).toHaveTextContent(/^répondre$/i);
  });

  it("filters: to do (bad and unanswered), V.I.P., answered", () => {
    const answered = respondToReview({ hotelState: { finance: { revenue: [10000], costs: [0] }, guestReviews: [review(3, 1)] } }, "stay:3", "courteous", { day: 4 }).hotelState;
    setup({ guestReviews: [review(1, 5), review(2, 1), vip(4, 1), review(3, 1)], reviewResponses: answered.reviewResponses });
    const group = within(screen.getByRole("group", { name: /filtrer les avis de séjour/i }));
    fireEvent.click(group.getByRole("button", { name: "À traiter" }));
    expect(screen.getAllByTestId("stay-review").map((card) => card.textContent)).toEqual(expect.arrayContaining([expect.stringContaining("Avis numéro 2"), expect.stringContaining("Avis numéro 4")]));
    expect(screen.getAllByTestId("stay-review")).toHaveLength(2);
    fireEvent.click(group.getByRole("button", { name: "V.I.P." }));
    expect(screen.getAllByTestId("stay-review")).toHaveLength(1);
    fireEvent.click(group.getByRole("button", { name: "Répondus" }));
    expect(screen.getAllByTestId("stay-review")).toHaveLength(1);
    expect(screen.getByTestId("stay-review")).toHaveTextContent("Avis numéro 3");
    fireEvent.click(group.getByRole("button", { name: "Tous" }));
    expect(screen.getAllByTestId("stay-review")).toHaveLength(4);
  });

  it("an answered review shows its answer instead of the button", () => {
    const answered = respondToReview({ hotelState: { finance: { revenue: [10000], costs: [0] }, guestReviews: [review(1, 1)] } }, "stay:1", "gesture", { day: 4 }).hotelState;
    setup({ guestReviews: [review(1, 1)], reviewResponses: answered.reviewResponses });
    expect(screen.queryByTestId("respond-stay:1")).not.toBeInTheDocument();
    expect(screen.getByTestId("stay-review")).toHaveTextContent(/répondu : geste commercial/i);
  });
});

describe("Clients / Avis: answering", () => {
  it("opens the response modal on the review", () => {
    setup({ guestReviews: [review(1, 1)] });
    fireEvent.click(screen.getByTestId("respond-stay:1"));
    expect(screen.getByRole("dialog", { name: /répondre à un avis/i })).toBeInTheDocument();
    expect(screen.getByTestId("response-review")).toHaveTextContent("Avis numéro 1");
  });

  it("choosing an answer applies it to the hotel through applyHotelAdjustment, then closes the modal", async () => {
    const { applyHotelAdjustment } = setup({ guestReviews: [review(1, 1)] });
    fireEvent.click(screen.getByTestId("respond-stay:1"));
    fireEvent.click(screen.getByTestId("response-choose-gesture"));
    expect(applyHotelAdjustment).toHaveBeenCalledTimes(1);
    const updater = applyHotelAdjustment.mock.calls[0][0];
    const next = updater({ hotelState: { finance: { revenue: [10000], costs: [0] }, guestReviews: [review(1, 1)] } });
    expect(next.hotelState.reviewResponses["stay:1"]).toMatchObject({ type: "gesture", day: 4, cost: 110 });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closing the modal answers nothing", () => {
    const { applyHotelAdjustment } = setup({ guestReviews: [review(1, 1)] });
    fireEvent.click(screen.getByTestId("respond-stay:1"));
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(applyHotelAdjustment).not.toHaveBeenCalled();
  });

  it("the breakdown reviews can be answered too", () => {
    setup({
      activeIncidents: [{ id: "i1", zone: "laundry", status: "active" }],
      incidentReviews: [{ id: "review:i1:3", incidentId: "i1", zone: "laundry", severity: "moderate", day: 3, rating: 1, text: "Buanderie HS" }],
    });
    const card = screen.getByTestId("incident-review");
    fireEvent.click(within(card).getByRole("button", { name: /répondre \/ offrir un geste commercial/i }));
    expect(screen.getByRole("dialog", { name: /répondre à un avis/i })).toBeInTheDocument();
    expect(screen.getByTestId("response-review")).toHaveTextContent("Buanderie HS");
  });
});

describe("Clients / Avis: the front page", () => {
  it("shows the feature articles glowing V.I.P. reviews earned, newest first", () => {
    setup({
      pressHighlights: [
        { id: "press:stay:1", day: 3, guestName: "Client 1", followers: 90000, headline: "« Un séjour d'exception » — Client 1 encense l'hôtel devant 90 000 abonnés", text: "Bravo à l'équipe." },
        { id: "press:stay:2", day: 5, guestName: "Client 2", followers: 200000, headline: "« Un séjour d'exception » — Client 2 encense l'hôtel devant 200 000 abonnés", text: "Un accueil de rêve." },
      ],
    });
    expect(screen.getByRole("heading", { name: /à la une/i })).toBeInTheDocument();
    const articles = screen.getAllByTestId("press-highlight");
    expect(articles).toHaveLength(2);
    expect(articles[0]).toHaveTextContent("Client 2");
    expect(articles[0]).toHaveTextContent("Un accueil de rêve.");
    expect(articles[1]).toHaveTextContent("Client 1");
  });

  it("has no front page until a V.I.P. has been won over", () => {
    setup({});
    expect(screen.queryByRole("heading", { name: /à la une/i })).not.toBeInTheDocument();
  });
});
