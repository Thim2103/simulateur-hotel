import { computeChannelPerformance, toggleChannel, adjustChannelBudget, rebalanceChannels, totalChannelReach } from "./marketingChannels";

function channelsFixture() {
  return [
    { id: "ota", name: "OTA", enabled: true, budget: 2000, reach: 70 },
    { id: "direct", name: "Direct", enabled: true, budget: 500, reach: 20 },
    { id: "social", name: "Réseaux sociaux", enabled: false, budget: 300, reach: 40 },
  ];
}

test("computeChannelPerformance attributes revenue by reach share and computes ROI/cost per lead", () => {
  const performance = computeChannelPerformance(channelsFixture(), { totalRevenue: 9000, totalReach: 90 });
  const ota = performance.find((c) => c.id === "ota");
  expect(ota.reachShare).toBeCloseTo((70 / 90) * 100, 0);
  expect(ota.attributedRevenue).toBeGreaterThan(0);
  expect(ota.costPerLead).toBeGreaterThan(0);
  expect(ota.roi).toBeGreaterThan(0);
});

test("toggleChannel flips only the targeted channel", () => {
  const next = toggleChannel(channelsFixture(), "social", true);
  expect(next.find((c) => c.id === "social").enabled).toBe(true);
  expect(next.find((c) => c.id === "ota").enabled).toBe(true);
});

test("adjustChannelBudget never goes negative", () => {
  const next = adjustChannelBudget(channelsFixture(), "direct", -10000);
  expect(next.find((c) => c.id === "direct").budget).toBe(0);
});

test("rebalanceChannels shifts budget from the weakest enabled channel to the strongest", () => {
  const next = rebalanceChannels(channelsFixture());
  const direct = next.find((c) => c.id === "direct"); // weakest enabled (reach 20)
  const ota = next.find((c) => c.id === "ota"); // strongest enabled (reach 70)
  expect(direct.budget).toBeLessThan(500);
  expect(ota.budget).toBeGreaterThan(2000);
});

test("rebalanceChannels is a no-op with fewer than two enabled channels", () => {
  const channels = [{ id: "ota", enabled: true, budget: 100, reach: 10 }, { id: "direct", enabled: false, budget: 50, reach: 5 }];
  expect(rebalanceChannels(channels)).toEqual(channels);
});

test("totalChannelReach only counts enabled channels", () => {
  expect(totalChannelReach(channelsFixture())).toBe(90); // 70 + 20, social disabled
});
