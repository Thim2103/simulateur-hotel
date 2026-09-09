import { startCareer } from "../../lib/career/careerEngine";
import { generateFromCareerState, generateFromProState, generateFromReplay, generateIncident, generateRandomOpportunity } from "./GmMessageGenerator";

function realCareerState(overrides = {}) {
  return startCareer({
    playerId: "player-1",
    hotelState: { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {} },
    restaurantState: {
      finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
      menu: [{ price: 20, cost: 8, sales: 10 }],
      staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
      operations: [],
      marketing: { budget: 0 },
      esg: {},
    },
    rooms: [{ id: 1, number: "101", status: "libre", housekeeping_status: "clean" }],
    reservations: [],
    ...overrides,
  });
}

test("generateFromCareerState returns [] when there is no hotel yet", () => {
  expect(generateFromCareerState(null)).toEqual([]);
});

test("generateFromCareerState pulls real diagnostics from every business module, each with a real action list", () => {
  const messages = generateFromCareerState(realCareerState());
  expect(messages.length).toBeGreaterThan(0);
  messages.forEach((message) => {
    expect(message).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        type: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        severity: expect.stringMatching(/high|medium|low/),
        module: expect.any(String),
        actions: expect.any(Array),
      })
    );
    expect(message.actions.length).toBeGreaterThan(0);
    message.actions.forEach((action) => expect(action).toEqual(expect.objectContaining({ id: expect.any(String), label: expect.any(String) })));
  });
});

test("generateFromProState turns active crises into OWNER_REQUEST and available opportunities into OPPORTUNITY_EVENT", () => {
  const proState = {
    crises: [{ id: "c1", title: "Inflation", description: "Les coûts explosent.", active: true }, { id: "c2", title: "Résolue", active: false }],
    opportunities: [{ id: "o1", title: "Subvention ESG", description: "Une aide est disponible.", seized: false, active: true }],
  };
  const messages = generateFromProState(proState);
  expect(messages).toHaveLength(2);
  expect(messages[0]).toMatchObject({ type: "OWNER_REQUEST", module: "pro" });
  expect(messages[1]).toMatchObject({ type: "OPPORTUNITY_EVENT", module: "pro" });
});

test("generateFromProState returns [] when there is no Pro run", () => {
  expect(generateFromProState(null)).toEqual([]);
});

test("generateFromReplay classifies real scenario events into INCIDENT_BREAKDOWN/OPPORTUNITY_EVENT", () => {
  const events = [
    { id: "power-outage", name: "Panne électrique", message: "Une panne a coupé l'alimentation.", severity: "high" },
    { id: "vip-guest", name: "Client VIP", message: "Un client VIP est arrivé.", severity: "low" },
  ];
  const messages = generateFromReplay(events);
  expect(messages[0].type).toBe("INCIDENT_BREAKDOWN");
  expect(messages[1].type).toBe("OPPORTUNITY_EVENT");
});

test("generateIncident/generateRandomOpportunity are deterministic given a fixed rng", () => {
  const incident = generateIncident(() => 0);
  const opportunity = generateRandomOpportunity(() => 0);
  expect(incident.type).toBe("INCIDENT_BREAKDOWN");
  expect(opportunity.type).toBe("OPPORTUNITY_EVENT");
});
