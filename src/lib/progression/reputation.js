// Overall player/establishment reputation (0-100): slowly drifts toward a
// target set by sustainability and staff morale, nudged day-to-day by
// today's events (see lib/events/, whose impact.reputation this reads).
import { incidentReputationPenalty } from "../maintenance/incidentImpact";
import { computeZoneEffects } from "../zones/zoneUpgradesEngine";
import { auditReputationBonus } from "../hotelEvents/hotelEventsEngine";
import { pendingReputationDelta } from "../clients/guestReviewEngine";

const DRIFT_RATE = 0.15; // how much of the gap to the target closes each day

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function averageSatisfaction(staff) {
  const safeStaff = safeArray(staff);
  if (!safeStaff.length) return 70;
  return safeStaff.reduce((sum, person) => sum + Number(person.satisfaction || 0), 0) / safeStaff.length;
}

function eventReputationImpact(events) {
  return safeArray(events).reduce((sum, event) => sum + Number(event?.impact?.reputation || 0), 0);
}

// previousReputation: yesterday's value (see progressionEngine.js, which
// persists it in hotelState.progression.player.reputation); defaults to the
// target itself the first time this runs, so day 1 doesn't start from an
// arbitrary baseline.
export function calculateReputation({ hotelState = {}, restaurantState = {}, events = [], previousReputation } = {}) {
  const sustainabilityScore = Number(hotelState.esg?.sustainabilityScore) || 50;
  const staffMorale = averageSatisfaction(restaurantState.staff);
  // Installed zone upgrades (lib/zones/) lift the reputation the hotel
  // converges to; 0 for a hotel that never upgraded.
  const target = clamp(sustainabilityScore * 0.4 + staffMorale * 0.6 + computeZoneEffects(hotelState).reputationBonus, 0, 100);

  const base = Number.isFinite(previousReputation) ? previousReputation : target;
  const drifted = base + (target - base) * DRIFT_RATE;
  const eventImpact = eventReputationImpact(events);
  // Unrepaired equipment incidents (hotelState.activeIncidents, see
  // lib/maintenance/) dent the reputation once they've dragged on past
  // their grace period -- 0 when there are none, so existing behaviour is
  // unchanged.
  const incidentPenalty = incidentReputationPenalty(hotelState);

  // A quality label (or a warning) from a hotel audit (lib/hotelEvents/)
  // lifts (or dents) the reputation while it is in force; guest reviews
  // posted the day before (x3 for a V.I.P., softened or worsened by the
  // player's answer -- lib/clients/guestReviewEngine.js) land here once.
  return Math.round(clamp(drifted + eventImpact - incidentPenalty + auditReputationBonus(hotelState) + pendingReputationDelta(hotelState), 0, 100));
}
