// Morale, resignations, bonuses and small HR events for the hotel roster
// (see staffRoster.js). advanceRoster() already tires the team out; this is
// what makes tiredness MATTER: sustained exhaustion crushes morale, a
// demoralised employee hands in notice and eventually leaves, and the
// player can fight back with a bonus or a raise. A few small HR events
// (sick leave, a training that goes faster than planned, a request for a
// raise) keep the team from feeling static.
//
// Deterministic on purpose. The "random" events are drawn from a hash of
// (employee, day, event kind) -- NOT from `rng` -- so (1) the same career
// always plays out the same way, (2) no draw is added to the rng sequence
// lib/events/ and lib/dailyCycle/'s tests pin, and (3) a test can force or
// forbid any event through `hotelState.staffEventsConfig` (rates of 1 / 0)
// instead of mocking anything. Inert without a roster.
//
// Called once per played day by careerEngine.runCareerDay(), right after
// staffRoster.advanceRoster() (so it sees the day's fresh fatigue). Its
// log lives at `hotelState.staffEventLog`, newest last, capped; DailyReview
// shows today's entries.
import { safeArray, safeNumber, safeObject } from "../safe.js";
import { debitCurrentMonth } from "../finance/oneOffCosts";
import { getRoster, hasRoster, removeFromRoster } from "./staffRoster";

// ---- tunables (override per hotel with hotelState.staffEventsConfig) ----
export const DEFAULT_CONFIG = {
  enabled: true,
  sicknessRate: 0.03, // per employee per day; x3 when worn out
  expressTrainingRate: 0.25, // per employee in training per day
  raiseRequestRate: 0.1, // per unhappy employee per day
};

export const HIGH_FATIGUE = 80;
export const HIGH_FATIGUE_MORALE_LOSS = 8; // extra morale lost per day once exhausted for 2+ days
export const EXHAUSTION_DAYS = 2;
export const RESIGNATION_MORALE = 15; // below this, notice is given
export const IMMEDIATE_QUIT_MORALE = 5; // at or below this, they leave on the spot
export const NOTICE_DAYS = 2;
export const RECOVERY_MORALE = 30; // back above this, a resignation notice is withdrawn
export const RAISE_REQUEST_MORALE = 45;
export const RAISE_REQUEST_MORALE_LOSS = 1; // an unanswered request festers

export const BONUS_COST_DAYS = 5; // of the employee's salary
export const BONUS_MORALE = 20;
export const BONUS_COOLDOWN_DAYS = 7;
export const RAISE_FACTOR = 1.1;
export const RAISE_MORALE = 15;
export const RAISE_COOLDOWN_DAYS = 14;
export const DECLINE_MORALE_LOSS = 5;

const MAX_LOG = 30;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resolveConfig(hotelState) {
  return { ...DEFAULT_CONFIG, ...safeObject(safeObject(hotelState).staffEventsConfig) };
}

// FNV-1a hash of a string, mapped to [0, 1). Same input, same number.
export function pseudoRandom(seed) {
  let hash = 2166136261;
  const text = String(seed);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function roll(employee, day, kind, rate) {
  return rate > 0 && pseudoRandom(`${employee.id}:${day}:${kind}`) < rate;
}

function event(day, type, employee, message) {
  return { id: `staff-event:${day}:${type}:${employee.id}`, day, type, employeeId: employee.id, employeeName: employee.name, message };
}

// ---- the daily pass ----------------------------------------------------

// One day of HR life, in order: (1) exhaustion eats morale, (2) resignation
// notices / departures, (3) small events. Returns the new hotel state with
// the updated roster and log; `events` of the day are the log entries
// whose `day` matches.
export function runStaffEvents(hotelState, { day = 0 } = {}) {
  if (!hasRoster(hotelState)) return hotelState;
  const config = resolveConfig(hotelState);
  const events = [];
  let state = safeObject(hotelState);

  const roster = getRoster(state).map((employee) => {
    let next = { ...employee };
    const tired = safeNumber(next.fatigue, 0) > HIGH_FATIGUE;
    next.highFatigueDays = tired ? safeNumber(next.highFatigueDays, 0) + 1 : 0;

    // Sick leave lasts exactly one day: it was set yesterday and has
    // already cost the team a day of that person's work (advanceRoster's
    // snapshot read it), so it ends now.
    if (next.sick && day >= safeNumber(next.sickUntilDay, 0)) next = { ...next, sick: false, sickUntilDay: null };

    let morale = safeNumber(next.morale, 70);
    if (next.highFatigueDays >= EXHAUSTION_DAYS) morale -= HIGH_FATIGUE_MORALE_LOSS;
    if (next.raiseRequested) morale -= RAISE_REQUEST_MORALE_LOSS;
    next.morale = clamp(morale, 0, 100);
    return next;
  });

  const staying = [];
  roster.forEach((employee) => {
    if (!config.enabled) {
      staying.push(employee);
      return;
    }
    let next = employee;

    // (2) resignation
    if (next.resignation && next.morale >= RECOVERY_MORALE) {
      next = { ...next, resignation: null };
      events.push(event(day, "resignation-withdrawn", next, `${next.name} retire sa démission : le moral est remonté.`));
    }
    if (next.morale <= IMMEDIATE_QUIT_MORALE || (next.resignation && day >= next.resignation.noticeUntilDay)) {
      events.push(event(day, "resigned", next, `${next.name} (${next.role}) a démissionné : moral trop bas après une période de surmenage.`));
      return; // gone -- not pushed to `staying`
    }
    if (!next.resignation && next.morale < RESIGNATION_MORALE) {
      next = { ...next, resignation: { noticeUntilDay: day + NOTICE_DAYS } };
      events.push(event(day, "resignation-notice", next, `${next.name} a donné son préavis (départ au jour ${day + NOTICE_DAYS}) : agissez vite (prime, augmentation, repos).`));
    }

    // (3) small events
    const sicknessRate = config.sicknessRate * (safeNumber(next.fatigue, 0) > 70 ? 3 : 1);
    if (!next.sick && !next.resignation && roll(next, day, "sick", sicknessRate)) {
      next = { ...next, sick: true, sickUntilDay: day + 1 };
      events.push(event(day, "sick", next, `${next.name} est en arrêt maladie demain : son poste n'est pas couvert.`));
    }
    if (next.training && day < next.training.untilDay && roll(next, day, "express-training", config.expressTrainingRate)) {
      next = { ...next, training: { ...next.training, untilDay: day } };
      events.push(event(day, "express-training", next, `Formation express réussie pour ${next.name} : le nouveau niveau sera acquis demain.`));
    }
    if (!next.raiseRequested && next.morale < RAISE_REQUEST_MORALE && day - safeNumber(next.lastRaiseDay, -Infinity) >= RAISE_COOLDOWN_DAYS && roll(next, day, "raise", config.raiseRequestRate)) {
      next = { ...next, raiseRequested: true };
      events.push(event(day, "raise-request", next, `${next.name} demande une augmentation (moral ${Math.round(next.morale)}/100).`));
    }
    staying.push(next);
  });

  // Departures: hand incidents back to the queue, keep the log entry.
  const goneIds = roster.filter((employee) => !staying.some((kept) => kept.id === employee.id)).map((employee) => employee.id);
  state = { ...state, staffRoster: staying };
  goneIds.forEach((id) => {
    state = removeFromRoster(state, id);
  });

  const existingLog = safeArray(state.staffEventLog);
  const known = new Set(existingLog.map((entry) => entry.id));
  const fresh = events.filter((entry) => !known.has(entry.id));
  return { ...state, staffEventLog: [...existingLog, ...fresh].slice(-MAX_LOG) };
}

// ---- player actions (pure bundle => bundle, for applyHotelAdjustment) ----

function findEmployee(bundle, employeeId) {
  return getRoster(safeObject(bundle).hotelState).find((employee) => employee.id === employeeId) || null;
}

function updateEmployee(bundle, employeeId, patch, extraDebit = 0) {
  const hotelState = safeObject(bundle.hotelState);
  const staffRoster = getRoster(hotelState).map((employee) => (employee.id === employeeId ? { ...employee, ...patch } : employee));
  const next = { ...hotelState, staffRoster };
  return { ...bundle, hotelState: extraDebit > 0 ? debitCurrentMonth(next, extraDebit) : next };
}

// A morale boost lifts a resignation notice once it clears the recovery bar.
function applyMorale(employee, delta) {
  const morale = clamp(safeNumber(employee.morale, 70) + delta, 0, 100);
  return { morale, resignation: employee.resignation && morale >= RECOVERY_MORALE ? null : employee.resignation ?? null };
}

export function bonusCost(employee) {
  return safeNumber(employee?.dailySalary, 0) * BONUS_COST_DAYS;
}

export function canGrantBonus(employee, day) {
  return !!employee && day - safeNumber(employee.lastBonusDay, -Infinity) >= BONUS_COOLDOWN_DAYS;
}

export function canGrantRaise(employee, day) {
  return !!employee && day - safeNumber(employee.lastRaiseDay, -Infinity) >= RAISE_COOLDOWN_DAYS;
}

// One-off bonus: costs BONUS_COST_DAYS of salary now, lifts morale. Once
// a week per person. A no-op on an unknown employee or during cooldown.
export function grantBonus(hotelBundle, employeeId, { day = 0 } = {}) {
  const bundle = safeObject(hotelBundle);
  const employee = findEmployee(bundle, employeeId);
  if (!employee || !canGrantBonus(employee, day)) return bundle;
  return updateEmployee(bundle, employeeId, { ...applyMorale(employee, BONUS_MORALE), lastBonusDay: day }, bonusCost(employee));
}

// Permanent +10% on the daily salary (it survives promotions, see
// staffRoster.js's raiseFactor), a morale lift, and any pending request is
// answered. Once every two weeks per person.
export function grantRaise(hotelBundle, employeeId, { day = 0 } = {}) {
  const bundle = safeObject(hotelBundle);
  const employee = findEmployee(bundle, employeeId);
  if (!employee || !canGrantRaise(employee, day)) return bundle;
  return updateEmployee(bundle, employeeId, {
    ...applyMorale(employee, RAISE_MORALE),
    dailySalary: Math.round(safeNumber(employee.dailySalary, 0) * RAISE_FACTOR),
    raiseFactor: safeNumber(employee.raiseFactor, 1) * RAISE_FACTOR,
    raiseRequested: false,
    lastRaiseDay: day,
  });
}

// Turning down a request settles it, at a morale price. No-op if there is none.
export function declineRaise(hotelBundle, employeeId) {
  const bundle = safeObject(hotelBundle);
  const employee = findEmployee(bundle, employeeId);
  if (!employee || !employee.raiseRequested) return bundle;
  return updateEmployee(bundle, employeeId, { ...applyMorale(employee, -DECLINE_MORALE_LOSS), raiseRequested: false });
}

// Today's log entries, for DailyReview.
export function todaysStaffEvents(hotelState, day) {
  return safeArray(safeObject(hotelState).staffEventLog).filter((entry) => entry.day === day);
}

const StaffEventsEngine = { runStaffEvents, grantBonus, grantRaise, declineRaise, todaysStaffEvents, pseudoRandom };
export default StaffEventsEngine;
