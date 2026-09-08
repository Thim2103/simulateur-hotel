import { DEFAULT_VIEW_MODE, isValidViewMode, normalizeViewMode, pricingKpiForMode, VIEW_MODES } from "./dashboardViewMode";

test("exposes casual and expert as the only view modes", () => {
  expect(VIEW_MODES).toEqual(["casual", "expert"]);
  expect(DEFAULT_VIEW_MODE).toBe("casual");
});

test("isValidViewMode accepts only known modes", () => {
  expect(isValidViewMode("casual")).toBe(true);
  expect(isValidViewMode("expert")).toBe(true);
  expect(isValidViewMode("pro")).toBe(false);
  expect(isValidViewMode(undefined)).toBe(false);
});

test("normalizeViewMode falls back to the default for an unknown mode", () => {
  expect(normalizeViewMode("expert")).toBe("expert");
  expect(normalizeViewMode("nonsense")).toBe("casual");
  expect(normalizeViewMode(undefined)).toBe("casual");
});

test("pricingKpiForMode shows the average price in casual mode", () => {
  expect(pricingKpiForMode("casual", { averagePrice: 120, adr: 135 })).toEqual({ label: "Prix moyen", value: 120 });
});

test("pricingKpiForMode shows the ADR in expert mode", () => {
  expect(pricingKpiForMode("expert", { averagePrice: 120, adr: 135 })).toEqual({ label: "ADR", value: 135 });
});
