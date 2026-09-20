import { render, screen, fireEvent } from "@testing-library/react";
import ReviewResponseModal, { points } from "./ReviewResponseModal";
import { baseImpact, listReviews, respondToReview } from "../../lib/clients/guestReviewEngine";

const review = (id, rating, extra = {}) => ({
  id: `stay:${id}`, source: "stay", reservationId: id, guestName: `Client ${id}`, profile: "family", weight: 1, roomNumber: "101", nights: 2, nightPrice: 110,
  rating, text: "Trop de désagréments pour le prix payé.", day: 3, date: "2026-09-12", impact: baseImpact(rating, 1), applied: 0, ...extra,
});
const vip = (id, rating) => review(id, rating, { profile: "vip", weight: 3, impact: baseImpact(rating, 3) });
const stateWith = (reviews, extra = {}) => ({ finance: { revenue: [10000], costs: [0] }, guestReviews: reviews, ...extra });
const compact = (text) => text.replace(/\s| | /g, "");

function renderModal(hotelState, reviewId, props = {}) {
  const found = listReviews(hotelState).find((item) => item.id === reviewId);
  return render(<ReviewResponseModal hotelState={hotelState} review={found} onRespond={jest.fn()} onClose={jest.fn()} {...props} />);
}

describe("ReviewResponseModal / the review", () => {
  it("shows the stars, the text and what the review is worth", () => {
    renderModal(stateWith([review(1, 1)]), "stay:1");
    expect(screen.getByRole("dialog", { name: /répondre à un avis/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Note 1 sur 5")).toHaveTextContent("★☆☆☆☆");
    expect(screen.getByTestId("response-review")).toHaveTextContent("Trop de désagréments");
    expect(screen.getByTestId("response-impact")).toHaveTextContent("−1,2");
  });

  it("names the guest's profile, and flags a V.I.P.'s triple weight", () => {
    renderModal(stateWith([vip(1, 1)]), "stay:1");
    expect(screen.getByTestId("response-profile")).toHaveTextContent(/influenceur \/ v\.i\.p\./i);
    expect(screen.getByTestId("response-review")).toHaveTextContent("poids ×3");
    expect(screen.getByTestId("response-impact")).toHaveTextContent("−3,6");
  });

  it("an ordinary guest has no weight badge", () => {
    renderModal(stateWith([review(1, 1)]), "stay:1");
    expect(screen.getByTestId("response-review")).not.toHaveTextContent(/poids/i);
  });

  it("formats the points with a real minus sign and a decimal comma", () => {
    expect(points(-1.2)).toBe("−1,2");
    expect(points(0.6)).toBe("+0,6");
    expect(points(0)).toBe("0,0");
  });
});

describe("ReviewResponseModal / the answers to a bad review", () => {
  it("offers the four answers, each with what it does to the impact", () => {
    renderModal(stateWith([review(1, 1)]), "stay:1");
    ["courteous", "gesture", "ignore", "aggressive"].forEach((type) => expect(screen.getByTestId(`response-option-${type}`)).toBeInTheDocument());
    expect(screen.getByTestId("response-option-courteous")).toHaveTextContent("−1,2 → −0,7");
    expect(screen.getByTestId("response-option-gesture")).toHaveTextContent("−1,2 → −0,1");
    expect(screen.getByTestId("response-option-ignore")).toHaveTextContent("−1,2 → −1,5");
    expect(screen.getByTestId("response-option-aggressive")).toHaveTextContent("−1,2 → −2,3");
  });

  it("the commercial gesture shows its cost, the free answers none", () => {
    renderModal(stateWith([review(1, 1)]), "stay:1");
    expect(compact(screen.getByTestId("response-option-gesture").textContent)).toContain("110€");
    expect(compact(screen.getByTestId("response-option-courteous").textContent)).not.toContain("€");
  });

  it("choosing an answer calls onRespond with it, once even if clicked again", () => {
    const onRespond = jest.fn();
    renderModal(stateWith([review(1, 1)]), "stay:1", { onRespond });
    fireEvent.click(screen.getByTestId("response-choose-gesture"));
    fireEvent.click(screen.getByTestId("response-choose-gesture"));
    fireEvent.click(screen.getByTestId("response-choose-courteous"));
    expect(onRespond).toHaveBeenCalledTimes(1);
    expect(onRespond).toHaveBeenCalledWith("gesture");
  });

  it("a gesture the treasury can't pay for is disabled, with the reason", () => {
    renderModal(stateWith([review(1, 1)], { finance: { revenue: [20], costs: [0] } }), "stay:1");
    expect(screen.getByTestId("response-choose-gesture")).toBeDisabled();
    expect(screen.getByTestId("response-option-gesture")).toHaveTextContent(/trésorerie insuffisante/i);
    expect(screen.getByTestId("response-choose-courteous")).toBeEnabled();
  });

  it("a V.I.P.'s review scales every figure", () => {
    renderModal(stateWith([vip(1, 1)]), "stay:1");
    expect(screen.getByTestId("response-option-courteous")).toHaveTextContent("−3,6 → −2,1");
    expect(screen.getByTestId("response-option-aggressive")).toHaveTextContent("−3,6 → −6,9");
  });
});

describe("ReviewResponseModal / other reviews", () => {
  it("a good review can only be thanked or left alone", () => {
    renderModal(stateWith([review(1, 5)]), "stay:1");
    expect(screen.getByTestId("response-option-courteous")).toHaveTextContent("+0,6 → +0,8");
    expect(screen.getByTestId("response-option-ignore")).toBeInTheDocument();
    expect(screen.queryByTestId("response-option-gesture")).not.toBeInTheDocument();
    expect(screen.queryByTestId("response-option-aggressive")).not.toBeInTheDocument();
  });

  it("a review already answered says so and offers nothing", () => {
    const answered = respondToReview({ hotelState: stateWith([review(1, 1)]) }, "stay:1", "courteous", { day: 4 }).hotelState;
    renderModal(answered, "stay:1");
    expect(screen.getByTestId("response-done")).toHaveTextContent(/déjà répondu/i);
    expect(screen.queryByTestId("response-option-gesture")).not.toBeInTheDocument();
    expect(screen.getByTestId("response-impact")).toHaveTextContent("−0,7");
  });

  it("a breakdown review can be answered too, without a profile", () => {
    const state = { finance: { revenue: [10000], costs: [0] }, incidentReviews: [{ id: "review:i1:4", incidentId: "i1", zone: "laundry", day: 4, rating: 1, text: "Buanderie HS" }] };
    renderModal(state, "review:i1:4");
    expect(screen.queryByTestId("response-profile")).not.toBeInTheDocument();
    expect(compact(screen.getByTestId("response-option-gesture").textContent)).toContain("150€");
  });

  it("closes through its close button", () => {
    const onClose = jest.fn();
    renderModal(stateWith([review(1, 1)]), "stay:1", { onClose });
    fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
