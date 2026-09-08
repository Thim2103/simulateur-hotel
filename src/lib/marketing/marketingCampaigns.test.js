import { computeCampaignPerformance, launchCampaign, updateCampaignStatus, removeCampaign, activeCampaigns, totalCampaignBudget } from "./marketingCampaigns";

function campaignsFixture() {
  return [
    { id: 1, name: "Séjour signature", objective: "Acquisition", status: "active", budget: 3000, conversion: 7, roi: 2.1, demandUplift: 6 },
    { id: 2, name: "Fidélité VIP", objective: "Fidélisation", status: "paused", budget: 1000, conversion: 4, roi: 0.8, demandUplift: 2 },
  ];
}

test("computeCampaignPerformance derives generated revenue and net result", () => {
  const performance = computeCampaignPerformance(campaignsFixture());
  const signature = performance.find((c) => c.id === 1);
  expect(signature.generatedRevenue).toBe(Math.round(3000 * 2.1));
  expect(signature.netResult).toBe(signature.generatedRevenue - 3000);
});

test("launchCampaign appends a new active campaign with a fresh id", () => {
  const next = launchCampaign(campaignsFixture(), { name: "Escapade automne", budget: 2000 });
  expect(next).toHaveLength(3);
  const created = next[2];
  expect(created.id).toBe(3);
  expect(created.name).toBe("Escapade automne");
  expect(created.status).toBe("active");
  expect(created.budget).toBe(2000);
});

test("launchCampaign falls back to sane defaults", () => {
  const next = launchCampaign([]);
  expect(next).toHaveLength(1);
  expect(next[0].objective).toBe("Acquisition");
  expect(next[0].budget).toBeGreaterThan(0);
});

test("updateCampaignStatus only changes the targeted campaign", () => {
  const next = updateCampaignStatus(campaignsFixture(), 2, "active");
  expect(next.find((c) => c.id === 2).status).toBe("active");
  expect(next.find((c) => c.id === 1).status).toBe("active");
});

test("removeCampaign drops the targeted campaign", () => {
  const next = removeCampaign(campaignsFixture(), 1);
  expect(next).toHaveLength(1);
  expect(next[0].id).toBe(2);
});

test("activeCampaigns filters to status active only", () => {
  expect(activeCampaigns(campaignsFixture())).toHaveLength(1);
});

test("totalCampaignBudget sums every campaign regardless of status", () => {
  expect(totalCampaignBudget(campaignsFixture())).toBe(4000);
});
