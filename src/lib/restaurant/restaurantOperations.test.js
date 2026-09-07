import { simulateOperations, resolveOperationsTasks } from "./restaurantOperations";

function state(overrides = {}) {
  return { staff: [{ salary: 3000 }], operations: [], menu: [{ price: 10, cost: 4, sales: 20 }], ...overrides };
}

test("simulateOperations returns a full metrics object within expected bounds", () => {
  const metrics = simulateOperations(state());
  expect(metrics.demand).toBeGreaterThanOrEqual(30);
  expect(metrics.demand).toBeLessThanOrEqual(100);
  expect(metrics.customerSatisfaction).toBeGreaterThanOrEqual(2);
  expect(metrics.customerSatisfaction).toBeLessThanOrEqual(5);
});

test("existing complaint tasks raise the complaints metric", () => {
  const withComplaint = state({ operations: [{ type: "complaint", status: "ouverte" }] });
  const withoutComplaint = state();
  expect(simulateOperations(withComplaint).complaints).toBeGreaterThan(simulateOperations(withoutComplaint).complaints);
});

test("an event's complaintsDelta/demandDelta feed into the metrics", () => {
  const base = simulateOperations(state());
  const withEvent = simulateOperations(state(), { eventImpact: { complaintsDelta: 5, demandDelta: 10 } });
  expect(withEvent.complaints).toBeGreaterThan(base.complaints);
});

test("rushHour reflects the demand band", () => {
  const quiet = simulateOperations(state({ menu: [] }));
  expect(["17:00-20:00", "18:00-21:00", "19:00-22:00"]).toContain(quiet.rushHour);
});

test("resolveOperationsTasks escalates a complaint task once complaints crosses the threshold", () => {
  const tasks = resolveOperationsTasks([{ id: 1, type: "complaint", status: "à faire" }], { complaints: 5, maintenanceRisk: 10 });
  expect(tasks[0].status).toBe("ouverte");
});

test("resolveOperationsTasks appends tasks created by today's events", () => {
  const tasks = resolveOperationsTasks([], { complaints: 0, maintenanceRisk: 0 }, {
    tasksToCreate: [{ title: "Réagir : Rush", type: "complaint", status: "à faire", sourceEventId: "restaurant_rush" }],
  });
  expect(tasks).toHaveLength(1);
  expect(tasks[0]).toEqual(expect.objectContaining({ title: "Réagir : Rush", sourceEventId: "restaurant_rush" }));
});

test("resolveOperationsTasks caps the list at 40 entries", () => {
  const many = Array.from({ length: 50 }, (_, index) => ({ id: index, type: "cleaning", status: "à faire" }));
  expect(resolveOperationsTasks(many, { complaints: 0, maintenanceRisk: 0 })).toHaveLength(40);
});
