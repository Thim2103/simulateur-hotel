// Running costs and upkeep of the hotel: every room, every built floor and
// every installed equipment upgrade (pool, domotics, kitchen...) costs a
// little to keep running each day (cleaning products, electricity, water,
// servicing). This is what stops the player from building without limit: the
// bigger and better the hotel, the higher its daily bill.
//
// The player also chooses a MAINTENANCE LEVEL -- Économique, Standard or
// Premium -- that scales that bill and decides how the hotel's CONDITION
// evolves (0-100, 80 at the start):
//
//   economy   cheaper, but the condition falls a little every day; a hotel in
//             poor condition annoys guests (satisfaction) and suffers wear
//             breakdowns, which cost repairs and reviews
//   standard  the reference: the condition holds
//   premium   dearer, but the condition climbs back and fewer breakdowns
//             happen at all
//
// The daily cost is computed by calculateExpenses() (so it lands in the
// day's expenses and, through updateFinance(), under its own line of the
// finance ledger: "Entretien & Charges d'exploitation") and recorded here
// once a day by recordMaintenance() (cumulative breakdown for the Finance
// page, last day's for the DailyReview, and the condition drift).
//
// State lives at `hotelState.maintenance` = { level, condition, ledger:
// { spent, byCategory: { rooms, equipment, floors }, last: { day, ...breakdown } } }.
// Pure and deterministic (no rng; wear breakdowns use the FNV hash of the
// day). A hotel that never chose anything and has nothing beyond the
// default condition simply has no `maintenance` state.
import { safeArray, safeNumber, safeObject } from "../safe";
import { UPGRADES } from "../zones/zoneUpgradesEngine";
import { builtFloors } from "../expansion/hotelExpansionEngine";
import { ecoUpkeepFactor } from "../expansion/majorProjectsEngine";
import { supplierMaintenanceFactor } from "../suppliers/suppliersEngine";
import { pseudoRandom } from "../staff/staffEventsEngine";

export const LEVELS = {
  economy: {
    label: "Économique",
    costMultiplier: 0.6,
    conditionDrift: -1,
    incidentMultiplier: 1,
    description: "−40 % de charges d'entretien, mais l'état de l'hôtel se dégrade chaque jour.",
  },
  standard: {
    label: "Standard",
    costMultiplier: 1,
    conditionDrift: 0,
    incidentMultiplier: 1,
    description: "L'équilibre : l'état de l'hôtel se maintient.",
  },
  premium: {
    label: "Premium",
    costMultiplier: 1.5,
    conditionDrift: 0.5,
    incidentMultiplier: 0.85,
    description: "+50 % de charges, mais l'état de l'hôtel s'améliore et 15 % de pannes en moins.",
  },
};
export const DEFAULT_LEVEL = "standard";

// € per day, per room, before the level's multiplier.
export const ROOM_DAILY_COST = { standard: 5, deluxe: 12, suite: 25, seminar: 15, conference: 15 };
export const DEFAULT_ROOM_DAILY_COST = 8;
// € per day for each built expansion floor (lighting, air conditioning, common areas).
export const FLOOR_DAILY_COST = 40;
// Daily upkeep of an installed upgrade, as a share of what it cost to install.
export const EQUIPMENT_UPKEEP_RATE = 0.001;

export const DEFAULT_CONDITION = 80;
// Below this condition guests notice, and wear breakdowns start.
export const WEAR_THRESHOLD = 60;
export const MAX_WEAR_INCIDENTS = 3;
const MAX_WEAR_CHANCE = 0.5;

export const CATEGORY_LABELS = { rooms: "Chambres", equipment: "Équipements", floors: "Étages" };

function state(hotelState) {
  const source = safeObject(safeObject(hotelState).maintenance);
  const ledger = safeObject(source.ledger);
  return {
    level: LEVELS[source.level] ? source.level : DEFAULT_LEVEL,
    condition: safeNumber(source.condition, DEFAULT_CONDITION),
    ledger: {
      spent: safeNumber(ledger.spent, 0),
      byCategory: { rooms: 0, equipment: 0, floors: 0, ...safeObject(ledger.byCategory) },
      last: ledger.last || null,
    },
  };
}

export function maintenanceLevel(hotelState) {
  return state(hotelState).level;
}

export function hotelCondition(hotelState) {
  return Math.max(0, Math.min(100, state(hotelState).condition));
}

export function maintenanceSpent(hotelState) {
  return state(hotelState).ledger.spent;
}

export function maintenanceByCategory(hotelState) {
  return state(hotelState).ledger.byCategory;
}

// ---- the daily bill --------------------------------------------------------

// What running the hotel costs per day, before and after the level's
// multiplier: { rooms, equipment, floors, total, level, multiplier }.
// Whole euros; the total is the sum of the rounded parts, so the breakdown
// always adds up.
export function computeDailyMaintenance({ hotelState, rooms } = {}) {
  const level = maintenanceLevel(hotelState);
  // An ecological renovation (lib/expansion/majorProjectsEngine.js) and
  // durable equipment bought from suppliers (lib/suppliers/) both trim the bill.
  const eco = ecoUpkeepFactor(hotelState);
  const supplierFactor = supplierMaintenanceFactor(hotelState);
  const multiplier = LEVELS[level].costMultiplier * eco * supplierFactor;
  const installed = Object.keys(safeObject(safeObject(safeObject(hotelState).zoneUpgrades).installed));

  const roomsCost = Math.round(safeArray(rooms).reduce((sum, room) => sum + (ROOM_DAILY_COST[room?.type] ?? DEFAULT_ROOM_DAILY_COST), 0) * multiplier);
  const equipmentCost = Math.round(installed.reduce((sum, id) => sum + safeNumber(UPGRADES[id]?.cost, 0) * EQUIPMENT_UPKEEP_RATE, 0) * multiplier);
  const floorsCost = Math.round(builtFloors(hotelState).length * FLOOR_DAILY_COST * multiplier);

  return { rooms: roomsCost, equipment: equipmentCost, floors: floorsCost, total: roomsCost + equipmentCost + floorsCost, level, multiplier };
}

// ---- state changes ------------------------------------------------------------

// The player's own choice of maintenance level, as a (hotelBundle) =>
// hotelBundle action. An unknown level changes nothing.
export function setMaintenanceLevel(hotelBundle, level) {
  const bundle = safeObject(hotelBundle);
  if (!LEVELS[level]) return bundle;
  const hotelState = safeObject(bundle.hotelState);
  if (maintenanceLevel(hotelState) === level && hotelState.maintenance) return bundle;
  const current = state(hotelState);
  return { ...bundle, hotelState: { ...hotelState, maintenance: { level, condition: current.condition, ledger: current.ledger } } };
}

// Records one day: adds the day's bill (the breakdown calculateExpenses()
// returned) to the cumulative ledger and moves the condition by the
// level's daily drift. A no-op (same object back) for a hotel with no bill
// and nothing to change.
export function recordMaintenance(hotelState, breakdown, day) {
  const current = state(hotelState);
  const bill = safeObject(breakdown);
  const total = safeNumber(bill.total, 0);
  // Seasonal and climate pressure (lib/hotelEvents/) wears the building
  // faster on the day it applies; a Premium level absorbs half of it.
  const today = safeObject(safeObject(safeObject(hotelState).hotelEvents).today);
  const pressure = today.day === day ? safeNumber(today.wearPressure, 0) * (current.level === "premium" ? 0.5 : 1) : 0;
  const condition = Math.max(0, Math.min(100, current.condition + LEVELS[current.level].conditionDrift - pressure));
  if (total === 0 && condition === current.condition && !safeObject(hotelState).maintenance) return hotelState;

  return {
    ...safeObject(hotelState),
    maintenance: {
      level: current.level,
      condition,
      ledger: {
        spent: current.ledger.spent + total,
        byCategory: {
          rooms: current.ledger.byCategory.rooms + safeNumber(bill.rooms, 0),
          equipment: current.ledger.byCategory.equipment + safeNumber(bill.equipment, 0),
          floors: current.ledger.byCategory.floors + safeNumber(bill.floors, 0),
        },
        last: { day, rooms: safeNumber(bill.rooms, 0), equipment: safeNumber(bill.equipment, 0), floors: safeNumber(bill.floors, 0), total, level: current.level },
      },
    },
  };
}

// What the day's bill was, for the DailyReview; null if nothing was recorded that day.
export function maintenanceOn(hotelState, day) {
  const { ledger, condition, level } = state(hotelState);
  if (!ledger.last || ledger.last.day !== day) return null;
  return { ...ledger.last, condition: Math.round(condition), level };
}

// ---- effects of the level and the condition ---------------------------------

// Multiplier on the breakdowns that would happen anyway (Premium: fewer).
export function maintenanceIncidentMultiplier(hotelState) {
  return LEVELS[maintenanceLevel(hotelState)].incidentMultiplier;
}

// Guests notice a run-down hotel (up to -4 points at condition 20, -6 at 0)
// and appreciate a well-kept one (+1 from 90).
export function maintenanceSatisfactionAdjustment(hotelState) {
  if (!safeObject(hotelState).maintenance) return 0;
  const condition = hotelCondition(hotelState);
  if (condition < WEAR_THRESHOLD) return -(WEAR_THRESHOLD - condition) / 10;
  return condition >= 90 ? 1 : 0;
}

// The chance, per day, that neglect breaks something.
export function wearChance(hotelState) {
  // A heat or cold wave adds to it, even for a hotel in good shape (see
  // lib/hotelEvents/: the bonus depends on the upkeep level).
  const climateBonus = safeNumber(safeObject(safeObject(safeObject(hotelState).hotelEvents).today).wearChanceBonus, 0);
  const neglect = Math.max(0, (WEAR_THRESHOLD - hotelCondition(hotelState)) / 100);
  return Math.min(MAX_WEAR_CHANCE, neglect + Math.max(0, climateBonus));
}

// A diagnostic-shaped wear breakdown for `day`, or null. Decided by a hash
// of the day: deterministic. `openWear` is how many wear breakdowns are
// still unresolved -- there is a cap so neglect can't bury the player at once.
export function wearBreakdown(hotelState, day, openWear = 0) {
  if (openWear >= MAX_WEAR_INCIDENTS) return null;
  const chance = wearChance(hotelState);
  if (chance <= 0 || pseudoRandom(`wear:${day}`) >= chance) return null;
  const condition = hotelCondition(hotelState);
  const severity = condition < 20 ? "high" : condition < 40 ? "medium" : "low";
  return { type: "error", severity, message: `Usure du matériel (jour ${day}) : un équipement lâche faute d'entretien` };
}
