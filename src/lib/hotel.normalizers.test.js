import {
  normalizeHotel,
  normalizeHotelESG,
  normalizeHotelExpansion,
  normalizeHotelFinance,
  normalizeHotelMarketing,
  normalizeHotelStructure,
} from "./normalizers";

describe("normalizeHotelStructure", () => {
  test("returns safe defaults for null/undefined", () => {
    const result = normalizeHotelStructure(null);
    expect(result).toMatchObject({
      name: expect.any(String),
      location: expect.any(String),
      roomCount: expect.any(Number),
      starRating: expect.any(Number),
    });
    expect(Array.isArray(result.amenities)).toBe(true);
  });

  test("repairs arrays where objects expected and vice versa", () => {
    const result = normalizeHotelStructure({ amenities: "not-an-array", roomCount: "150" });
    expect(Array.isArray(result.amenities)).toBe(true);
    expect(result.roomCount).toBe(150);
  });
});

describe("normalizeHotelFinance", () => {
  test("returns safe defaults for null/undefined/malformed input", () => {
    const result = normalizeHotelFinance(null);
    expect(Array.isArray(result.revenue)).toBe(true);
    expect(Array.isArray(result.costs)).toBe(true);
    expect(typeof result.months).toBe("object");
  });

  test("handles JSON string revenue/costs", () => {
    const result = normalizeHotelFinance({ revenue: "[1,2,3]", costs: "not-json" });
    expect(result.revenue).toEqual([1, 2, 3]);
    expect(result.costs.length).toBeGreaterThan(0);
  });

  test("keeps taxes as a number when not array-like", () => {
    expect(normalizeHotelFinance({ taxes: "12" }).taxes).toBe(12);
  });

  test("keeps taxes as an array when supplied as an array", () => {
    expect(normalizeHotelFinance({ taxes: [10, 20] }).taxes).toEqual([10, 20]);
  });
});

describe("normalizeHotelMarketing", () => {
  test("returns safe defaults for null/undefined", () => {
    const result = normalizeHotelMarketing(null);
    expect(Array.isArray(result.channels)).toBe(true);
    expect(Array.isArray(result.campaigns)).toBe(true);
  });

  test("repairs malformed channel/campaign entries and keeps ROI/uplift fields", () => {
    const result = normalizeHotelMarketing({ channels: [null, { name: "OTA" }], campaigns: [{ name: "Promo", roi: "1.5", demandUplift: "4" }] });
    expect(result.channels).toHaveLength(2);
    expect(result.channels[1].name).toBe("OTA");
    expect(result.campaigns[0].roi).toBe(1.5);
    expect(result.campaigns[0].demandUplift).toBe(4);
  });
});

describe("normalizeHotelESG", () => {
  test("returns safe defaults for null/undefined", () => {
    const result = normalizeHotelESG(undefined);
    expect(typeof result.sustainabilityScore).toBe("number");
    expect(Array.isArray(result.certifications)).toBe(true);
  });

  test("repairs a mismatched schema", () => {
    const result = normalizeHotelESG({ energyConsumption: "70", certifications: "Green Key" });
    expect(result.energyConsumption).toBe(70);
    expect(Array.isArray(result.certifications)).toBe(true);
  });
});

describe("normalizeHotelExpansion", () => {
  test("returns safe defaults and repairs malformed establishments", () => {
    const result = normalizeHotelExpansion({ establishments: [null, { name: "Annexe", sharedStaffPool: "true" }] });
    expect(result.establishments).toHaveLength(2);
    expect(result.establishments[1].name).toBe("Annexe");
    expect(typeof result.establishments[1].sharedStaffPool).toBe("boolean");
  });
});

describe("normalizeHotel", () => {
  test("normalizes a fully malformed hotel state without throwing", () => {
    const result = normalizeHotel({ structure: "bad", finance: null, marketing: [1, 2], esg: "x", expansion: 42 });
    expect(result.structure.name).toEqual(expect.any(String));
    expect(Array.isArray(result.finance.revenue)).toBe(true);
    expect(Array.isArray(result.marketing.channels)).toBe(true);
    expect(Array.isArray(result.expansion.establishments)).toBe(true);
  });
});
