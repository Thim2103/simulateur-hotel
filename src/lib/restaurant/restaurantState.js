// Shape and lifecycle helpers for a single restaurant's state -- the
// in-memory contract every other file in this folder (and
// restaurantRepository.js) reads and writes. Nothing here talks to
// Supabase directly; see restaurantRepository.js for persistence.
import { safeArray, safeNumber, safeObject, safeString } from "../safe";

export const DEFAULT_RESTAURANT_STRUCTURE = {
  name: "",
  concept: "",
  location: "",
  capacity: 0,
  seats: 0,
  materials: [],
  equipment: [],
};

// A brand-new restaurant, before the player has filled in the "Structure de
// l'établissement" form -- deliberately empty rather than pre-populated
// with demo data, so validateRestaurantStructure() has something to reject
// and the player's first real decision is meaningful.
export function createInitialRestaurantState(overrides = {}) {
  const source = safeObject(overrides);
  return {
    structure: { ...DEFAULT_RESTAURANT_STRUCTURE, ...safeObject(source.structure) },
    finance: { months: {}, revenue: [], costs: [], payroll: 0, fixedCosts: 0, rent: 0, taxes: 0, ...safeObject(source.finance) },
    staff: safeArray(source.staff, []),
    menu: safeArray(source.menu, []),
    operations: safeArray(source.operations, []),
    marketing: safeObject(source.marketing),
    esg: safeObject(source.esg),
    expansion: safeObject(source.expansion),
    pmsContext: { hotelOccupancy: 0, activeGuests: 0, housekeepingIssues: 0, scheduledEvents: 0, ...safeObject(source.pmsContext) },
    progression: { xp: 0, cycles: 0, ready: false, ...safeObject(source.progression) },
  };
}

// True when nothing meaningful has been entered yet -- the state
// getRestaurantState() returns for a brand-new user, before they've been
// through the Structure form.
export function isRestaurantEmpty(state) {
  const structure = safeObject(state?.structure);
  return !safeString(structure.name).trim() && !safeString(structure.concept).trim() && safeNumber(structure.capacity, 0) <= 0;
}

export function isRestaurantReady(state) {
  return Boolean(safeObject(state?.progression).ready);
}

// Marks the establishment as validated -- called once, when the player
// submits the Structure form (see pages/RestaurantStructure.jsx). Additive:
// never clears an already-ready flag.
export function markRestaurantReady(state) {
  return { ...state, progression: { ...safeObject(state?.progression), ready: true } };
}

// Validates the fields the Structure form collects. Returns every error at
// once (not just the first) so the UI can annotate each field individually.
export function validateRestaurantStructure(structure) {
  const s = safeObject(structure);
  const errors = [];

  if (!safeString(s.name).trim()) errors.push({ field: "name", message: "Le nom de l'établissement est obligatoire." });
  if (!safeString(s.concept).trim()) errors.push({ field: "concept", message: "Le concept est obligatoire." });
  if (!safeString(s.location).trim()) errors.push({ field: "location", message: "La localisation est obligatoire." });
  if (safeNumber(s.capacity, 0) <= 0) errors.push({ field: "capacity", message: "La capacité doit être supérieure à 0." });

  return { valid: errors.length === 0, errors };
}
