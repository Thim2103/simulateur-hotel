import {
  normalizeESG,
  normalizeExpansion,
  normalizeFinance,
  normalizeMarketing,
  normalizeProgression,
  normalizeRestaurant,
  normalizeStructure,
} from "./normalizers";

describe("normalizeStructure", () => {
  test("returns safe defaults for null/undefined", () => {
    const result = normalizeStructure(null);
    expect(result).toMatchObject({
      concept: expect.any(String),
      capacity: expect.any(Number),
      seats: expect.any(Number),
    });
    expect(Array.isArray(result.materials)).toBe(true);
    expect(Array.isArray(result.equipment)).toBe(true);
  });

  test("repairs arrays where objects expected and vice versa", () => {
    const result = normalizeStructure({ materials: "not-an-array", equipment: { 0: "Four" }, capacity: "40" });
    expect(Array.isArray(result.materials)).toBe(true);
    expect(result.equipment).toEqual(["Four"]);
    expect(result.capacity).toBe(40);
  });

  test("derives seats from capacity when missing", () => {
    expect(normalizeStructure({ capacity: 55 }).seats).toBe(55);
  });
});

describe("normalizeFinance", () => {
  test("returns safe defaults for null/undefined/malformed input", () => {
    const result = normalizeFinance(null);
    expect(result.revenue).toHaveLength(6);
    expect(result.costs).toHaveLength(6);
    expect(typeof result.months).toBe("object");
  });

  test("handles JSON string revenue/costs", () => {
    const result = normalizeFinance({ revenue: "[1,2,3]", costs: "not-json" });
    expect(result.revenue).toEqual([1, 2, 3]);
    expect(result.costs).toHaveLength(6);
  });

  test("handles objects where arrays are expected", () => {
    const result = normalizeFinance({ revenue: { 0: 100, 1: 200 } });
    expect(result.revenue).toEqual([100, 200]);
  });

  test("keeps taxes as a number when not array-like", () => {
    expect(normalizeFinance({ taxes: "15" }).taxes).toBe(15);
  });

  test("keeps taxes as an array when supplied as an array", () => {
    expect(normalizeFinance({ taxes: [10, 20] }).taxes).toEqual([10, 20]);
  });
});

describe("normalizeMarketing", () => {
  test("returns safe defaults for null/undefined", () => {
    const result = normalizeMarketing(null);
    expect(Array.isArray(result.channels)).toBe(true);
    expect(Array.isArray(result.campaigns)).toBe(true);
  });

  test("repairs a mismatched schema (e.g. campaigns as a number)", () => {
    const result = normalizeMarketing({ budget: 500, campaigns: 3, channels: "invalid" });
    expect(result.budget).toBe(500);
    expect(Array.isArray(result.campaigns)).toBe(true);
    expect(Array.isArray(result.channels)).toBe(true);
  });

  test("normalizes malformed channel/campaign entries", () => {
    const result = normalizeMarketing({ channels: [null, { name: "Web" }], campaigns: [42] });
    expect(result.channels).toHaveLength(2);
    expect(result.channels[1].name).toBe("Web");
    expect(result.campaigns[0].name).toEqual(expect.any(String));
  });
});

describe("normalizeESG", () => {
  test("returns safe defaults for null/undefined", () => {
    const result = normalizeESG(undefined);
    expect(typeof result.wasteReduction).toBe("number");
    expect(Array.isArray(result.certifications)).toBe(true);
  });

  test("repairs a mismatched schema (e.g. hotel-level esg fields)", () => {
    const result = normalizeESG({ energy: 10, water: 5, certifications: "Label" });
    expect(typeof result.wasteReduction).toBe("number");
    expect(Array.isArray(result.certifications)).toBe(true);
  });
});

describe("normalizeExpansion", () => {
  test("returns safe defaults and repairs malformed establishments", () => {
    const result = normalizeExpansion({ establishments: [null, { name: "Bistro" }] });
    expect(result.establishments).toHaveLength(2);
    expect(result.establishments[1].name).toBe("Bistro");
  });
});

describe("normalizeProgression", () => {
  test("returns safe defaults for null/undefined", () => {
    expect(normalizeProgression(null)).toEqual({
      xp: 0,
      completedTutorials: [],
      unlockedAchievements: [],
      difficulty: "easy",
      cycles: 0,
      ready: false,
    });
  });

  test("repairs malformed arrays/objects", () => {
    const result = normalizeProgression({ completedTutorials: "overview", unlockedAchievements: { 0: "first-cycle" } });
    expect(Array.isArray(result.completedTutorials)).toBe(true);
    expect(result.unlockedAchievements).toEqual(["first-cycle"]);
  });

  // Regression test: normalizeProgression() used to silently drop `ready`
  // (it wasn't in its whitelist of copied fields), which reset
  // progression.ready to falsy on every normalizeRestaurant() pass --
  // see useSupabaseRestaurant.js's reload() -- leaving the player stuck
  // on "Étape 1" (pages/RestaurantStructure.jsx) even after a successful
  // "Valider l'établissement" submit (see pages/RestaurantSimulator.jsx).
  test("preserves progression.ready once the establishment has been validated", () => {
    expect(normalizeProgression({ ready: true }).ready).toBe(true);
    expect(normalizeProgression({ ready: false }).ready).toBe(false);
    expect(normalizeProgression(null).ready).toBe(false);
  });
});

describe("normalizeRestaurant", () => {
  test("never throws and returns a fully valid object for null input", () => {
    expect(() => normalizeRestaurant(null)).not.toThrow();
    const result = normalizeRestaurant(null);
    expect(result).toMatchObject({
      structure: expect.any(Object),
      finance: expect.any(Object),
      staff: expect.any(Array),
      menu: expect.any(Array),
      operations: expect.any(Array),
      marketing: expect.any(Object),
      esg: expect.any(Object),
      expansion: expect.any(Object),
      progression: expect.any(Object),
    });
  });

  test("handles a fully malformed Supabase-like payload without throwing", () => {
    const malformed = {
      structure: "not-an-object",
      finance: null,
      staff: { 0: { name: "A" } },
      menu: "invalid",
      operations: 42,
      marketing: { budget: 100, campaigns: 5 },
      esg: { energy: 10 },
      expansion: [],
      progression: "invalid",
    };
    expect(() => normalizeRestaurant(malformed)).not.toThrow();
    const result = normalizeRestaurant(malformed);
    expect(result.staff).toHaveLength(1);
    expect(Array.isArray(result.menu)).toBe(true);
    expect(Array.isArray(result.operations)).toBe(true);
    expect(Array.isArray(result.marketing.campaigns)).toBe(true);
  });
});
