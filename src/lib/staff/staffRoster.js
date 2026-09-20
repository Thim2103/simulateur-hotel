// The hotel-side staff ROSTER: named employees with a role, a skill level, a
// daily salary and fatigue/morale, stored at `hotelState.staffRoster`.
// Before this the hotel side had no roster at all -- only one monthly
// `finance.payroll` number, with headcount ESTIMATED from it (see
// staffCalculations.js's own docstring) -- so hiring "a housekeeper" or
// "a technician" was not expressible. Restaurant staff (kitchen/service)
// keep living in `restaurantState.staff` (managed by the existing
// staffActions/RestaurantHR); this module deliberately does not touch them.
//
// Inert by design: a hotel with NO `staffRoster` array behaves exactly as
// before (every function here returns a neutral value), so careers saved
// earlier and every existing fixture are untouched. Everything is pure and
// DETERMINISTIC -- no `rng` -- so tests that pin a fixed rng sequence keep
// passing (see lib/demand/demandEngine.js for the same reasoning).
//
// Money: the roster's daily salaries are an ADDITIONAL payroll line
// (calculateExpenses.js adds `rosterDailyPayroll`; finance/staff engines
// read `effectiveHotelFinance`). A starter roster is seeded by
// SUBTRACTING its monthly total from the base `finance.payroll`, so
// today's economics are unchanged the day it appears; hiring adds cost,
// firing removes it.
import { safeArray, safeNumber, safeObject } from "../safe";
import { debitCurrentMonth } from "../finance/oneOffCosts";

export const ROLES = {
  housekeeping: { label: "Gouvernante / Housekeeping", baseDailySalary: 62, roomsPerAgent: 10 },
  maintenance: { label: "Technicien / Maintenance", baseDailySalary: 78 },
  reception: { label: "Réceptionniste", baseDailySalary: 68, roomsPerAgent: 25 },
};

export const LEVELS = {
  beginner: { label: "Débutant", efficiency: 0.8, salaryMultiplier: 0.85, rank: 0 },
  experienced: { label: "Expérimenté", efficiency: 1, salaryMultiplier: 1, rank: 1 },
  expert: { label: "Expert", efficiency: 1.3, salaryMultiplier: 1.4, rank: 2 },
};
const LEVEL_ORDER = ["beginner", "experienced", "expert"];

export const DAYS_PER_MONTH = 30;
export const HIRE_FEE_DAYS = 7; // recruitment fee, in days of the new hire's salary
export const FIRE_SEVERANCE_DAYS = 10;
export const TRAINING_COST_DAYS = 15;
export const TRAINING_DURATION_DAYS = 3;
export const TRAINING_EFFICIENCY = 0.5; // someone in training only half-works
export const MAX_ROSTER_SIZE = 30;

// Which incident severities a technician of each level can fix on their own.
export const TECHNICIAN_MAX_SEVERITY = { beginner: "minor", experienced: "moderate", expert: "critical" };

const NAMES = ["Camille", "Hugo", "Léa", "Nathan", "Inès", "Louis", "Manon", "Jules", "Sarah", "Karim", "Chloé", "Yanis"];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function dailySalaryFor(role, level) {
  return Math.round((ROLES[role]?.baseDailySalary || 0) * (LEVELS[level]?.salaryMultiplier || 0));
}

export function hasRoster(hotelState) {
  return Array.isArray(safeObject(hotelState).staffRoster);
}

export function getRoster(hotelState) {
  return safeArray(safeObject(hotelState).staffRoster);
}

export function createEmployee({ id, name, role, level, day = 0 }) {
  return { id, name, role, level, dailySalary: dailySalaryFor(role, level), fatigue: 20, morale: 70, hiredOnDay: day, training: null };
}

// How much real work one employee gets done, relative to an experienced,
// rested one: skill level x tiredness x morale, halved while in training.
export function employeeEfficiency(employee) {
  if (employee?.sick) return 0; // on sick leave (see staffEventsEngine.js)
  const level = LEVELS[employee?.level]?.efficiency ?? 1;
  const fatigue = safeNumber(employee?.fatigue, 0);
  const morale = safeNumber(employee?.morale, 70);
  const fatigueFactor = fatigue > 80 ? 0.7 : fatigue > 60 ? 0.85 : 1;
  const moraleFactor = morale < 30 ? 0.85 : 1;
  const trainingFactor = employee?.training ? TRAINING_EFFICIENCY : 1;
  return level * fatigueFactor * moraleFactor * trainingFactor;
}

// ---- payroll ---------------------------------------------------------

export function rosterDailyPayroll(hotelState) {
  return getRoster(hotelState).reduce((sum, employee) => sum + safeNumber(employee.dailySalary, 0), 0);
}

export function rosterMonthlyPayroll(hotelState) {
  return rosterDailyPayroll(hotelState) * DAYS_PER_MONTH;
}

// The hotel's `finance` object with the roster's monthly payroll folded
// into `payroll` -- what the finance and staff engines should read, so
// they see the whole hotel-side payroll (base + roster) without either of
// them knowing a roster exists.
export function effectiveHotelFinance(hotelState) {
  const state = safeObject(hotelState);
  const finance = safeObject(state.finance);
  if (!hasRoster(state)) return finance;
  return { ...finance, payroll: safeNumber(finance.payroll, 0) + rosterMonthlyPayroll(state) };
}

// ---- staffing coverage ------------------------------------------------

function capacityFor(roster, role) {
  const perAgent = ROLES[role].roomsPerAgent;
  return roster.filter((employee) => employee.role === role).reduce((sum, employee) => sum + employeeEfficiency(employee) * perAgent, 0);
}

// How well the roster covers today's occupied rooms: coverage 1 = exactly
// enough, below 1 = shortage. Null when the hotel has no roster (inert).
export function computeStaffing(hotelState, { occupiedRooms = 0, day = null } = {}) {
  if (!hasRoster(hotelState)) return null;
  const roster = getRoster(hotelState);
  const occupied = Math.max(0, safeNumber(occupiedRooms, 0));
  const coverage = (role) => (occupied === 0 ? 1 : capacityFor(roster, role) / occupied);

  const housekeepingCoverage = coverage("housekeeping");
  const receptionCoverage = coverage("reception");
  const technicians = roster.filter((employee) => employee.role === "maintenance").length;

  return {
    day,
    occupiedRooms: occupied,
    housekeepingCoverage,
    receptionCoverage,
    technicians,
    // A shortage of housekeepers slows cleaning proportionally (capped).
    cleaningDelayFactor: housekeepingCoverage >= 1 ? 1 : Math.min(2.5, 1 / Math.max(housekeepingCoverage, 0.01)),
    dailyPayroll: rosterDailyPayroll(hotelState),
  };
}

// Guest satisfaction points (0-100 scale) lost to understaffing, read from
// the snapshot advanceRoster() stores each day at `hotelState.staffing`.
export const HOUSEKEEPING_SHORTAGE_PENALTY = 40; // per 100% shortage
export const MAX_HOUSEKEEPING_PENALTY = 20;
export const RECEPTION_SHORTAGE_PENALTY = 20;
export const MAX_RECEPTION_PENALTY = 8;

export function staffingSatisfactionPenalty(hotelState) {
  const staffing = safeObject(safeObject(hotelState).staffing);
  if (staffing.housekeepingCoverage === undefined) return 0;
  const housekeeping = Math.min(MAX_HOUSEKEEPING_PENALTY, Math.max(0, 1 - safeNumber(staffing.housekeepingCoverage, 1)) * HOUSEKEEPING_SHORTAGE_PENALTY);
  const reception = Math.min(MAX_RECEPTION_PENALTY, Math.max(0, 1 - safeNumber(staffing.receptionCoverage, 1)) * RECEPTION_SHORTAGE_PENALTY);
  return housekeeping + reception;
}

export function cleaningDelayFactor(hotelState) {
  return Math.max(1, safeNumber(safeObject(safeObject(hotelState).staffing).cleaningDelayFactor, 1));
}

// ---- daily evolution -------------------------------------------------

function loadRatio(employee, staffing, handledIds) {
  if (employee.role === "housekeeping") return staffing.housekeepingCoverage >= 1 ? 0.8 : 1 / Math.max(staffing.housekeepingCoverage, 0.01);
  if (employee.role === "reception") return staffing.receptionCoverage >= 1 ? 0.8 : 1 / Math.max(staffing.receptionCoverage, 0.01);
  return handledIds.has(employee.id) ? 1.2 : 0.5; // a technician on a repair works hard
}

// One day of wear and progress: records today's staffing snapshot, then
// tires or rests each employee (overloaded -> fatigue up, otherwise
// recovers), moves morale with fatigue, and finishes any training that is
// due. Called once per played day by careerEngine.runCareerDay(). No-op
// without a roster.
export function advanceRoster(hotelState, { occupiedRooms = 0, day = 0 } = {}) {
  if (!hasRoster(hotelState)) return hotelState;
  const state = safeObject(hotelState);
  const staffing = computeStaffing(state, { occupiedRooms, day });
  const handledIds = new Set(safeArray(state.activeIncidents).filter((incident) => incident.status === "repairing" && incident.handledBy).map((incident) => incident.handledBy));

  const staffRoster = getRoster(state).map((employee) => {
    const overloaded = loadRatio(employee, staffing, handledIds) > 1;
    const fatigue = clamp(safeNumber(employee.fatigue, 0) + (overloaded ? 8 : -10), 0, 100);
    let morale = safeNumber(employee.morale, 70);
    if (fatigue > 70) morale -= 3;
    else if (fatigue < 40) morale += 2;

    let next = { ...employee, fatigue, morale: clamp(morale, 0, 100) };
    if (employee.training && day >= employee.training.untilDay) {
      next = { ...next, level: employee.training.toLevel, dailySalary: Math.round(dailySalaryFor(employee.role, employee.training.toLevel) * safeNumber(employee.raiseFactor, 1)), morale: clamp(next.morale + 10, 0, 100), training: null };
    }
    return next;
  });

  return { ...state, staffRoster, staffing };
}

// ---- player actions (pure bundle => bundle, for applyHotelAdjustment) ----

function nextEmployeeId(roster, role, day) {
  return `staff-${role}-${day}-${roster.length + 1}`;
}

export function hiringCost(role, level) {
  return dailySalaryFor(role, level) * HIRE_FEE_DAYS;
}

export function severanceCost(employee) {
  return safeNumber(employee?.dailySalary, 0) * FIRE_SEVERANCE_DAYS;
}

export function trainingCost(employee) {
  return safeNumber(employee?.dailySalary, 0) * TRAINING_COST_DAYS;
}

export function nextLevel(level) {
  const index = LEVEL_ORDER.indexOf(level);
  return index >= 0 && index < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[index + 1] : null;
}

// A no-op (returns the bundle unchanged) on any invalid request, like every
// other action in this codebase.
export function hireEmployee(hotelBundle, { role, level = "beginner", name, day = 0 } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  if (!ROLES[role] || !LEVELS[level]) return bundle;
  const roster = getRoster(hotelState);
  if (roster.length >= MAX_ROSTER_SIZE) return bundle;

  const employee = createEmployee({ id: nextEmployeeId(roster, role, day), name: name || NAMES[roster.length % NAMES.length], role, level, day });
  const withEmployee = { ...hotelState, staffRoster: [...roster, employee] };
  return { ...bundle, hotelState: debitCurrentMonth(withEmployee, hiringCost(role, level)) };
}

// Takes someone off the roster (fired or resigned). A repair they were
// handling goes back to the queue.
export function removeFromRoster(hotelState, employeeId) {
  const state = safeObject(hotelState);
  const activeIncidents = safeArray(state.activeIncidents).map((incident) =>
    incident.handledBy === employeeId && incident.status === "repairing" ? { ...incident, status: "active", handledBy: null, repairEtaDay: null } : incident
  );
  return { ...state, staffRoster: getRoster(state).filter((item) => item.id !== employeeId), activeIncidents };
}

export function fireEmployee(hotelBundle, employeeId) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const employee = getRoster(hotelState).find((item) => item.id === employeeId);
  if (!employee) return bundle;
  return { ...bundle, hotelState: debitCurrentMonth(removeFromRoster(hotelState, employeeId), severanceCost(employee)) };
}

// Starts a training that will raise the employee one level after
// TRAINING_DURATION_DAYS (see advanceRoster()); they work at half
// efficiency meanwhile. No-op for someone already expert or in training.
export function trainEmployee(hotelBundle, employeeId, { day = 0 } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const employee = getRoster(hotelState).find((item) => item.id === employeeId);
  const toLevel = employee ? nextLevel(employee.level) : null;
  if (!employee || !toLevel || employee.training) return bundle;

  const staffRoster = getRoster(hotelState).map((item) => (item.id === employeeId ? { ...item, training: { untilDay: day + TRAINING_DURATION_DAYS, toLevel } } : item));
  return { ...bundle, hotelState: debitCurrentMonth({ ...hotelState, staffRoster }, trainingCost(employee)) };
}

// ---- starter roster ---------------------------------------------------

const STARTER_TEAM = [
  { role: "housekeeping", level: "experienced", name: "Sophie" },
  { role: "housekeeping", level: "beginner", name: "Marc" },
  { role: "maintenance", level: "experienced", name: "Julien" },
  { role: "reception", level: "experienced", name: "Lina" },
];

// Gives a hotel its first roster WITHOUT changing what it spends: the
// roster's monthly payroll is taken out of the base `finance.payroll`.
// Skipped (returns the state unchanged) when the base payroll is too small
// to absorb it, unless `force` -- the Staff page's "Constituer l'équipe"
// button, for careers that started before rosters existed.
export function seedStarterRoster(hotelState, { force = false } = {}) {
  const state = safeObject(hotelState);
  if (hasRoster(state)) return state;
  const staffRoster = STARTER_TEAM.map((member, index) => createEmployee({ id: `staff-starter-${index + 1}`, ...member }));
  const monthly = staffRoster.reduce((sum, employee) => sum + employee.dailySalary, 0) * DAYS_PER_MONTH;
  const payroll = safeNumber(state.finance?.payroll, 0);
  if (!force && payroll < monthly) return state;
  return { ...state, staffRoster, finance: { ...safeObject(state.finance), payroll: Math.max(0, payroll - monthly) } };
}

const StaffRoster = {
  hireEmployee,
  fireEmployee,
  trainEmployee,
  advanceRoster,
  computeStaffing,
  seedStarterRoster,
  rosterDailyPayroll,
  effectiveHotelFinance,
  staffingSatisfactionPenalty,
};
export default StaffRoster;
