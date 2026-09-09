import { RADIAL_HUB, RADIAL_BRANCHES, branchPosition } from "./radialConfig";

test("the hub is Mon Hôtel, linking to /dashboard", () => {
  expect(RADIAL_HUB).toEqual({ id: "hotel", icon: "hotel", label: "Mon Hôtel", route: "/dashboard" });
});

test("there are exactly the 7 branches specified, each with a route", () => {
  expect(RADIAL_BRANCHES).toHaveLength(7);
  expect(RADIAL_BRANCHES.map((b) => b.id)).toEqual(["clients", "staff", "business", "marketing", "services", "esg", "development"]);
  RADIAL_BRANCHES.forEach((branch) => {
    expect(branch.route).toMatch(/^\//);
    expect(branch.icon).toEqual(expect.any(String));
    expect(branch.label).toEqual(expect.any(String));
  });
});

test("branchPosition places the first branch straight up from the hub", () => {
  const { x, y, angleDeg } = branchPosition(0, 7, 140);
  expect(angleDeg).toBe(-90);
  expect(x).toBe(0);
  expect(y).toBe(-140);
});

test("branchPosition spreads every branch evenly around the circle", () => {
  const positions = RADIAL_BRANCHES.map((_, index) => branchPosition(index, RADIAL_BRANCHES.length, 100));
  const angles = positions.map((p) => p.angleDeg);
  // 360/7 ≈ 51.43° between consecutive branches.
  expect(angles[1] - angles[0]).toBeCloseTo(360 / 7, 5);
  // Every branch stays within the requested radius.
  positions.forEach(({ x, y }) => {
    expect(Math.round(Math.sqrt(x * x + y * y))).toBeLessThanOrEqual(100);
  });
});
