import { applyMarketingDecision, findMarketingAction, MARKETING_ACTION_CATALOG } from "./marketingActions";

function bundleFixture() {
  return {
    hotelState: {
      structure: { starRating: 3 },
      marketing: {
        budget: 6500,
        positioning: "Hôtellerie premium",
        channels: [
          { id: "ota", name: "OTA", enabled: true, budget: 2000, reach: 70 },
          { id: "direct", name: "Direct", enabled: true, budget: 500, reach: 20 },
        ],
        campaigns: [{ id: 1, name: "Été", objective: "Acquisition", status: "active", budget: 3000, conversion: 7, roi: 2.1, demandUplift: 6 }],
      },
      esg: { sustainabilityScore: 58, monthlyInvestment: 2400 },
    },
    restaurantState: {},
    rooms: [{ id: 1 }],
    reservations: [],
  };
}

test("findMarketingAction resolves a known id and returns null for an unknown one", () => {
  expect(findMarketingAction("lancer-campagne")).not.toBeNull();
  expect(findMarketingAction("does-not-exist")).toBeNull();
});

test("every catalog action applies without throwing and without mutating the input", () => {
  MARKETING_ACTION_CATALOG.forEach((action) => {
    const bundle = bundleFixture();
    const frozenCopy = JSON.parse(JSON.stringify(bundle));
    const next = applyMarketingDecision(bundle, action.id);
    expect(next).toBeDefined();
    expect(bundle).toEqual(frozenCopy);
  });
});

test("lancer-campagne adds a new active campaign", () => {
  const bundle = bundleFixture();
  const next = applyMarketingDecision(bundle, "lancer-campagne");
  expect(next.hotelState.marketing.campaigns).toHaveLength(2);
  expect(next.hotelState.marketing.campaigns[1].status).toBe("active");
});

test("augmenter-budget raises the strongest channel's budget and the overall budget", () => {
  const bundle = bundleFixture();
  const next = applyMarketingDecision(bundle, "augmenter-budget");
  expect(next.hotelState.marketing.channels.find((c) => c.id === "ota").budget).toBeGreaterThan(2000);
  expect(next.hotelState.marketing.budget).toBeGreaterThan(6500);
});

test("reduire-budget lowers the weakest channel's budget without going negative", () => {
  const bundle = bundleFixture();
  const next = applyMarketingDecision(bundle, "reduire-budget");
  expect(next.hotelState.marketing.channels.find((c) => c.id === "direct").budget).toBeLessThan(500);
});

test("changer-canal rebalances channel budgets", () => {
  const bundle = bundleFixture();
  const next = applyMarketingDecision(bundle, "changer-canal");
  expect(next.hotelState.marketing.channels.find((c) => c.id === "ota").budget).toBeGreaterThan(2000);
});

test("repositionner-hotel advances the positioning tier", () => {
  const bundle = bundleFixture(); // starRating 3 -> midscale
  const next = applyMarketingDecision(bundle, "repositionner-hotel");
  expect(next.hotelState.marketing.positioningTier).toBe("upscale");
});

test("ameliorer-reputation raises the ESG sustainability score and investment", () => {
  const bundle = bundleFixture();
  const next = applyMarketingDecision(bundle, "ameliorer-reputation");
  expect(next.hotelState.esg.sustainabilityScore).toBeGreaterThan(58);
  expect(next.hotelState.esg.monthlyInvestment).toBeGreaterThan(2400);
});

test("an unknown action id returns the bundle unchanged", () => {
  const bundle = bundleFixture();
  expect(applyMarketingDecision(bundle, "unknown-action")).toEqual(bundle);
});
