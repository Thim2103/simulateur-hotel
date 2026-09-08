import { generateStaffDiagnostics } from "./staffDiagnostics";

const HEALTHY = {
  headcount: { hotel: 5, restaurant: 6, total: 11 },
  morale: 80,
  productivity: 78,
  absenteeism: 5,
  overload: 60,
  housekeepingLoad: 60,
  serviceLoad: 55,
  turnover: { estimatedRate: 4, actualRateLastCycle: 0, departuresLast: 0 },
};

test("a healthy team produces no error/anomaly, only an opportunity", () => {
  const diagnostics = generateStaffDiagnostics(HEALTHY);
  expect(diagnostics.some((d) => d.type === "error")).toBe(false);
  expect(diagnostics.some((d) => d.type === "anomaly")).toBe(false);
  expect(diagnostics.some((d) => d.type === "opportunity")).toBe(true);
});

test("critical overload raises a high-severity error", () => {
  const diagnostics = generateStaffDiagnostics({ ...HEALTHY, overload: 150 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "error", severity: "high" })]));
});

test("moderate overload raises a medium-severity anomaly", () => {
  const diagnostics = generateStaffDiagnostics({ ...HEALTHY, overload: 110 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "anomaly", severity: "medium" })]));
});

test("housekeeping-specific understaffing is flagged", () => {
  const diagnostics = generateStaffDiagnostics({ ...HEALTHY, housekeepingLoad: 140 });
  expect(diagnostics.some((d) => d.message.includes("housekeeping"))).toBe(true);
});

test("service-specific understaffing is flagged", () => {
  const diagnostics = generateStaffDiagnostics({ ...HEALTHY, serviceLoad: 140 });
  expect(diagnostics.some((d) => d.message.includes("salle"))).toBe(true);
});

test("critical morale raises a high-severity error", () => {
  const diagnostics = generateStaffDiagnostics({ ...HEALTHY, morale: 30 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "error", severity: "high" })]));
});

test("high absenteeism raises a high-severity error", () => {
  const diagnostics = generateStaffDiagnostics({ ...HEALTHY, absenteeism: 30 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "error", severity: "high" })]));
});

test("high turnover raises a high-severity error and real departures are reported", () => {
  const diagnostics = generateStaffDiagnostics({ ...HEALTHY, turnover: { estimatedRate: 30, actualRateLastCycle: 20, departuresLast: 2 } });
  expect(diagnostics.some((d) => d.type === "error")).toBe(true);
  expect(diagnostics.some((d) => d.message.includes("2 départ"))).toBe(true);
});

test("low productivity is flagged as an anomaly", () => {
  const diagnostics = generateStaffDiagnostics({ ...HEALTHY, productivity: 35 });
  expect(diagnostics.some((d) => d.message.includes("Productivité faible"))).toBe(true);
});
