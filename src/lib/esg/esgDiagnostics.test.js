import { generateEsgDiagnostics } from "./esgDiagnostics";

const HEALTHY = {
  energy: 200, // 20 kWh/room for 10 rooms
  water: 3,
  waste: 30,
  co2: 100,
  score: 65,
  staffOverload: 60,
  roomCount: 10,
  nextCertification: null,
};

test("a healthy ESG cycle produces no error/anomaly", () => {
  const diagnostics = generateEsgDiagnostics(HEALTHY);
  expect(diagnostics.some((d) => d.type === "error")).toBe(false);
  expect(diagnostics.some((d) => d.type === "anomaly")).toBe(false);
});

test("very high energy per room raises a high-severity error", () => {
  const diagnostics = generateEsgDiagnostics({ ...HEALTHY, energy: 10000, roomCount: 10 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "error", severity: "high" })]));
});

test("moderately high energy per room raises a medium-severity anomaly", () => {
  const diagnostics = generateEsgDiagnostics({ ...HEALTHY, energy: 400, roomCount: 10 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "anomaly", severity: "medium" })]));
});

test("high water usage is flagged", () => {
  const diagnostics = generateEsgDiagnostics({ ...HEALTHY, water: 100, roomCount: 10 });
  expect(diagnostics.some((d) => d.message.includes("eau"))).toBe(true);
});

test("high CO2 is flagged", () => {
  const diagnostics = generateEsgDiagnostics({ ...HEALTHY, co2: 1000 });
  expect(diagnostics.some((d) => d.message.includes("CO₂"))).toBe(true);
});

test("critical score raises a high-severity error", () => {
  const diagnostics = generateEsgDiagnostics({ ...HEALTHY, score: 20 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "error", severity: "high" })]));
});

test("staff overload raises an anomaly about wellbeing", () => {
  const diagnostics = generateEsgDiagnostics({ ...HEALTHY, staffOverload: 150 });
  expect(diagnostics.some((d) => d.message.includes("bien-être"))).toBe(true);
});

test("an eligible certification is surfaced as an opportunity", () => {
  const diagnostics = generateEsgDiagnostics({ ...HEALTHY, nextCertification: { name: "Green Key", eligible: true, progress: 100 } });
  expect(diagnostics.some((d) => d.type === "opportunity" && d.message.includes("Green Key"))).toBe(true);
});

test("a near-eligible certification is surfaced as an opportunity too", () => {
  const diagnostics = generateEsgDiagnostics({ ...HEALTHY, nextCertification: { name: "EarthCheck", eligible: false, progress: 66 } });
  expect(diagnostics.some((d) => d.type === "opportunity" && d.message.includes("EarthCheck"))).toBe(true);
});
