import { generateMarketingDiagnostics } from "./marketingDiagnostics";

const HEALTHY = {
  budget: { channel: 3000, campaign: 3000, total: 6000 },
  roi: { campaignsAvgRoi: 2.5, overallRoi: 2.5, generatedRevenue: 15000 },
  conversion: { totalReach: 200, estimatedLeads: 120, conversionRate: 20 },
  reputation: 75,
  channels: [{ id: "ota", enabled: true }, { id: "direct", enabled: true }],
  campaigns: [{ id: 1, name: "Été", status: "active", roi: 2.5 }],
  staffOverload: 60,
};

test("a healthy marketing cycle produces no error/anomaly, only an opportunity", () => {
  const diagnostics = generateMarketingDiagnostics(HEALTHY);
  expect(diagnostics.some((d) => d.type === "error")).toBe(false);
  expect(diagnostics.some((d) => d.type === "anomaly")).toBe(false);
  expect(diagnostics.some((d) => d.type === "opportunity")).toBe(true);
});

test("negative ROI raises a high-severity error", () => {
  const diagnostics = generateMarketingDiagnostics({ ...HEALTHY, roi: { ...HEALTHY.roi, overallRoi: 0.5 } });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "error", severity: "high" })]));
});

test("weak ROI raises a medium-severity anomaly", () => {
  const diagnostics = generateMarketingDiagnostics({ ...HEALTHY, roi: { ...HEALTHY.roi, overallRoi: 1.2 } });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "anomaly", severity: "medium" })]));
});

test("low conversion is flagged", () => {
  const diagnostics = generateMarketingDiagnostics({ ...HEALTHY, conversion: { ...HEALTHY.conversion, conversionRate: 1 } });
  expect(diagnostics.some((d) => d.message.includes("conversion"))).toBe(true);
});

test("a negative-ROI active campaign is named explicitly", () => {
  const diagnostics = generateMarketingDiagnostics({ ...HEALTHY, campaigns: [{ id: 1, name: "Flop d'hiver", status: "active", roi: 0.4 }] });
  expect(diagnostics.some((d) => d.message.includes("Flop d'hiver"))).toBe(true);
});

test("single-channel dependency is flagged", () => {
  const diagnostics = generateMarketingDiagnostics({ ...HEALTHY, channels: [{ id: "ota", name: "OTA", enabled: true }] });
  expect(diagnostics.some((d) => d.message.includes("un seul canal"))).toBe(true);
});

test("critical reputation raises a high-severity error", () => {
  const diagnostics = generateMarketingDiagnostics({ ...HEALTHY, reputation: 20 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "error", severity: "high" })]));
});

test("staff overload with active campaigns is flagged", () => {
  const diagnostics = generateMarketingDiagnostics({ ...HEALTHY, staffOverload: 150 });
  expect(diagnostics.some((d) => d.message.includes("surcharge"))).toBe(true);
});
