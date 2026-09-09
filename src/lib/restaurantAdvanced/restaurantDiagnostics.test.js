import { generateRestaurantDiagnostics } from "./restaurantDiagnostics";

function baseArgs(overrides = {}) {
  return {
    foodCost: { overall: 25, volatilityIndex: 20 },
    profitability: { grossMargin: 65, netMargin: 30 },
    menuEngineering: { items: new Array(10).fill(0), counts: { stars: 5, plowhorses: 2, puzzles: 2, dogs: 1 } },
    popularity: { declining: [] },
    staffOverload: 40,
    esgWastePct: 20,
    ...overrides,
  };
}

test("returns no diagnostics for a healthy restaurant", () => {
  expect(generateRestaurantDiagnostics(baseArgs())).toEqual([]);
});

test("flags critical food cost above 38%", () => {
  const diagnostics = generateRestaurantDiagnostics(baseArgs({ foodCost: { overall: 40, volatilityIndex: 20 } }));
  expect(diagnostics.some((d) => d.type === "error" && /food cost/i.test(d.message))).toBe(true);
});

test("flags elevated food cost above 32% as an anomaly, not an error", () => {
  const diagnostics = generateRestaurantDiagnostics(baseArgs({ foodCost: { overall: 34, volatilityIndex: 20 } }));
  expect(diagnostics.some((d) => d.type === "anomaly" && /food cost/i.test(d.message))).toBe(true);
});

test("flags low gross margin", () => {
  const diagnostics = generateRestaurantDiagnostics(baseArgs({ profitability: { grossMargin: 40, netMargin: 30 } }));
  expect(diagnostics.some((d) => /marge brute/i.test(d.message))).toBe(true);
});

test("flags insufficient net margin as an error", () => {
  const diagnostics = generateRestaurantDiagnostics(baseArgs({ profitability: { grossMargin: 65, netMargin: 10 } }));
  expect(diagnostics.some((d) => d.type === "error" && /marge nette/i.test(d.message))).toBe(true);
});

test("flags too many Dogs as an opportunity", () => {
  const diagnostics = generateRestaurantDiagnostics(
    baseArgs({ menuEngineering: { items: new Array(10).fill(0), counts: { stars: 2, plowhorses: 2, puzzles: 2, dogs: 4 } } })
  );
  expect(diagnostics.some((d) => d.type === "opportunity" && /dogs/i.test(d.message))).toBe(true);
});

test("flags declining popularity trend", () => {
  const diagnostics = generateRestaurantDiagnostics(baseArgs({ popularity: { declining: [1, 2, 3] } }));
  expect(diagnostics.some((d) => /popularité/i.test(d.message))).toBe(true);
});

test("flags kitchen overload above 70", () => {
  const diagnostics = generateRestaurantDiagnostics(baseArgs({ staffOverload: 85 }));
  expect(diagnostics.some((d) => /surcharge/i.test(d.message))).toBe(true);
});

test("flags high food waste as an opportunity", () => {
  const diagnostics = generateRestaurantDiagnostics(baseArgs({ esgWastePct: 60 }));
  expect(diagnostics.some((d) => d.type === "opportunity" && /gaspillage/i.test(d.message))).toBe(true);
});
