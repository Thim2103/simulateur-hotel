import { computeEnergyConsumption, computeWaterConsumption, computeWasteGenerated, computeCO2Emissions, computeEsgCosts, computeEsgScore, averageMenuSales } from "./esgCalculations";

describe("computeEnergyConsumption", () => {
  test("rises with occupancy and covers", () => {
    const low = computeEnergyConsumption({ occupiedRoomNights: 2, covers: 10, hotelEsg: {}, restaurantEsg: {} });
    const high = computeEnergyConsumption({ occupiedRoomNights: 20, covers: 100, hotelEsg: {}, restaurantEsg: {} });
    expect(high).toBeGreaterThan(low);
  });

  test("a higher energyConsumption score means more energy used", () => {
    const efficient = computeEnergyConsumption({ occupiedRoomNights: 10, covers: 10, hotelEsg: { energyConsumption: 10 }, restaurantEsg: {} });
    const wasteful = computeEnergyConsumption({ occupiedRoomNights: 10, covers: 10, hotelEsg: { energyConsumption: 90 }, restaurantEsg: {} });
    expect(wasteful).toBeGreaterThan(efficient);
  });

  test("safe on empty input", () => {
    expect(computeEnergyConsumption({})).toBeGreaterThanOrEqual(0);
  });
});

describe("computeWaterConsumption", () => {
  test("rises with occupancy", () => {
    const low = computeWaterConsumption({ occupiedRoomNights: 1, covers: 0, hotelEsg: {} });
    const high = computeWaterConsumption({ occupiedRoomNights: 20, covers: 0, hotelEsg: {} });
    expect(high).toBeGreaterThan(low);
  });
});

describe("computeWasteGenerated", () => {
  test("a higher wasteReduction score means less waste", () => {
    const clean = computeWasteGenerated({ occupiedRoomNights: 10, covers: 10, hotelEsg: { wasteReduction: 90 }, restaurantEsg: { wasteReduction: 90 } });
    const dirty = computeWasteGenerated({ occupiedRoomNights: 10, covers: 10, hotelEsg: { wasteReduction: 10 }, restaurantEsg: { wasteReduction: 10 } });
    expect(dirty).toBeGreaterThan(clean);
  });
});

describe("computeCO2Emissions", () => {
  test("scales with both energy and waste", () => {
    expect(computeCO2Emissions({ energyKwh: 100, wasteKg: 50 })).toBeGreaterThan(computeCO2Emissions({ energyKwh: 10, wasteKg: 5 }));
  });

  test("safe on empty input", () => {
    expect(computeCO2Emissions({})).toBe(0);
  });
});

describe("computeEsgCosts", () => {
  test("sums energy/water/waste costs", () => {
    const costs = computeEsgCosts({ energyKwh: 100, waterM3: 10, wasteKg: 20 });
    expect(costs.total).toBe(costs.energy + costs.water + costs.waste);
    expect(costs.total).toBeGreaterThan(0);
  });
});

describe("computeEsgScore", () => {
  test("blends sustainability and staff wellbeing/morale", () => {
    const score = computeEsgScore({ hotelEsg: { sustainabilityScore: 80 }, restaurantEsg: { staffWellbeing: 80 }, staffMorale: 80 });
    expect(score).toBeGreaterThan(60);
  });

  test("staff overload penalizes the score", () => {
    const normal = computeEsgScore({ hotelEsg: { sustainabilityScore: 60 }, restaurantEsg: { staffWellbeing: 60 }, staffOverload: 50 });
    const overloaded = computeEsgScore({ hotelEsg: { sustainabilityScore: 60 }, restaurantEsg: { staffWellbeing: 60 }, staffOverload: 200 });
    expect(overloaded).toBeLessThan(normal);
  });

  test("certifications add a bonus", () => {
    const none = computeEsgScore({ hotelEsg: { sustainabilityScore: 50 }, restaurantEsg: { staffWellbeing: 50 }, certificationsCount: 0 });
    const withCerts = computeEsgScore({ hotelEsg: { sustainabilityScore: 50 }, restaurantEsg: { staffWellbeing: 50 }, certificationsCount: 3 });
    expect(withCerts).toBeGreaterThan(none);
  });

  test("stays within 0-100", () => {
    expect(computeEsgScore({ hotelEsg: { sustainabilityScore: 1000 }, restaurantEsg: { staffWellbeing: 1000 }, certificationsCount: 100 })).toBeLessThanOrEqual(100);
    expect(computeEsgScore({ hotelEsg: { sustainabilityScore: -50 }, restaurantEsg: { staffWellbeing: -50 }, staffOverload: 900 })).toBeGreaterThanOrEqual(0);
  });
});

describe("averageMenuSales", () => {
  test("sums the sales field across the menu", () => {
    expect(averageMenuSales([{ sales: 10 }, { sales: 5 }])).toBe(15);
  });

  test("safe on empty/missing menu", () => {
    expect(averageMenuSales(undefined)).toBe(0);
    expect(averageMenuSales([])).toBe(0);
  });
});
