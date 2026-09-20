// Automatic dynamic pricing: when the player switches Yield Management on,
// each new booking is priced by three configurable rules instead of at the
// flat price level:
//
//   occupancy    -- if the hotel is more than `threshold` % full on the night
//                   of arrival (default 80), the rooms still left cost
//                   `adjustment` more (default +15 %)
//   last minute  -- if it is under `threshold` % full (default 40) and the
//                   guest arrives within `daysAhead` days (default 2), the
//                   room is discounted by `adjustment` (default -20 %) to
//                   fill the hotel
//   events       -- during a festival or trade fair, and in high season, a
//                   premium of `adjustment` (default +10 %); see
//                   lib/hotelEvents/
//
// The rules add up and the result stays between x0.7 and x1.5 (the same
// floor and ceiling lib/rm/dynamicPricing.js recommends within). Raising
// prices is not free: the demand model's price factor (lib/demand/) sees
// them and trims demand accordingly, softened in high season.
//
// State lives at `hotelState.yieldManagement` = the rules' configuration
// (see DEFAULT_YIELD); a hotel that never switched it on has none, and
// every price stays exactly as before. Pure and deterministic.
import { safeArray, safeNumber, safeObject } from "../safe";
import { calendarEffects, dayIndexOf } from "../hotelEvents/hotelEventsEngine";
import { isMeetingRoom } from "../mice/miceEngine";

export const MIN_YIELD_MULTIPLIER = 0.7;
export const MAX_YIELD_MULTIPLIER = 1.5;

export const DEFAULT_YIELD = {
  enabled: false,
  occupancy: { enabled: true, threshold: 80, adjustment: 0.15 },
  lastMinute: { enabled: true, threshold: 40, daysAhead: 2, adjustment: -0.2 },
  events: { enabled: true, adjustment: 0.1 },
};

export const RULE_IDS = ["occupancy", "lastMinute", "events"];
export const RULE_LABELS = { occupancy: "Occupation élevée", lastMinute: "Dernière minute", events: "Événements & haute saison" };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// The player's configuration, completed with defaults and kept in range.
export function getYieldConfig(hotelState) {
  const source = safeObject(safeObject(hotelState).yieldManagement);
  const rule = (id) => ({ ...DEFAULT_YIELD[id], ...safeObject(source[id]) });
  const occupancy = rule("occupancy");
  const lastMinute = rule("lastMinute");
  const events = rule("events");
  return {
    enabled: source.enabled === true,
    occupancy: { enabled: occupancy.enabled !== false, threshold: clamp(safeNumber(occupancy.threshold, 80), 0, 100), adjustment: clamp(safeNumber(occupancy.adjustment, 0.15), 0, 0.5) },
    lastMinute: {
      enabled: lastMinute.enabled !== false,
      threshold: clamp(safeNumber(lastMinute.threshold, 40), 0, 100),
      daysAhead: Math.round(clamp(safeNumber(lastMinute.daysAhead, 2), 0, 7)),
      adjustment: clamp(safeNumber(lastMinute.adjustment, -0.2), -0.5, 0),
    },
    events: { enabled: events.enabled !== false, adjustment: clamp(safeNumber(events.adjustment, 0.1), 0, 0.5) },
  };
}

export function isYieldEnabled(hotelState) {
  return getYieldConfig(hotelState).enabled;
}

// ---- the player's settings, as (hotelBundle) => hotelBundle actions -----------

function withConfig(bundle, config) {
  const source = safeObject(bundle);
  return { ...source, hotelState: { ...safeObject(source.hotelState), yieldManagement: config } };
}

export function setYieldEnabled(hotelBundle, enabled) {
  const config = getYieldConfig(safeObject(hotelBundle).hotelState);
  if (config.enabled === !!enabled && safeObject(safeObject(hotelBundle).hotelState).yieldManagement) return hotelBundle;
  return withConfig(hotelBundle, { ...config, enabled: !!enabled });
}

// Changes one rule: `patch` may set `enabled`, `threshold`, `adjustment`
// (and `daysAhead` for the last-minute rule). Unknown rules change nothing;
// values are kept in range.
export function setYieldRule(hotelBundle, ruleId, patch) {
  if (!RULE_IDS.includes(ruleId)) return hotelBundle;
  const config = getYieldConfig(safeObject(hotelBundle).hotelState);
  return withConfig(hotelBundle, getYieldConfig({ yieldManagement: { ...config, [ruleId]: { ...config[ruleId], ...safeObject(patch) } } }));
}

// ---- pricing ---------------------------------------------------------------------

// How full the hotel is on a night, in % of its bookable rooms.
export function projectedOccupancy(rooms, reservations, date) {
  const bookable = safeArray(rooms).filter((room) => room.status !== "maintenance" && room.status !== "hors_service" && !isMeetingRoom(room)).length;
  if (bookable === 0) return 0;
  const night = dayIndexOf(date);
  const occupied = safeArray(reservations).filter((reservation) => {
    if (String(reservation.status || "").toLowerCase().includes("annul")) return false;
    return dayIndexOf(reservation.arrival) <= night && night < dayIndexOf(reservation.departure);
  }).length;
  return Math.min(100, (occupied / bookable) * 100);
}

// The pricing function for today's bookings -- (room, arrival, reservations)
// => { multiplier, rules } -- or null when Yield Management is off (prices
// then stay exactly as they were).
export function createYieldPricer({ hotelState, rooms, referenceDate } = {}) {
  const config = getYieldConfig(hotelState);
  if (!config.enabled) return null;
  const today = dayIndexOf(referenceDate ?? new Date());

  return (room, arrival, reservations) => {
    const occupancy = projectedOccupancy(rooms, reservations, arrival);
    const lead = dayIndexOf(arrival) - today;
    const calendar = calendarEffects(arrival, hotelState);
    const rules = [];
    let adjustment = 0;

    if (config.occupancy.enabled && occupancy > config.occupancy.threshold) {
      adjustment += config.occupancy.adjustment;
      rules.push("occupancy");
    }
    if (config.lastMinute.enabled && lead <= config.lastMinute.daysAhead && occupancy < config.lastMinute.threshold) {
      adjustment += config.lastMinute.adjustment;
      rules.push("lastMinute");
    }
    if (config.events.enabled && (calendar.season.tier === "high" || calendar.events.some((event) => event.kind === "demand"))) {
      adjustment += config.events.adjustment;
      rules.push("events");
    }
    return { multiplier: clamp(1 + adjustment, MIN_YIELD_MULTIPLIER, MAX_YIELD_MULTIPLIER), rules };
  };
}

// What a day's yield adjustments amounted to: { enabled, adjusted, raised,
// lowered, revenueDelta, byRule } from the list generateBookings() returns.
export function summarizeYield(adjustments, enabled = true) {
  const list = safeArray(adjustments);
  const byRule = {};
  list.forEach((entry) => entry.rules.forEach((rule) => (byRule[rule] = (byRule[rule] || 0) + 1)));
  return {
    enabled,
    adjusted: list.length,
    raised: list.filter((entry) => entry.delta > 0).length,
    lowered: list.filter((entry) => entry.delta < 0).length,
    revenueDelta: Math.round(list.reduce((sum, entry) => sum + entry.delta, 0)),
    byRule,
  };
}
