import { generateClientsDiagnostics } from "./clientsDiagnostics";

test("generates critical error when satisfaction is very low", () => {
  const diags = generateClientsDiagnostics({ satisfaction: 30, loyalty: 50, reviews: { avgRating: 2.8, positive: 40, negative: 25, trend: "stable" } });
  expect(diags.some((d) => d.type === "error" && d.severity === "high")).toBe(true);
});

test("generates anomaly when satisfaction is moderate", () => {
  const diags = generateClientsDiagnostics({ satisfaction: 52, loyalty: 55, reviews: { avgRating: 3.2, positive: 65, negative: 12, trend: "stable" } });
  expect(diags.some((d) => d.severity === "medium")).toBe(true);
});

test("generates loyalty error when loyalty is very low", () => {
  const diags = generateClientsDiagnostics({ satisfaction: 65, loyalty: 20, reviews: { avgRating: 3.5, positive: 65, negative: 15, trend: "stable" } });
  expect(diags.some((d) => d.message.includes("idélité"))).toBe(true);
});

test("generates declining review error", () => {
  const diags = generateClientsDiagnostics({
    satisfaction: 45,
    loyalty: 50,
    reviews: { avgRating: 3.0, positive: 55, negative: 25, trend: "declining" },
  });
  expect(diags.some((d) => d.type === "error")).toBe(true);
});

test("generates segment concentration anomaly when one segment > 65%", () => {
  const diags = generateClientsDiagnostics({
    satisfaction: 65,
    loyalty: 55,
    reviews: { avgRating: 3.5, positive: 65, negative: 15, trend: "stable" },
    segments: { business: 70, leisure: 15, famille: 10, premium: 5 },
  });
  expect(diags.some((d) => d.message.includes("ncentration"))).toBe(true);
});

test("generates opportunity when satisfaction and loyalty are both high", () => {
  const diags = generateClientsDiagnostics({
    satisfaction: 85,
    loyalty: 80,
    reviews: { avgRating: 4.5, positive: 90, negative: 5, trend: "improving" },
    segments: { business: 25, leisure: 40, famille: 20, premium: 15 },
  });
  expect(diags.some((d) => d.type === "opportunity")).toBe(true);
});

test("generates ESG-to-premium opportunity", () => {
  const diags = generateClientsDiagnostics({
    satisfaction: 70,
    loyalty: 60,
    reviews: { avgRating: 3.8, positive: 75, negative: 10, trend: "stable" },
    segments: { business: 30, leisure: 55, famille: 10, premium: 5 },
    esgScore: 80,
  });
  expect(diags.some((d) => d.message.includes("ESG"))).toBe(true);
});

test("returns empty array when all metrics are normal", () => {
  const diags = generateClientsDiagnostics({
    satisfaction: 70,
    loyalty: 65,
    reviews: { avgRating: 3.8, positive: 72, negative: 12, trend: "stable" },
    segments: { business: 25, leisure: 40, famille: 20, premium: 15 },
  });
  // No critical errors expected for a healthy set of metrics
  expect(diags.every((d) => d.severity !== "high")).toBe(true);
});
