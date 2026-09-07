// The restaurant's own day-to-day simulation: demand, service quality,
// complaints, maintenance risk -- fed by menu popularity (restaurantMenu.js),
// staff productivity (restaurantStaff.js), the hotel's RM signal
// (restaurantRM.js) and today's relevant events (restaurantEvents.js).
import { safeArray } from "../safe";
import { computeMenuPopularity } from "./restaurantMenu";
import { computeStaffProductivity } from "./restaurantStaff";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function simulateOperations(state, { rmSync = {}, eventImpact = {} } = {}) {
  const staff = safeArray(state?.staff, []);
  const operations = safeArray(state?.operations, []);
  const menu = safeArray(state?.menu, []);

  const baseComplaints = operations.filter((task) => task.type === "complaint" && task.status !== "résolue").length;
  const complaints = clamp(baseComplaints + Number(eventImpact.complaintsDelta || 0), 0, 20);

  const menuPopularity = computeMenuPopularity(menu);
  const staffProductivity = computeStaffProductivity(staff, { complaints });

  const demand = clamp(
    45 + menuPopularity / 3 - complaints * 8 + Number(rmSync.demandBoost || 0) + Number(eventImpact.demandDelta || 0),
    30,
    100
  );

  const customerSatisfaction = clamp(3.4 + staffProductivity / 30 + menuPopularity / 35 - complaints * 0.4, 2, 5);

  const maintenanceRisk = clamp(
    12 + operations.filter((task) => task.type === "maintenance").length * 10 + Number(eventImpact.maintenanceDelta || 0) - staff.length * 0.8,
    5,
    95
  );

  const rushHour = demand > 80 ? "19:00-22:00" : demand > 65 ? "18:00-21:00" : "17:00-20:00";

  return {
    demand: Math.round(demand),
    rushHour,
    staffProductivity,
    customerSatisfaction: Number(customerSatisfaction.toFixed(2)),
    menuPopularity,
    complaints: Math.round(complaints),
    maintenanceRisk: Math.round(maintenanceRisk),
  };
}

// Folds today's metrics/events into the operations task list: escalates
// existing complaint/maintenance tasks once their metric crosses a
// threshold, and appends any new tasks an event just created.
export function resolveOperationsTasks(operations, metrics, eventImpact = {}) {
  const escalated = safeArray(operations, []).map((task) => {
    if (task.type === "complaint" && metrics.complaints > 3 && task.status !== "résolue") return { ...task, status: "ouverte" };
    if (task.type === "maintenance" && metrics.maintenanceRisk > 40 && task.status !== "résolue") return { ...task, status: "planifiée" };
    return task;
  });

  const created = safeArray(eventImpact.tasksToCreate, []).map((task, index) => ({
    id: `evt-${task.sourceEventId || "task"}-${Date.now()}-${index}`,
    ...task,
  }));

  // Keep the list from growing unbounded across a long-running session.
  return [...escalated, ...created].slice(-40);
}
