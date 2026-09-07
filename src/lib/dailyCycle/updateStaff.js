// Daily staff simulation: fatigue (modeled as a drag on `productivity`),
// morale (`satisfaction`), and turnover (a staff member resigns once morale
// stays too low). Maps onto the existing restaurant_staff.productivity /
// .satisfaction columns (see restaurantRepository.js's toStaffRow()) rather
// than introducing new ones.
const FATIGUE_PER_DAY = 3; // productivity points lost per day worked
const RECOVERY_ON_REST_DAY = 6; // productivity regained if demand is low that day
const MORALE_EVENT_MULTIPLIER = 20; // scales applyEvents()'s -1..1-ish satisfaction impact into morale points
const RESIGNATION_MORALE_THRESHOLD = 20;
const RESIGNATION_PROBABILITY = 0.35; // chance per day a below-threshold staff member actually resigns

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// staff: the restaurant's staff array (see restaurant.js's restaurantStaff).
// demand: today's demand indicator (0-100); high demand tires staff out
// faster, low demand lets them recover.
// eventSatisfactionImpact: applyEvents()'s combined `satisfaction` delta.
export function updateStaff({ staff = [], demand = 60, eventSatisfactionImpact = 0, rng = Math.random } = {}) {
  const moraleDelta = eventSatisfactionImpact * MORALE_EVENT_MULTIPLIER;
  const fatigueDelta = demand >= 50 ? -FATIGUE_PER_DAY : RECOVERY_ON_REST_DAY;

  const moraleChanges = [];
  const departures = [];

  const updatedStaff = safeArray(staff)
    .map((person) => {
      const previousProductivity = Number(person.productivity) || 65;
      const previousSatisfaction = Number(person.satisfaction) || 70;

      const productivity = Math.round(clamp(previousProductivity + fatigueDelta, 20, 100));
      const satisfaction = Math.round(clamp(previousSatisfaction + moraleDelta, 0, 100));

      if (satisfaction !== previousSatisfaction) {
        moraleChanges.push({ id: person.id, name: person.name, from: previousSatisfaction, to: satisfaction });
      }

      const resigns = satisfaction <= RESIGNATION_MORALE_THRESHOLD && rng() < RESIGNATION_PROBABILITY;
      if (resigns) departures.push({ id: person.id, name: person.name, reason: "morale trop basse" });

      return resigns ? null : { ...person, productivity, satisfaction };
    })
    .filter(Boolean);

  return {
    staff: updatedStaff,
    changes: {
      fatigueApplied: fatigueDelta,
      moraleChanges,
      departures,
      newHires: [],
      headcount: updatedStaff.length,
    },
  };
}
