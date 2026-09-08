import { applyEsgDecision, findEsgAction, ESG_ACTION_CATALOG } from "./esgActions";

function bundleFixture() {
  return {
    hotelState: {
      finance: { fixedCosts: 21000 },
      esg: { energyConsumption: 62, waterUsage: 55, wasteReduction: 40, sustainabilityScore: 58, certifications: [], monthlyInvestment: 2400 },
    },
    restaurantState: {
      esg: { wasteReduction: 35, localSourcing: 60, energyEfficiency: 40, staffWellbeing: 70, monthlyInvestment: 900 },
    },
    rooms: [{ id: 1 }],
    reservations: [],
  };
}

function eligibleMetrics() {
  return { score: 90, energy: 10, water: 10, waste: 10, co2: 10, hotelEsg: { wasteReduction: 90 }, obtainedIds: [] };
}

test("findEsgAction resolves a known id and returns null for an unknown one", () => {
  expect(findEsgAction("reduire-energie")).not.toBeNull();
  expect(findEsgAction("does-not-exist")).toBeNull();
});

test("every catalog action applies without throwing and without mutating the input", () => {
  ESG_ACTION_CATALOG.forEach((action) => {
    const bundle = bundleFixture();
    const frozenCopy = JSON.parse(JSON.stringify(bundle));
    expect(() => applyEsgDecision(bundle, action.id, {}, eligibleMetrics())).not.toThrow();
    expect(bundle).toEqual(frozenCopy);
  });
});

test("reduire-energie lowers the energyConsumption score and fixed costs", () => {
  const bundle = bundleFixture();
  const next = applyEsgDecision(bundle, "reduire-energie");
  expect(next.hotelState.esg.energyConsumption).toBeLessThan(62);
  expect(next.hotelState.finance.fixedCosts).toBeLessThan(21000);
});

test("reduire-eau lowers the waterUsage score", () => {
  const bundle = bundleFixture();
  const next = applyEsgDecision(bundle, "reduire-eau");
  expect(next.hotelState.esg.waterUsage).toBeLessThan(55);
});

test("reduire-dechets raises wasteReduction on both hotel and restaurant", () => {
  const bundle = bundleFixture();
  const next = applyEsgDecision(bundle, "reduire-dechets");
  expect(next.hotelState.esg.wasteReduction).toBeGreaterThan(40);
  expect(next.restaurantState.esg.wasteReduction).toBeGreaterThan(35);
});

test("reduire-co2 improves both hotel energy score and restaurant efficiency", () => {
  const bundle = bundleFixture();
  const next = applyEsgDecision(bundle, "reduire-co2");
  expect(next.hotelState.esg.energyConsumption).toBeLessThan(62);
  expect(next.restaurantState.esg.energyEfficiency).toBeGreaterThan(40);
});

test("obtenir-certification adds the next eligible certification", () => {
  const bundle = bundleFixture();
  const next = applyEsgDecision(bundle, "obtenir-certification", {}, eligibleMetrics());
  expect(next.hotelState.esg.certifications).toContain("green-key");
});

test("obtenir-certification is a no-op when nothing is eligible", () => {
  const bundle = bundleFixture();
  const next = applyEsgDecision(bundle, "obtenir-certification", {}, { score: 0, hotelEsg: {}, obtainedIds: [] });
  expect(next.hotelState.esg.certifications).toEqual([]);
});

test("ameliorer-reputation-durable raises sustainability and staff wellbeing", () => {
  const bundle = bundleFixture();
  const next = applyEsgDecision(bundle, "ameliorer-reputation-durable");
  expect(next.hotelState.esg.sustainabilityScore).toBeGreaterThan(58);
  expect(next.restaurantState.esg.staffWellbeing).toBeGreaterThan(70);
});

test("an unknown action id returns the bundle unchanged", () => {
  const bundle = bundleFixture();
  expect(applyEsgDecision(bundle, "unknown-action")).toEqual(bundle);
});
