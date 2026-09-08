import { generateHousekeepingDiagnostics } from "./housekeepingDiagnostics";

const HEALTHY = {
  workload: { roomsToClean: 4 },
  overload: 60,
  understaffing: { understaffed: false, shortfall: 0 },
  quality: 70,
  productivity: 65,
  priorities: { arrivals: 1, departures: 4, stayovers: 2 },
};

test("a healthy HK cycle produces no error/anomaly", () => {
  const diagnostics = generateHousekeepingDiagnostics(HEALTHY);
  expect(diagnostics.some((d) => d.type === "error")).toBe(false);
  expect(diagnostics.some((d) => d.type === "anomaly")).toBe(false);
});

test("critical overload raises a high-severity error", () => {
  const diagnostics = generateHousekeepingDiagnostics({ ...HEALTHY, overload: 150 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "error", severity: "high" })]));
});

test("moderate overload raises a medium-severity anomaly", () => {
  const diagnostics = generateHousekeepingDiagnostics({ ...HEALTHY, overload: 110 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "anomaly", severity: "medium" })]));
});

test("understaffing is flagged with the real shortfall", () => {
  const diagnostics = generateHousekeepingDiagnostics({ ...HEALTHY, understaffing: { understaffed: true, shortfall: 5 } });
  expect(diagnostics.some((d) => d.message.includes("5 chambre"))).toBe(true);
});

test("critical quality raises a high-severity error", () => {
  const diagnostics = generateHousekeepingDiagnostics({ ...HEALTHY, quality: 20 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "error", severity: "high" })]));
});

test("arrivals with overload raises a high-severity error", () => {
  const diagnostics = generateHousekeepingDiagnostics({ ...HEALTHY, overload: 150, priorities: { arrivals: 3, departures: 4, stayovers: 0 } });
  expect(diagnostics.some((d) => d.message.includes("arrivée"))).toBe(true);
});

test("no rooms to clean is surfaced as an opportunity", () => {
  const diagnostics = generateHousekeepingDiagnostics({ ...HEALTHY, workload: { roomsToClean: 0 } });
  expect(diagnostics.some((d) => d.type === "opportunity")).toBe(true);
});

test("high ESG energy/water scores combined with overload are flagged", () => {
  const diagnostics = generateHousekeepingDiagnostics({ ...HEALTHY, overload: 150, esgEnergyScore: 90, esgWaterScore: 90 });
  expect(diagnostics.some((d) => d.message.includes("énergivores"))).toBe(true);
  expect(diagnostics.some((d) => d.message.includes("eau"))).toBe(true);
});
