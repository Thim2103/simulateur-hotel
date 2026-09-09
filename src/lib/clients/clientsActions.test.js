import { applyClientsDecision, findClientsAction, CLIENTS_ACTION_CATALOG } from "./clientsActions";

const BASE_BUNDLE = { hotelState: {}, rooms: [], reservations: [] };

test("CLIENTS_ACTION_CATALOG has 5 actions", () => {
  expect(CLIENTS_ACTION_CATALOG).toHaveLength(5);
});

test("findClientsAction returns the matching action", () => {
  const action = findClientsAction("programme-fidelite");
  expect(action).not.toBeNull();
  expect(action.category).toBe("loyalty");
});

test("findClientsAction returns null for unknown id", () => {
  expect(findClientsAction("not-a-real-action")).toBeNull();
});

test("ameliorer-accueil increases serviceScore", () => {
  const result = applyClientsDecision(BASE_BUNDLE, "ameliorer-accueil");
  expect(result.hotelState.clients.serviceScore).toBe(58); // 50 + 8
});

test("ameliorer-accueil does not exceed 100", () => {
  const bundle = { hotelState: { clients: { serviceScore: 98 } } };
  const result = applyClientsDecision(bundle, "ameliorer-accueil");
  expect(result.hotelState.clients.serviceScore).toBeLessThanOrEqual(100);
});

test("resoudre-plaintes increases complaintResolutionRate", () => {
  const result = applyClientsDecision(BASE_BUNDLE, "resoudre-plaintes");
  expect(result.hotelState.clients.complaintResolutionRate).toBe(65); // 50 + 15
});

test("programme-fidelite increases loyaltyBonus", () => {
  const result = applyClientsDecision(BASE_BUNDLE, "programme-fidelite");
  expect(result.hotelState.clients.loyaltyBonus).toBe(10);
});

test("optimiser-mix-segments increases segmentDiversificationBonus", () => {
  const result = applyClientsDecision(BASE_BUNDLE, "optimiser-mix-segments");
  expect(result.hotelState.clients.segmentDiversificationBonus).toBe(5);
});

test("campagne-reputation boosts both marketing.reputationBonus and clients.reviewBonus", () => {
  const result = applyClientsDecision(BASE_BUNDLE, "campagne-reputation");
  expect(result.hotelState.marketing.reputationBonus).toBe(8);
  expect(result.hotelState.clients.reviewBonus).toBe(5);
});

test("unknown action returns bundle unchanged", () => {
  const result = applyClientsDecision(BASE_BUNDLE, "unknown-action");
  expect(result).toEqual(BASE_BUNDLE);
});

test("action is idempotent when applied twice -- stacks cumulatively", () => {
  const once = applyClientsDecision(BASE_BUNDLE, "ameliorer-accueil");
  const twice = applyClientsDecision(once, "ameliorer-accueil");
  expect(twice.hotelState.clients.serviceScore).toBe(66); // 50 + 8 + 8
});
