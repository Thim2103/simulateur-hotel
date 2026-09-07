import { buildHotelSimulation } from "./hotel";

describe("buildHotelSimulation", () => {
  test("never throws and returns safe numeric defaults for null/undefined state", () => {
    const result = buildHotelSimulation(null);
    expect(Number.isFinite(result.demand)).toBe(true);
    expect(Number.isFinite(result.revenue)).toBe(true);
    expect(Number.isFinite(result.cost)).toBe(true);
    expect(Number.isFinite(result.profit)).toBe(true);
    expect(result.demand).toBeGreaterThanOrEqual(30);
    expect(result.demand).toBeLessThanOrEqual(100);
  });

  test("handles malformed structure/finance/marketing/esg/expansion without throwing", () => {
    const state = {
      structure: { roomCount: "not-a-number" },
      finance: { revenue: "not-an-array", costs: null, fixedCosts: "5000" },
      marketing: { channels: "invalid", campaigns: [{ status: "active", roi: "2", demandUplift: "3" }] },
      esg: { certifications: "not-an-array" },
      expansion: { establishments: [null, { status: "active", roomCount: "80", sharedStaffPool: true }] },
    };

    expect(() => buildHotelSimulation(state)).not.toThrow();
    const result = buildHotelSimulation(state);
    expect(Number.isFinite(result.revenue)).toBe(true);
    expect(Number.isFinite(result.aggregateRoomCount)).toBe(true);
  });

  test("factors in restaurant demand/satisfaction via integratedHotelReputation", () => {
    const state = {
      structure: { roomCount: 100 },
      finance: { revenue: [50000], costs: [30000], fixedCosts: 10000, payroll: 15000, taxes: 10 },
      marketing: { channels: [], campaigns: [] },
      esg: { certifications: [] },
      expansion: { establishments: [{ id: 1, roomCount: 100, status: "active" }] },
    };

    const lowSatisfaction = buildHotelSimulation(state, { demand: 40, customerSatisfaction: 2.5 });
    const highSatisfaction = buildHotelSimulation(state, { demand: 90, customerSatisfaction: 4.8 });

    expect(highSatisfaction.reputation).toBeGreaterThan(lowSatisfaction.reputation);
    expect(highSatisfaction.demand).toBeGreaterThan(lowSatisfaction.demand);
  });

  test("computes cross-hotel KPIs when multiple establishments exist", () => {
    const state = {
      structure: { roomCount: 100 },
      finance: { revenue: [50000], costs: [30000] },
      marketing: { channels: [], campaigns: [] },
      esg: { certifications: [] },
      expansion: {
        establishments: [
          { id: 1, roomCount: 100, status: "active", sharedStaffPool: true },
          { id: 2, roomCount: 60, status: "active", sharedStaffPool: false },
          { id: 3, roomCount: 40, status: "planned", sharedStaffPool: true },
        ],
      },
    };

    const result = buildHotelSimulation(state, { demand: 70, customerSatisfaction: 4 });
    expect(result.activeEstablishments).toBe(2);
    expect(result.aggregateRoomCount).toBe(200);
    expect(result.sharedStaffPoolUtilization).toBeCloseTo(67, 0);
  });
});
