import { checkObjectives } from "./objectives";

test("profitable_day fires only when today's profit is positive", () => {
  expect(checkObjectives({ dailyReport: { profit: 100 } }).map((o) => o.id)).toContain("profitable_day");
  expect(checkObjectives({ dailyReport: { profit: -1 } }).map((o) => o.id)).not.toContain("profitable_day");
});

test("full_house fires only when every room is occupied", () => {
  const full = checkObjectives({ rooms: [{ id: 1 }, { id: 2 }], dailyReport: { hotelRevenue: { occupiedRooms: 2 } } });
  const partial = checkObjectives({ rooms: [{ id: 1 }, { id: 2 }], dailyReport: { hotelRevenue: { occupiedRooms: 1 } } });
  expect(full.map((o) => o.id)).toContain("full_house");
  expect(partial.map((o) => o.id)).not.toContain("full_house");
});

test("full_house never fires with no rooms at all", () => {
  expect(checkObjectives({ rooms: [], dailyReport: { hotelRevenue: { occupiedRooms: 0 } } }).map((o) => o.id)).not.toContain("full_house");
});

test("upsell_master fires once upsell revenue reaches the threshold", () => {
  expect(checkObjectives({ dailyReport: { hotelRevenue: { upsellRevenue: 100 } } }).map((o) => o.id)).toContain("upsell_master");
  expect(checkObjectives({ dailyReport: { hotelRevenue: { upsellRevenue: 99 } } }).map((o) => o.id)).not.toContain("upsell_master");
});

test("spotless_service fires only when there are no open complaints", () => {
  expect(checkObjectives({ restaurantState: { operations: [] } }).map((o) => o.id)).toContain("spotless_service");
  expect(checkObjectives({ restaurantState: { operations: [{ type: "complaint" }] } }).map((o) => o.id)).not.toContain("spotless_service");
});

test("happy_team fires only when average staff satisfaction is high enough", () => {
  const happy = checkObjectives({ restaurantState: { staff: [{ satisfaction: 90 }, { satisfaction: 85 }] } });
  const unhappy = checkObjectives({ restaurantState: { staff: [{ satisfaction: 40 }] } });
  expect(happy.map((o) => o.id)).toContain("happy_team");
  expect(unhappy.map((o) => o.id)).not.toContain("happy_team");
});

test("happy_team never fires with no staff at all", () => {
  expect(checkObjectives({ restaurantState: { staff: [] } }).map((o) => o.id)).not.toContain("happy_team");
});

test("returns objects with id/name/description, not the raw definitions", () => {
  const result = checkObjectives({ dailyReport: { profit: 100 } });
  const profitable = result.find((o) => o.id === "profitable_day");
  expect(profitable).toEqual({ id: "profitable_day", name: expect.any(String), description: expect.any(String) });
});

test("a throwing check is treated as not completed rather than crashing the whole call", () => {
  // Destructuring off `null` throws inside every check(); each is caught
  // and treated as "not completed" instead of blowing up the whole call.
  expect(() => checkObjectives(null)).not.toThrow();
  expect(checkObjectives(null)).toEqual([]);
});

test("with no data at all, only the trivially-true objectives (no complaints recorded) complete", () => {
  expect(checkObjectives(undefined).map((o) => o.id)).toEqual(["spotless_service"]);
});
