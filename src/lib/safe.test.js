import { safeArray, safeJSON, safeNumber, safeObject, safeString } from "./safe";

describe("safeArray", () => {
  test("returns arrays as-is", () => {
    expect(safeArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  test("falls back for null/undefined", () => {
    expect(safeArray(null, ["x"])).toEqual(["x"]);
    expect(safeArray(undefined)).toEqual([]);
  });

  test("parses JSON array strings", () => {
    expect(safeArray("[1,2,3]")).toEqual([1, 2, 3]);
  });

  test("falls back for malformed JSON strings", () => {
    expect(safeArray("{not json", ["fallback"])).toEqual(["fallback"]);
  });

  test("falls back for JSON strings that are not arrays", () => {
    expect(safeArray('{"a":1}', ["fallback"])).toEqual(["fallback"]);
  });

  test("converts plain objects (arrays expected) into their values", () => {
    expect(safeArray({ 0: "a", 1: "b" })).toEqual(["a", "b"]);
  });

  test("never throws on unexpected types", () => {
    expect(() => safeArray(42)).not.toThrow();
    expect(safeArray(42, [])).toEqual([]);
  });
});

describe("safeNumber", () => {
  test("returns finite numbers as-is", () => {
    expect(safeNumber(42)).toBe(42);
  });

  test("parses numeric strings", () => {
    expect(safeNumber("42.5")).toBe(42.5);
  });

  test("falls back for null/undefined/NaN/malformed strings", () => {
    expect(safeNumber(null, 5)).toBe(5);
    expect(safeNumber(undefined, 5)).toBe(5);
    expect(safeNumber("abc", 5)).toBe(5);
    expect(safeNumber(NaN, 5)).toBe(5);
  });

  test("falls back for arrays/objects (numbers expected)", () => {
    expect(safeNumber([1, 2], 0)).toBe(0);
    expect(safeNumber({ a: 1 }, 0)).toBe(0);
  });
});

describe("safeObject", () => {
  test("returns plain objects as-is", () => {
    expect(safeObject({ a: 1 })).toEqual({ a: 1 });
  });

  test("falls back for null/undefined", () => {
    expect(safeObject(null, { fallback: true })).toEqual({ fallback: true });
  });

  test("falls back for arrays (objects expected)", () => {
    expect(safeObject([1, 2, 3], { fallback: true })).toEqual({ fallback: true });
  });

  test("parses JSON object strings", () => {
    expect(safeObject('{"a":1}')).toEqual({ a: 1 });
  });

  test("falls back for malformed JSON or JSON arrays", () => {
    expect(safeObject("{bad json", { fallback: true })).toEqual({ fallback: true });
    expect(safeObject("[1,2]", { fallback: true })).toEqual({ fallback: true });
  });
});

describe("safeString", () => {
  test("returns strings as-is", () => {
    expect(safeString("hello")).toBe("hello");
  });

  test("stringifies numbers and booleans", () => {
    expect(safeString(42)).toBe("42");
    expect(safeString(true)).toBe("true");
  });

  test("falls back for null/undefined/objects/arrays", () => {
    expect(safeString(null, "fallback")).toBe("fallback");
    expect(safeString(undefined, "fallback")).toBe("fallback");
    expect(safeString({}, "fallback")).toBe("fallback");
    expect(safeString([], "fallback")).toBe("fallback");
  });
});

describe("safeJSON", () => {
  test("parses JSON strings", () => {
    expect(safeJSON('{"a":1}')).toEqual({ a: 1 });
    expect(safeJSON("[1,2,3]")).toEqual([1, 2, 3]);
  });

  test("returns already-parsed objects/arrays as-is", () => {
    expect(safeJSON({ a: 1 })).toEqual({ a: 1 });
    expect(safeJSON([1, 2])).toEqual([1, 2]);
  });

  test("falls back for null/undefined/malformed JSON", () => {
    expect(safeJSON(null, "fallback")).toBe("fallback");
    expect(safeJSON(undefined, "fallback")).toBe("fallback");
    expect(safeJSON("{not json", "fallback")).toBe("fallback");
  });
});
