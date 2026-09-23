import { explainReview, featuredReviewOf } from "./guestReviewsEngine";

describe("guestReviewsEngine / explainReview", () => {
  it("explains a bad review with a real unresolved incident", () => {
    const hotelState = { activeIncidents: [{ status: "active", daysOpen: 2 }] };
    const explanation = explainReview({ rating: 2 }, { hotelState });
    expect(explanation.negatives[0]).toMatch(/panne/i);
    expect(explanation.businessConcept).toBe("Temps de rotation des chambres");
  });

  it("explains a bad review from poor hotel condition", () => {
    const hotelState = { maintenance: { condition: 40 } };
    const explanation = explainReview({ rating: 2 }, { hotelState });
    expect(explanation.negatives[0]).toMatch(/entretien/i);
    expect(explanation.businessConcept).toBe("Standing perçu");
  });

  it("explains a good review from excellent hotel condition", () => {
    const hotelState = { maintenance: { condition: 95 } };
    const explanation = explainReview({ rating: 5 }, { hotelState });
    expect(explanation.positives[0]).toMatch(/excellent/i);
  });

  it("credits a low reputation as a negative", () => {
    const hotelState = { progression: { player: { reputation: 30 } } };
    const explanation = explainReview({ rating: 2 }, { hotelState });
    expect(explanation.negatives.some((line) => /réputation/i.test(line))).toBe(true);
    expect(explanation.businessConcept).toBe("Effet de réputation");
  });

  it("credits a V.I.P.'s praised stay with the personal attentions", () => {
    const explanation = explainReview({ rating: 5, profile: "vip", praise: true }, { hotelState: {} });
    expect(explanation.positives.some((line) => /attentions personnalisées/i.test(line))).toBe(true);
  });

  it("falls back to the rating itself when no individual factor stood out", () => {
    const good = explainReview({ rating: 5 }, { hotelState: {} });
    expect(good.positives).toHaveLength(1);
    const bad = explainReview({ rating: 1 }, { hotelState: {} });
    expect(bad.negatives).toHaveLength(1);
  });

  it("never returns more than 2 positives or 2 negatives", () => {
    const hotelState = {
      maintenance: { condition: 30 },
      activeIncidents: [{ status: "active", daysOpen: 3 }],
      progression: { player: { reputation: 20 } },
    };
    const explanation = explainReview({ rating: 1 }, { hotelState, reservation: { arrival: "2026-09-20", departure: "2026-09-25" } });
    expect(explanation.negatives.length).toBeLessThanOrEqual(2);
  });
});

describe("guestReviewsEngine / featuredReviewOf", () => {
  it("returns null when nobody posted a review today", () => {
    expect(featuredReviewOf([])).toBeNull();
  });

  it("features the most extreme review, furthest from a neutral 3 stars", () => {
    const reviews = [{ id: "a", rating: 3 }, { id: "b", rating: 1 }, { id: "c", rating: 4 }];
    expect(featuredReviewOf(reviews).id).toBe("b");
  });

  it("breaks a tie in favor of the V.I.P.", () => {
    const reviews = [{ id: "a", rating: 5, profile: "family" }, { id: "b", rating: 5, profile: "vip" }];
    expect(featuredReviewOf(reviews).id).toBe("b");
  });
});
