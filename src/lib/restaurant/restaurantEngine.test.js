import { runRestaurantCycle } from "./restaurantEngine";
import { createInitialRestaurantState } from "./restaurantState";

function baseRestaurant() {
  return {
    ...createInitialRestaurantState({ structure: { name: "Le Central", concept: "Bistro", location: "Lyon", capacity: 40 } }),
    staff: [{ id: 1, name: "Ada", salary: 2500, satisfaction: 70 }],
    menu: [{ id: 1, name: "Burger", price: 15, cost: 6, sales: 20 }],
  };
}

test("seeds a fresh state when none is provided", () => {
  const { restaurantState } = runRestaurantCycle({});
  expect(restaurantState.structure.name).toBe("");
});

test("produces a RestaurantReport with the documented shape", () => {
  const { report } = runRestaurantCycle({ restaurantState: baseRestaurant(), rooms: [], reservations: [], events: [] });
  expect(report).toEqual(
    expect.objectContaining({
      date: expect.any(String),
      demand: expect.any(Number),
      rushHour: expect.any(String),
      complaints: expect.any(Number),
      maintenanceRisk: expect.any(Number),
      customerSatisfaction: expect.any(Number),
      finance: expect.objectContaining({ menuRevenue: expect.any(Number) }),
      staff: expect.objectContaining({ headcount: 1 }),
      menu: expect.objectContaining({ popularity: expect.any(Number) }),
      rm: expect.objectContaining({ demandBoost: expect.any(Number) }),
      pms: expect.objectContaining({ hotelOccupancy: expect.any(Number) }),
      events: [],
    })
  );
});

test("syncs with PMS: hotel occupancy derives from occupiedRooms/rooms.length", () => {
  const { report } = runRestaurantCycle({
    restaurantState: baseRestaurant(),
    rooms: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
    occupiedRooms: 2,
  });
  expect(report.pms.hotelOccupancy).toBe(50);
});

test("syncs with RM: a strong forecast raises demand", () => {
  const withoutRM = runRestaurantCycle({ restaurantState: baseRestaurant() }).report.demand;
  const withRM = runRestaurantCycle({
    restaurantState: baseRestaurant(),
    rmReport: { forecast: { next7: 4000 } },
    rooms: [{ id: 1 }],
    occupiedRooms: 1,
  }).report.demand;
  expect(withRM).toBeGreaterThanOrEqual(withoutRM);
});

test("syncs with events: a restaurant_rush event is reflected in the report and creates a task", () => {
  const { report, restaurantState } = runRestaurantCycle({
    restaurantState: baseRestaurant(),
    events: [{ id: "restaurant_rush", name: "Rush restaurant", category: "restaurant", severity: "high", message: "Rush du service" }],
  });
  expect(report.events).toHaveLength(1);
  expect(restaurantState.operations.some((task) => task.sourceEventId === "restaurant_rush")).toBe(true);
});

test("does not mutate the input restaurantState", () => {
  const input = baseRestaurant();
  const snapshot = JSON.parse(JSON.stringify(input));
  runRestaurantCycle({ restaurantState: input, events: [{ id: "restaurant_rush", category: "restaurant", severity: "high" }] });
  expect(input).toEqual(snapshot);
});
