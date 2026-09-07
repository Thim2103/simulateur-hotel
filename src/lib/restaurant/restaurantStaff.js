// Restaurant staff metrics for a single hotel's establishment. Multi-site
// staff management (transfers/training/promotions/morale across hotels) is
// lib/staffMulti/ -- this file only reads a single restaurant.staff array,
// the same one staffMulti moves people in and out of.
import { safeArray, safeNumber } from "../safe";

export function computeStaffProductivity(staff, { complaints = 0 } = {}) {
  const people = safeArray(staff, []);
  const base = 68 + people.reduce((sum, person) => sum + safeNumber(person.salary, 0), 0) / 2200 - complaints * 6;
  return Math.round(Math.min(98, Math.max(45, base)));
}

// null (not 0) when nobody has a recorded satisfaction yet, matching
// staffMulti/staffMorale.js's convention for a staff-less/unscored group.
export function computeStaffSatisfactionAvg(staff) {
  const scored = safeArray(staff, []).filter((person) => person.satisfaction !== undefined && person.satisfaction !== null);
  if (!scored.length) return null;
  return Math.round(scored.reduce((sum, person) => sum + safeNumber(person.satisfaction, 0), 0) / scored.length);
}

export function headcount(staff) {
  return safeArray(staff, []).length;
}
