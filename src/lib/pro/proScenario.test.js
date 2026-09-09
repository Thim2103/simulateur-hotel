import { createProHotelBundle, applyScheduledEvents, PRO_TIMELINE, PRO_STRATEGY_OPTIONS } from "./proScenario";

const referenceDate = new Date("2026-09-16T00:00:00Z");

test("PRO_STRATEGY_OPTIONS has 3 professional strategies", () => {
  expect(PRO_STRATEGY_OPTIONS.map((s) => s.id)).toEqual(["expansion", "optimisation", "transformation-digitale"]);
});

test("createProHotelBundle returns the standard hotel bundle shape", () => {
  const bundle = createProHotelBundle({ roomCount: 30, positioningTier: "midscale", strategy: "optimisation", referenceDate });
  expect(bundle.hotelState).toBeDefined();
  expect(bundle.restaurantState).toBeDefined();
  expect(Array.isArray(bundle.rooms)).toBe(true);
  expect(Array.isArray(bundle.reservations)).toBe(true);
});

test("expansion strategy raises the marketing budget vs optimisation", () => {
  const optimisation = createProHotelBundle({ roomCount: 30, strategy: "optimisation", referenceDate });
  const expansion = createProHotelBundle({ roomCount: 30, strategy: "expansion", referenceDate });
  expect(expansion.hotelState.marketing.budget).toBeGreaterThan(optimisation.hotelState.marketing.budget);
});

test("transformation-digitale strategy raises the ESG sustainability score vs optimisation", () => {
  const optimisation = createProHotelBundle({ roomCount: 30, strategy: "optimisation", referenceDate });
  const digitale = createProHotelBundle({ roomCount: 30, strategy: "transformation-digitale", referenceDate });
  expect(digitale.hotelState.esg.sustainabilityScore).toBeGreaterThan(optimisation.hotelState.esg.sustainabilityScore);
});

test("PRO_TIMELINE covers both crises and opportunities across the 24-month horizon", () => {
  expect(PRO_TIMELINE.some((entry) => entry.type === "crisis")).toBe(true);
  expect(PRO_TIMELINE.some((entry) => entry.type === "opportunity")).toBe(true);
  expect(PRO_TIMELINE.every((entry) => entry.month >= 1 && entry.month <= 24)).toBe(true);
});

test("applyScheduledEvents returns the bundle unchanged for a month with no scripted entry", () => {
  const bundle = createProHotelBundle({ roomCount: 30, referenceDate });
  const result = applyScheduledEvents(1, bundle);
  expect(result.triggered).toEqual([]);
  expect(result.bundle).toEqual(bundle);
});

test("applyScheduledEvents applies the scripted transform for a matching month", () => {
  const bundle = createProHotelBundle({ roomCount: 30, referenceDate });
  const inflationMonth = PRO_TIMELINE.find((entry) => entry.id === "inflation").month;
  const result = applyScheduledEvents(inflationMonth, bundle);
  expect(result.triggered).toHaveLength(1);
  expect(result.bundle.hotelState.finance.fixedCosts).toBeGreaterThan(bundle.hotelState.finance.fixedCosts);
});
