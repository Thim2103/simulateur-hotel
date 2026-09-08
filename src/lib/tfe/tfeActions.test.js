import { applyTfeDecision, findTfeAction, TFE_ACTION_CATALOG } from "./tfeActions";
import { createTfeHotelBundle } from "./tfeScenario";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function bundleFixture() {
  return createTfeHotelBundle({ roomCount: 30, positioningTier: "midscale", strategy: "rentabilite", referenceDate: REFERENCE_DATE });
}

test("findTfeAction resolves a known id and returns null for an unknown one", () => {
  expect(findTfeAction("plan-relance")).not.toBeNull();
  expect(findTfeAction("does-not-exist")).toBeNull();
});

test("every catalog action applies without throwing and without mutating the input", () => {
  TFE_ACTION_CATALOG.forEach((action) => {
    const bundle = bundleFixture();
    const frozenCopy = JSON.parse(JSON.stringify(bundle));
    expect(() => applyTfeDecision(bundle, action.id)).not.toThrow();
    expect(bundle).toEqual(frozenCopy);
  });
});

test("plan-relance raises the marketing budget", () => {
  const bundle = bundleFixture();
  const next = applyTfeDecision(bundle, "plan-relance");
  expect(next.hotelState.marketing.budget).toBeGreaterThan(bundle.hotelState.marketing.budget);
});

test("plan-austerite lowers fixed costs", () => {
  const bundle = bundleFixture();
  const next = applyTfeDecision(bundle, "plan-austerite");
  expect(next.hotelState.finance.fixedCosts).toBeLessThan(bundle.hotelState.finance.fixedCosts);
});

test("investir-durable raises the ESG sustainability score", () => {
  const bundle = bundleFixture();
  const next = applyTfeDecision(bundle, "investir-durable");
  expect(next.hotelState.esg.sustainabilityScore).toBeGreaterThan(bundle.hotelState.esg.sustainabilityScore);
});

test("renforcer-equipe adds a restaurant staff member", () => {
  const bundle = bundleFixture();
  const next = applyTfeDecision(bundle, "renforcer-equipe");
  expect(next.restaurantState.staff.length).toBeGreaterThan(bundle.restaurantState.staff.length);
});

test("repositionner-etablissement advances the positioning tier", () => {
  const bundle = bundleFixture();
  const next = applyTfeDecision(bundle, "repositionner-etablissement");
  expect(next.hotelState.marketing.positioningTier).not.toBe(bundle.hotelState.marketing.positioningTier);
});

test("an unknown action id returns the bundle unchanged", () => {
  const bundle = bundleFixture();
  expect(applyTfeDecision(bundle, "unknown-action")).toEqual(bundle);
});
