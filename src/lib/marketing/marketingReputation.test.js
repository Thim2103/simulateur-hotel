import { computeMarketingReputation, reputationTrend, reputationTier, durableReputationBonus } from "./marketingReputation";

test("computeMarketingReputation blends base reputation, ESG and campaign performance", () => {
  const score = computeMarketingReputation({ baseReputation: 70, sustainabilityScore: 80, campaigns: [{ status: "active", roi: 3 }] });
  expect(score).toBeGreaterThan(0);
  expect(score).toBeLessThanOrEqual(100);
});

test("low-ROI active campaigns drag the score down relative to no campaigns", () => {
  const withGoodCampaigns = computeMarketingReputation({ baseReputation: 60, sustainabilityScore: 60, campaigns: [{ status: "active", roi: 5 }] });
  const withBadCampaigns = computeMarketingReputation({ baseReputation: 60, sustainabilityScore: 60, campaigns: [{ status: "active", roi: 0 }] });
  expect(withBadCampaigns).toBeLessThan(withGoodCampaigns);
});

test("stays within 0-100 on extreme input", () => {
  expect(computeMarketingReputation({ baseReputation: 1000, sustainabilityScore: 1000, campaigns: [] })).toBeLessThanOrEqual(100);
  expect(computeMarketingReputation({ baseReputation: -50, sustainabilityScore: -50, campaigns: [] })).toBeGreaterThanOrEqual(0);
});

test("reputationTrend computes the delta, 0 with no previous value", () => {
  expect(reputationTrend(60, 65)).toBe(5);
  expect(reputationTrend(undefined, 65)).toBe(0);
});

test("reputationTier labels the score band", () => {
  expect(reputationTier(90)).toBe("excellente");
  expect(reputationTier(65)).toBe("bonne");
  expect(reputationTier(45)).toBe("moyenne");
  expect(reputationTier(10)).toBe("fragile");
});

test("durableReputationBonus rewards above-average sustainability and penalizes below it", () => {
  expect(durableReputationBonus({ sustainabilityScore: 90 })).toBeGreaterThan(0);
  expect(durableReputationBonus({ sustainabilityScore: 10 })).toBeLessThan(0);
});
