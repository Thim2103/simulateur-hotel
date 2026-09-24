// Zone upgrades: the player invests the hotel's capital in improving its
// zones (rooms, lobby, restaurant, laundry, rooftop pool). Each zone has
// three upgrades; the zone's LEVEL (shown as stars in the schematic view)
// is how many of them are installed. An upgrade costs capital, takes a
// few days of works (during which the zone is partly unavailable, which
// has a small cost of its own), then permanently improves the hotel:
//
//   standing        -- what the hotel's quality justifies charging: it
//                      raises the "fair" price level in the demand model
//                      (lib/demand/demandEngine.js priceFactor), so prices
//                      can go up without losing bookings
//   reputation      -- a lift to the reputation the hotel converges to
//                      (lib/progression/reputation.js)
//   satisfaction    -- points added to guest satisfaction
//                      (lib/clients/clientsSatisfaction.js)
//   incidents       -- a share of breakdowns simply never happens
//                      (lib/maintenance/incidentEngine.js)
//   energy          -- a daily saving on running costs
//                      (lib/dailyCycle/calculateExpenses.js)
//   cleaning time   -- faster housekeeping (lib/housekeeping/)
//   check-in        -- more guests per receptionist (lib/staff/staffRoster.js)
//
// State lives at `hotelState.zoneUpgrades` = { installed: {id: {day}},
// works: {id: {startedOnDay, completesOnDay}}, completedLog: [...] }, funded
// from `hotelState.expansion.availableCapital` (the hotel's real, existing
// "capital disponible" field -- nothing else spends it). Everything is pure
// and deterministic (no rng), and inert for a hotel that never upgraded:
// every effect below is its neutral value (x1 / +0), so saved careers and
// existing fixtures are untouched.
import { safeArray, safeNumber, safeObject } from "../safe.js";
import { canAfford, payInvestment } from "../finance/investmentFunding";

export const MAX_STANDING = 0.25;
export const MAX_LEVEL = 3;

// `cells`: which schematic cells (EntityFactory entity types) belong to the
// zone. `works`: what a zone under construction costs the hotel meanwhile.
export const ZONES = {
  rooms: { label: "Chambres", icon: "🛏️", cells: ["room"], works: { satisfactionPenalty: 4 } },
  lobby: { label: "Réception / Lobby", icon: "🔑", cells: ["reception", "hall"], works: { receptionCapacityMultiplier: 0.7 } },
  restaurant: { label: "Restaurant", icon: "🍽️", cells: ["restaurant", "kitchen", "bar"], works: { satisfactionPenalty: 2 } },
  laundry: { label: "Buanderie / Service", icon: "🧺", cells: ["laundry"], works: { cleaningTimeMultiplier: 1.25 } },
  pool: { label: "Rooftop / Piscine", icon: "🏊", cells: ["pool"], works: {} },
};

export const UPGRADES = {
  "rooms-bedding": { zone: "rooms", name: "Literie de luxe", description: "Matelas et linge haut de gamme dans toutes les chambres.", cost: 8000, days: 2, effects: { standing: 0.04, satisfactionBonus: 3 } },
  "rooms-soundproofing": { zone: "rooms", name: "Insonorisation", description: "Moins de bruit, moins de plaintes et de pannes liées aux nuisances.", cost: 12000, days: 3, effects: { incidentRateMultiplier: 0.9, satisfactionBonus: 2 } },
  "rooms-domotics": { zone: "rooms", name: "Domotique", description: "Gestion intelligente du chauffage et de l'éclairage.", cost: 18000, days: 3, effects: { energySavingsDaily: 25, incidentRateMultiplier: 0.95 } },

  "lobby-kiosk": { zone: "lobby", name: "Borne d'enregistrement rapide", description: "Check-in en libre-service : chaque réceptionniste accueille bien plus de clients.", cost: 6000, days: 1, effects: { receptionCapacityMultiplier: 1.4 } },
  "lobby-decor": { zone: "lobby", name: "Décoration haut de gamme", description: "Un hall qui impressionne dès l'arrivée.", cost: 15000, days: 2, effects: { standing: 0.05, reputationBonus: 3 } },
  "lobby-lounge": { zone: "lobby", name: "Espace lounge", description: "Un coin d'attente confortable pour les clients.", cost: 10000, days: 2, effects: { standing: 0.02, satisfactionBonus: 3 } },

  "restaurant-kitchen": { zone: "restaurant", name: "Cuisine équipée", description: "Matériel professionnel : service plus fiable, moins de pannes.", cost: 14000, days: 3, effects: { satisfactionBonus: 2, incidentRateMultiplier: 0.95 } },
  "restaurant-signature": { zone: "restaurant", name: "Carte signature & décor", description: "Une identité culinaire qui valorise l'établissement.", cost: 10000, days: 2, effects: { standing: 0.03, reputationBonus: 2 } },
  "restaurant-terrace": { zone: "restaurant", name: "Terrasse", description: "Des tables en plein air pour les beaux jours.", cost: 12000, days: 3, effects: { standing: 0.03, satisfactionBonus: 2 } },

  "laundry-industrial": { zone: "laundry", name: "Équipement industriel", description: "Machines professionnelles : nettoyage plus rapide et pannes bien moins fréquentes.", cost: 16000, days: 3, effects: { cleaningTimeMultiplier: 0.8, incidentRateMultiplier: 0.5 } },
  "laundry-preventive": { zone: "laundry", name: "Maintenance préventive programmée", description: "Des contrôles réguliers évitent une partie des pannes.", cost: 7000, days: 1, effects: { incidentRateMultiplier: 0.8 } },
  "laundry-heat": { zone: "laundry", name: "Récupération de chaleur", description: "Réutilise la chaleur des séchoirs : moins d'énergie consommée.", cost: 9000, days: 2, effects: { energySavingsDaily: 20 } },

  "pool-build": { zone: "pool", name: "Construction de la piscine rooftop", description: "Crée la zone Rooftop : un atout majeur pour le standing.", cost: 60000, days: 3, effects: { standing: 0.08, reputationBonus: 4, satisfactionBonus: 2 } },
  "pool-lounge": { zone: "pool", name: "Espace détente & bar", description: "Transats, cocktails et vue sur la ville.", cost: 20000, days: 2, requires: ["pool-build"], effects: { standing: 0.04, satisfactionBonus: 2 } },
  "pool-water": { zone: "pool", name: "Traitement de l'eau automatisé", description: "Moins d'entretien manuel, moins de pannes, moins d'énergie.", cost: 10000, days: 1, requires: ["pool-build"], effects: { incidentRateMultiplier: 0.9, energySavingsDaily: 10 } },
};

export function upgradesForZone(zoneId) {
  return Object.entries(UPGRADES)
    .filter(([, upgrade]) => upgrade.zone === zoneId)
    .map(([id, upgrade]) => ({ id, ...upgrade }));
}

export function zoneForCell(cellType) {
  return Object.keys(ZONES).find((zoneId) => ZONES[zoneId].cells.includes(cellType)) || null;
}

// ---- state accessors -------------------------------------------------------

function state(hotelState) {
  const zoneUpgrades = safeObject(safeObject(hotelState).zoneUpgrades);
  return { installed: safeObject(zoneUpgrades.installed), works: safeObject(zoneUpgrades.works), completedLog: safeArray(zoneUpgrades.completedLog) };
}

export function isInstalled(hotelState, upgradeId) {
  return Object.prototype.hasOwnProperty.call(state(hotelState).installed, upgradeId);
}

// The day an installed upgrade was finished, or null (not installed) --
// lib/accounting/accountingEngine.js reads this to age the asset for
// depreciation.
export function installedOn(hotelState, upgradeId) {
  return state(hotelState).installed[upgradeId]?.day ?? null;
}

export function worksFor(hotelState, upgradeId) {
  return state(hotelState).works[upgradeId] || null;
}

// The zone's works currently in progress, if any (one at a time per zone).
export function activeWorks(hotelState, zoneId) {
  const { works } = state(hotelState);
  const id = Object.keys(works).find((upgradeId) => UPGRADES[upgradeId]?.zone === zoneId);
  return id ? { upgradeId: id, ...works[id] } : null;
}

export function zoneLevel(hotelState, zoneId) {
  return upgradesForZone(zoneId).filter((upgrade) => isInstalled(hotelState, upgrade.id)).length;
}

export function availableCapital(hotelState) {
  return safeNumber(safeObject(safeObject(hotelState).expansion).availableCapital, 0);
}

// What a zone looks like right now, for the schematic view and the modal.
export function zoneSummary(hotelState, zoneId) {
  const works = activeWorks(hotelState, zoneId);
  return {
    zoneId,
    label: ZONES[zoneId].label,
    icon: ZONES[zoneId].icon,
    level: zoneLevel(hotelState, zoneId),
    maxLevel: MAX_LEVEL,
    works,
    // The rooftop only exists once the pool is built (or being built).
    exists: zoneId !== "pool" || isInstalled(hotelState, "pool-build") || !!works,
  };
}

// Why an upgrade can or can't be started right now: "available",
// "installed", "in-progress", "zone-busy" (another upgrade of the zone is
// being built), "locked" (a prerequisite is missing) or "no-funds".
export function upgradeStatus(hotelState, upgradeId) {
  const upgrade = UPGRADES[upgradeId];
  if (!upgrade) return "unknown";
  if (isInstalled(hotelState, upgradeId)) return "installed";
  if (worksFor(hotelState, upgradeId)) return "in-progress";
  if (activeWorks(hotelState, upgrade.zone)) return "zone-busy";
  if (safeArray(upgrade.requires).some((required) => !isInstalled(hotelState, required))) return "locked";
  if (!canAfford(hotelState, upgrade.cost)) return "no-funds";
  return "available";
}

// ---- effects -----------------------------------------------------------

export const NEUTRAL_EFFECTS = {
  standing: 0,
  reputationBonus: 0,
  satisfactionBonus: 0,
  satisfactionPenalty: 0,
  incidentRateMultiplier: 1,
  energySavingsDaily: 0,
  cleaningTimeMultiplier: 1,
  receptionCapacityMultiplier: 1,
};

// Everything the installed upgrades (and works in progress) do to the
// hotel, combined. Additive effects add up (standing is capped);
// multipliers multiply.
export function computeZoneEffects(hotelState) {
  const { installed, works } = state(hotelState);
  const effects = { ...NEUTRAL_EFFECTS };

  Object.keys(installed).forEach((upgradeId) => {
    const upgradeEffects = UPGRADES[upgradeId]?.effects;
    if (!upgradeEffects) return;
    effects.standing += upgradeEffects.standing || 0;
    effects.reputationBonus += upgradeEffects.reputationBonus || 0;
    effects.satisfactionBonus += upgradeEffects.satisfactionBonus || 0;
    effects.energySavingsDaily += upgradeEffects.energySavingsDaily || 0;
    effects.incidentRateMultiplier *= upgradeEffects.incidentRateMultiplier ?? 1;
    effects.cleaningTimeMultiplier *= upgradeEffects.cleaningTimeMultiplier ?? 1;
    effects.receptionCapacityMultiplier *= upgradeEffects.receptionCapacityMultiplier ?? 1;
  });

  // A zone under construction is partly out of service.
  Object.keys(works).forEach((upgradeId) => {
    const zoneWorks = ZONES[UPGRADES[upgradeId]?.zone]?.works || {};
    effects.satisfactionPenalty += zoneWorks.satisfactionPenalty || 0;
    effects.cleaningTimeMultiplier *= zoneWorks.cleaningTimeMultiplier ?? 1;
    effects.receptionCapacityMultiplier *= zoneWorks.receptionCapacityMultiplier ?? 1;
  });

  effects.standing = Math.min(MAX_STANDING, effects.standing);
  return effects;
}

// Net guest-satisfaction points (0-100 scale): installed upgrades minus the
// nuisance of works in progress.
export function zoneSatisfactionAdjustment(hotelState) {
  const effects = computeZoneEffects(hotelState);
  return effects.satisfactionBonus - effects.satisfactionPenalty;
}

// ---- actions and daily progress ------------------------------------------

// Starts the works: pays now (capital first, then treasury, see
// finance/investmentFunding.js), and the upgrade is installed
// after `days` days (see advanceZoneUpgrades()). A no-op (returns the bundle
// unchanged) unless the upgrade is "available".
export function startUpgrade(hotelBundle, upgradeId, { day = 0 } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  if (upgradeStatus(hotelState, upgradeId) !== "available") return bundle;
  const upgrade = UPGRADES[upgradeId];
  const current = state(hotelState);
  const { hotelState: paidState } = payInvestment(hotelState, upgrade.cost);

  return {
    ...bundle,
    hotelState: {
      ...paidState,
      zoneUpgrades: {
        installed: current.installed,
        works: { ...current.works, [upgradeId]: { startedOnDay: day, completesOnDay: day + upgrade.days } },
        completedLog: current.completedLog,
      },
    },
  };
}

// Finishes every works whose day has come. Called once per played day by
// careerEngine.runCareerDay(). No-op for a hotel with no works.
export function advanceZoneUpgrades(hotelState, day) {
  const current = state(hotelState);
  const due = Object.keys(current.works).filter((upgradeId) => day >= current.works[upgradeId].completesOnDay);
  if (due.length === 0) return hotelState;

  const installed = { ...current.installed };
  const works = { ...current.works };
  const completedLog = [...current.completedLog];
  due.forEach((upgradeId) => {
    installed[upgradeId] = { day };
    delete works[upgradeId];
    completedLog.push({ id: `upgrade-done:${upgradeId}:${day}`, upgradeId, day });
  });
  return { ...safeObject(hotelState), zoneUpgrades: { installed, works, completedLog: completedLog.slice(-30) } };
}

export function upgradesCompletedOn(hotelState, day) {
  return state(hotelState).completedLog.filter((entry) => entry.day === day);
}

const ZoneUpgradesEngine = { ZONES, UPGRADES, startUpgrade, advanceZoneUpgrades, computeZoneEffects, upgradeStatus, zoneSummary, zoneLevel };
export default ZoneUpgradesEngine;

// ---- display helpers -----------------------------------------------------

export function levelStars(level, maxLevel = MAX_LEVEL) {
  return "⭐".repeat(level) + "☆".repeat(Math.max(0, maxLevel - level));
}

const percent = (fraction) => `${Math.round(fraction * 100)} %`;

// One player-facing line per benefit an upgrade brings.
export function describeEffects(effects) {
  const lines = [];
  const e = safeObject(effects);
  if (e.standing) lines.push(`Standing +${percent(e.standing)} : vos prix peuvent monter sans perdre de réservations`);
  if (e.reputationBonus) lines.push(`Réputation +${e.reputationBonus}`);
  if (e.satisfactionBonus) lines.push(`Satisfaction des clients +${e.satisfactionBonus}`);
  if (e.incidentRateMultiplier !== undefined && e.incidentRateMultiplier < 1) lines.push(`${percent(1 - e.incidentRateMultiplier)} de pannes en moins`);
  if (e.energySavingsDaily) lines.push(`Énergie : −${e.energySavingsDaily} €/jour`);
  if (e.cleaningTimeMultiplier !== undefined && e.cleaningTimeMultiplier < 1) lines.push(`Nettoyage ${percent(1 - e.cleaningTimeMultiplier)} plus rapide`);
  if (e.receptionCapacityMultiplier !== undefined && e.receptionCapacityMultiplier > 1) lines.push(`+${percent(e.receptionCapacityMultiplier - 1)} de clients accueillis par réceptionniste`);
  return lines;
}
