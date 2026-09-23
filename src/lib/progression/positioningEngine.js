// Hotel POSITIONING (Étape 6): 5 combinable orientations the player
// invests in to shape a hand-built identity, instead of a single linear
// level track. Each axis has its own tiers (paliers), each with a real
// cost, a real reputation lift (see progression/reputation.js's own
// calculateReputation(), which now also reads computePositioningEffects()
// below -- the same "computeZoneEffects().reputationBonus" pattern
// lib/zones/zoneUpgradesEngine.js already established) and the guest
// segments (lib/data/segments/segments.js) it makes the hotel more
// attractive to.
//
// State lives at `hotelState.positioning.installed` = { tierId: { day } },
// funded from the hotel's real capital/treasury (see
// finance/investmentFunding.js's canAfford()/payInvestment() --  the exact
// same primitive zoneUpgradesEngine.js/hotelExpansionEngine.js already
// use). Unlike a zone upgrade, a positioning tier takes effect
// immediately (no multi-day works): it is a strategic choice, not a
// construction project. Pure and deterministic; inert (no axis active)
// for a hotel that never invested, so existing saves/fixtures read
// exactly as before.
import { safeArray, safeObject } from "../safe";
import { canAfford, payInvestment } from "../finance/investmentFunding";

export const AXES = {
  eco: {
    id: "eco",
    label: "Éco / Durabilité",
    icon: "🌱",
    tiers: [
      { id: "eco-breakfast", name: "Petit-déjeuner bio et local", description: "Des produits locaux et de saison au petit-déjeuner.", cost: 1500, reputationBonus: 2, attractsSegments: ["hikers-eco", "couples-leisure"] },
      { id: "eco-insulation", name: "Isolation & circuits courts", description: "Aménagements durables et fournisseurs locaux.", cost: 9000, reputationBonus: 4, attractsSegments: ["hikers-eco"] },
    ],
  },
  boutique: {
    id: "boutique",
    label: "Boutique / Charme",
    icon: "⭐",
    tiers: [
      { id: "boutique-decor", name: "Décoration raffinée", description: "Une décoration soignée qui donne du caractère à l'établissement.", cost: 6000, reputationBonus: 3, attractsSegments: ["couples-leisure"] },
      { id: "boutique-service", name: "Services personnalisés", description: "Un accueil sur-mesure pour chaque client.", cost: 10000, reputationBonus: 4, attractsSegments: ["couples-leisure", "business"] },
    ],
  },
  gastronomy: {
    id: "gastronomy",
    label: "Gastronomie / F&B",
    icon: "🍽️",
    tiers: [
      { id: "gastronomy-breakfast", name: "Petit-déjeuner amélioré", description: "Une offre petit-déjeuner plus généreuse et variée.", cost: 2500, reputationBonus: 2, attractsSegments: ["families", "couples-leisure"] },
      { id: "gastronomy-table-hote", name: "Table d'hôtes", description: "Un vrai restaurant maison, ouvert aux clients comme aux visiteurs.", cost: 12000, reputationBonus: 5, attractsSegments: ["couples-leisure", "business"] },
    ],
  },
  family: {
    id: "family",
    label: "Familial / Loisirs",
    icon: "👨‍👩‍👧",
    tiers: [
      { id: "family-equipment", name: "Équipements familiaux", description: "Lits d'appoint, jeux et confort pensés pour les familles.", cost: 4000, reputationBonus: 2, attractsSegments: ["families"] },
      { id: "family-activities", name: "Activités locales organisées", description: "Des activités clé en main pour occuper petits et grands.", cost: 7000, reputationBonus: 3, attractsSegments: ["families"] },
    ],
  },
  business: {
    id: "business",
    label: "Business / Séminaire",
    icon: "💼",
    tiers: [
      { id: "business-wifi", name: "Connexion haut débit", description: "Une connexion fiable, partout dans l'établissement.", cost: 2000, reputationBonus: 1, attractsSegments: ["business"] },
      { id: "business-workspace", name: "Espace de travail dédié", description: "Un coin bureau calme et équipé.", cost: 8000, reputationBonus: 3, attractsSegments: ["business"] },
    ],
  },
};

// Every tier, flattened, each carrying its own axisId -- the lookup table
// every other function here is built on.
const TIERS_BY_ID = Object.fromEntries(Object.values(AXES).flatMap((axis) => axis.tiers.map((tier) => [tier.id, { ...tier, axisId: axis.id }])));

export function tierById(tierId) {
  return TIERS_BY_ID[tierId] || null;
}

export function tiersForAxis(axisId) {
  return AXES[axisId]?.tiers.map((tier) => ({ ...tier, axisId })) || [];
}

// ---- state accessors -------------------------------------------------------

function state(hotelState) {
  return { installed: safeObject(safeObject(safeObject(hotelState).positioning).installed) };
}

export function isInstalled(hotelState, tierId) {
  return Object.prototype.hasOwnProperty.call(state(hotelState).installed, tierId);
}

export function installedOn(hotelState, tierId) {
  return state(hotelState).installed[tierId]?.day ?? null;
}

// Which axes have at least one installed tier -- what
// hotelIdentityEngine.js combines into the hotel's own title, in the
// order AXES itself lists them (stable, not insertion order).
export function installedAxes(hotelState) {
  const { installed } = state(hotelState);
  return Object.keys(AXES).filter((axisId) => tiersForAxis(axisId).some((tier) => installed[tier.id]));
}

// "installed", "no-funds" or "available" -- a tier is never "locked": all
// of an axis's tiers can be bought in any order (the axes are about
// direction, not a linear sequence).
export function tierStatus(hotelState, tierId) {
  const tier = tierById(tierId);
  if (!tier) return "unknown";
  if (isInstalled(hotelState, tierId)) return "installed";
  if (!canAfford(hotelState, tier.cost)) return "no-funds";
  return "available";
}

// ---- investing ---------------------------------------------------------------

// Invests in a tier: pays now (capital first, then treasury -- see
// finance/investmentFunding.js), takes effect immediately. A no-op
// (returns the bundle unchanged) unless the tier is "available".
export function invest(hotelBundle, tierId, { day = 0 } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  if (tierStatus(hotelState, tierId) !== "available") return bundle;
  const tier = tierById(tierId);
  const { installed } = state(hotelState);
  const { hotelState: paidState } = payInvestment(hotelState, tier.cost);

  return {
    ...bundle,
    hotelState: { ...paidState, positioning: { installed: { ...installed, [tierId]: { day } } } },
  };
}

// ---- effects -----------------------------------------------------------

// { reputationBonus, segmentAttraction: { segmentId: tierCount } } --
// everything the installed tiers do to the hotel, combined. 0/{} for a
// hotel that never invested (reputation.js reads this exactly like
// zoneUpgradesEngine.js's own computeZoneEffects()).
export function computePositioningEffects(hotelState) {
  const { installed } = state(hotelState);
  const segmentAttraction = {};
  let reputationBonus = 0;

  Object.keys(installed).forEach((tierId) => {
    const tier = tierById(tierId);
    if (!tier) return;
    reputationBonus += tier.reputationBonus || 0;
    safeArray(tier.attractsSegments).forEach((segmentId) => {
      segmentAttraction[segmentId] = (segmentAttraction[segmentId] || 0) + 1;
    });
  });

  return { reputationBonus, segmentAttraction };
}

const positioningEngine = { AXES, tierById, tiersForAxis, isInstalled, installedOn, installedAxes, tierStatus, invest, computePositioningEffects };
export default positioningEngine;
