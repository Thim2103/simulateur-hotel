import {
  GRACE_DAYS,
  REPUTATION_PENALTY_PER_DAY,
  SATISFACTION_PENALTY,
  MAX_SATISFACTION_PENALTY,
  REPAIRING_ATTENUATION,
  openIncidents,
  incidentReputationPenalty,
  incidentSatisfactionPenalty,
  generateIncidentReviews,
  appendIncidentReviews,
  buildIncidentReviewHistory,
} from "./incidentImpact";

function incident(overrides = {}) {
  return { id: "i1", zone: "laundry", severity: "critical", status: "active", daysOpen: 0, ...overrides };
}
const stateWith = (...incidents) => ({ activeIncidents: incidents });

describe("incidentImpact / openIncidents", () => {
  it("keeps active and repairing incidents, drops resolved ones", () => {
    const state = stateWith(incident({ id: "a" }), incident({ id: "b", status: "repairing" }), incident({ id: "c", status: "resolved" }));
    expect(openIncidents(state).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("handles a missing hotel state", () => {
    expect(openIncidents(undefined)).toEqual([]);
  });
});

describe("incidentImpact / reputation penalty", () => {
  it("is 0 for no incidents", () => {
    expect(incidentReputationPenalty({})).toBe(0);
  });

  it("is 0 within the grace period -- a fresh incident costs no reputation yet", () => {
    expect(incidentReputationPenalty(stateWith(incident({ daysOpen: GRACE_DAYS - 1 })))).toBe(0);
  });

  it("applies the per-severity malus once past the grace period", () => {
    expect(incidentReputationPenalty(stateWith(incident({ severity: "minor", daysOpen: GRACE_DAYS })))).toBe(REPUTATION_PENALTY_PER_DAY.minor);
    expect(incidentReputationPenalty(stateWith(incident({ severity: "critical", daysOpen: GRACE_DAYS })))).toBe(REPUTATION_PENALTY_PER_DAY.critical);
  });

  it("is attenuated while a repair is underway", () => {
    const penalty = incidentReputationPenalty(stateWith(incident({ status: "repairing", daysOpen: 2 })));
    expect(penalty).toBe(REPUTATION_PENALTY_PER_DAY.critical * REPAIRING_ATTENUATION);
  });

  it("is 0 once resolved", () => {
    expect(incidentReputationPenalty(stateWith(incident({ status: "resolved", daysOpen: 5 })))).toBe(0);
  });

  it("stacks across several open incidents", () => {
    const state = stateWith(incident({ id: "a", severity: "minor", daysOpen: 2 }), incident({ id: "b", severity: "moderate", daysOpen: 2 }));
    expect(incidentReputationPenalty(state)).toBe(REPUTATION_PENALTY_PER_DAY.minor + REPUTATION_PENALTY_PER_DAY.moderate);
  });
});

describe("incidentImpact / satisfaction penalty", () => {
  it("is immediate (no grace period) and severity-based", () => {
    expect(incidentSatisfactionPenalty(stateWith(incident({ severity: "moderate", daysOpen: 0 })))).toBe(SATISFACTION_PENALTY.moderate);
  });

  it("is attenuated while repairing and 0 when resolved", () => {
    expect(incidentSatisfactionPenalty(stateWith(incident({ status: "repairing" })))).toBe(SATISFACTION_PENALTY.critical * REPAIRING_ATTENUATION);
    expect(incidentSatisfactionPenalty(stateWith(incident({ status: "resolved" })))).toBe(0);
  });

  it("is capped", () => {
    const many = Array.from({ length: 10 }, (_, i) => incident({ id: `i${i}` }));
    expect(incidentSatisfactionPenalty(stateWith(...many))).toBe(MAX_SATISFACTION_PENALTY);
  });
});

describe("incidentImpact / generateIncidentReviews", () => {
  it("writes one review per open incident, none for resolved ones", () => {
    const reviews = generateIncidentReviews(stateWith(incident({ id: "a" }), incident({ id: "b", status: "resolved" })), 4);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({ incidentId: "a", zone: "laundry", day: 4, severity: "critical" });
    expect(reviews[0].text).toEqual(expect.any(String));
  });

  it("uses a laundry-specific wording for a laundry incident", () => {
    const [review] = generateIncidentReviews(stateWith(incident()), 1);
    expect(review.text).toMatch(/machine à laver|buanderie/i);
  });

  it("falls back to a generic wording for an unknown zone", () => {
    const [review] = generateIncidentReviews(stateWith(incident({ zone: "mystery" })), 1);
    expect(review.text).toMatch(/panne/i);
  });

  it("rates worse for a more severe incident and for one dragging on", () => {
    const rate = (overrides) => generateIncidentReviews(stateWith(incident(overrides)), 1)[0].rating;
    expect(rate({ severity: "critical" })).toBeLessThan(rate({ severity: "minor" }));
    expect(rate({ severity: "moderate", daysOpen: 3 })).toBeLessThan(rate({ severity: "moderate", daysOpen: 0 }));
  });

  it("rates better and words differently while a repair is underway", () => {
    const [open] = generateIncidentReviews(stateWith(incident({ severity: "moderate" })), 1);
    const [repairing] = generateIncidentReviews(stateWith(incident({ severity: "moderate", status: "repairing" })), 1);
    expect(repairing.rating).toBeGreaterThan(open.rating);
    expect(repairing.text).not.toBe(open.text);
  });

  it("keeps ratings within 1..5", () => {
    const [worst] = generateIncidentReviews(stateWith(incident({ severity: "critical", daysOpen: 9 })), 1);
    expect(worst.rating).toBe(1);
  });

  it("is deterministic -- same input, same review", () => {
    const state = stateWith(incident());
    expect(generateIncidentReviews(state, 3)).toEqual(generateIncidentReviews(state, 3));
  });
});

describe("incidentImpact / appendIncidentReviews", () => {
  it("appends today's reviews to hotelState.incidentReviews", () => {
    const next = appendIncidentReviews(stateWith(incident()), 2);
    expect(next.incidentReviews).toHaveLength(1);
    expect(next.incidentReviews[0].day).toBe(2);
  });

  it("is idempotent for the same (incident, day)", () => {
    const once = appendIncidentReviews(stateWith(incident()), 2);
    const twice = appendIncidentReviews(once, 2);
    expect(twice.incidentReviews).toHaveLength(1);
  });

  it("accumulates one new review per day", () => {
    const day2 = appendIncidentReviews(stateWith(incident()), 2);
    const day3 = appendIncidentReviews(day2, 3);
    expect(day3.incidentReviews.map((r) => r.day)).toEqual([2, 3]);
  });

  it("caps the stored history", () => {
    let state = stateWith(incident());
    for (let day = 1; day <= 40; day += 1) state = appendIncidentReviews(state, day);
    expect(state.incidentReviews).toHaveLength(30);
    expect(state.incidentReviews[29].day).toBe(40);
  });

  it("adds nothing when no incident is open", () => {
    expect(appendIncidentReviews({}, 1).incidentReviews).toEqual([]);
  });
});

describe("incidentImpact / buildIncidentReviewHistory", () => {
  it("lists stored reviews newest first, tagged with their incident's current status", () => {
    const hotelState = {
      activeIncidents: [
        { id: "a", status: "resolved" },
        { id: "b", status: "active" },
      ],
      incidentReviews: [
        { id: "r1", incidentId: "a", day: 1 },
        { id: "r2", incidentId: "b", day: 3 },
        { id: "r3", incidentId: "a", day: 2 },
      ],
    };
    const history = buildIncidentReviewHistory(hotelState);
    expect(history.map((r) => [r.id, r.incidentStatus])).toEqual([
      ["r2", "active"],
      ["r3", "resolved"],
      ["r1", "resolved"],
    ]);
  });

  it("marks a review whose incident record is gone as unknown", () => {
    const history = buildIncidentReviewHistory({ incidentReviews: [{ id: "r1", incidentId: "gone", day: 1 }] });
    expect(history[0].incidentStatus).toBe("unknown");
  });

  it("returns an empty list for a missing hotel state", () => {
    expect(buildIncidentReviewHistory(undefined)).toEqual([]);
  });

  it("does not mutate the stored reviews' order", () => {
    const stored = [{ id: "r1", incidentId: "a", day: 1 }, { id: "r2", incidentId: "a", day: 2 }];
    buildIncidentReviewHistory({ incidentReviews: stored });
    expect(stored.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
});
