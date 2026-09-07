// A lightweight skill-point system layered on top of the career: points
// come from missions/story choices, accumulate into levels, and each
// level grants a small, descriptive gameplay bonus applied by
// careerEngine.js when building the day's summary (see
// applySkillEffectsToSummary()) -- deliberately not fed back into
// runDailyCycle()'s own math, to avoid coupling Career to the core
// engine's internals.
import { safeNumber, safeObject } from "../safe";

export const SKILL_CATALOG = {
  leadership: { label: "Leadership", effectPerLevel: "Réduit les tensions RH (+1% de moral d'équipe par niveau)." },
  negotiation: { label: "Négociation", effectPerLevel: "Améliore les revenus négociés (+1% de profit par niveau)." },
  management: { label: "Gestion", effectPerLevel: "Réduit les coûts fixes (-1% de dépenses par niveau)." },
};

const POINTS_PER_LEVEL = 10;

export function createInitialSkills() {
  return Object.fromEntries(Object.keys(SKILL_CATALOG).map((skillId) => [skillId, { points: 0, level: 0 }]));
}

function levelFor(points) {
  return Math.floor(safeNumber(points, 0) / POINTS_PER_LEVEL);
}

// delta may be negative (a story choice can cost skill points, though the
// catalog above never does) -- points never drop below 0.
export function updateSkill(skills, skillId, delta) {
  const current = safeObject(skills)[skillId] || { points: 0, level: 0 };
  const points = Math.max(0, safeNumber(current.points, 0) + safeNumber(delta, 0));
  return { ...safeObject(skills), [skillId]: { points, level: levelFor(points) } };
}

// A profit/expense multiplier career can apply to the day's *summary*
// figures (not the persisted finance) -- e.g. { profitMultiplier: 1.02,
// expenseMultiplier: 0.98 } for one point each in negotiation/management.
export function computeSkillBonuses(skills) {
  const negotiationLevel = safeObject(skills).negotiation?.level || 0;
  const managementLevel = safeObject(skills).management?.level || 0;
  return {
    profitMultiplier: 1 + negotiationLevel * 0.01,
    expenseMultiplier: Math.max(0.5, 1 - managementLevel * 0.01),
  };
}

export function skillLabel(skillId) {
  return SKILL_CATALOG[skillId]?.label || skillId;
}
