import { runRecommendations } from "./rmRecommendations";

test("recommends boosting demand when occupancy is low", () => {
  const recommendations = runRecommendations({ occupancy: 30, pricing: {}, segmentation: {} });
  expect(recommendations.some((r) => r.id === "boost_demand")).toBe(true);
});

test("recommends raising rates when occupancy is very high", () => {
  const recommendations = runRecommendations({ occupancy: 92, pricing: {}, segmentation: {} });
  expect(recommendations.some((r) => r.id === "raise_rates")).toBe(true);
});

test("flags favorable weather as an upsell opportunity", () => {
  const recommendations = runRecommendations({ occupancy: 60, pricing: { weatherAdjustment: 0.03 }, segmentation: {} });
  expect(recommendations.some((r) => r.id === "weather_upside")).toBe(true);
});

test("flags unfavorable weather", () => {
  const recommendations = runRecommendations({ occupancy: 60, pricing: { weatherAdjustment: -0.03 }, segmentation: {} });
  expect(recommendations.some((r) => r.id === "weather_downside")).toBe(true);
});

test("flags an active demand-boosting event as a pricing opportunity", () => {
  const recommendations = runRecommendations({ occupancy: 60, pricing: { eventAdjustment: 0.05 }, segmentation: {} });
  expect(recommendations.some((r) => r.id === "event_upside")).toBe(true);
});

test("flags heavy OTA dependency", () => {
  const recommendations = runRecommendations({ occupancy: 60, pricing: {}, segmentation: { mix: { ota: 8, leisure: 2 } } });
  expect(recommendations.some((r) => r.id === "reduce_ota_dependency")).toBe(true);
});

test("does not flag OTA dependency when it's a minority of the mix", () => {
  const recommendations = runRecommendations({ occupancy: 60, pricing: {}, segmentation: { mix: { ota: 1, leisure: 9 } } });
  expect(recommendations.some((r) => r.id === "reduce_ota_dependency")).toBe(false);
});

test("flags a declining pickup trend as high priority", () => {
  const recommendations = runRecommendations({ occupancy: 60, pricing: {}, segmentation: {}, pickupTrend: "down" });
  expect(recommendations.find((r) => r.id === "pickup_declining")?.priority).toBe("high");
});

test("flags a rising pickup trend as a low-priority upside", () => {
  const recommendations = runRecommendations({ occupancy: 60, pricing: {}, segmentation: {}, pickupTrend: "up" });
  expect(recommendations.some((r) => r.id === "pickup_rising")).toBe(true);
});

test("falls back to a single reassuring recommendation when nothing stands out", () => {
  const recommendations = runRecommendations({ occupancy: 60, pricing: {}, segmentation: {}, pickupTrend: "stable" });
  expect(recommendations).toEqual([{ id: "steady", priority: "low", message: expect.any(String) }]);
});

test("never throws with no arguments at all", () => {
  expect(() => runRecommendations()).not.toThrow();
  expect(runRecommendations().length).toBeGreaterThan(0);
});
