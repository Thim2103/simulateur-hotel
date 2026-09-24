/**
 * @module customerGenerator
 * @description Génère des clients (VIP, Business, Famille, Budget, Touriste) selon la réputation de l'hôtel et la saison.
 * La réputation influence à la fois le budget des clients et la composition de la clientèle.
 */

/**
 * Profils de clients disponibles. Les clés correspondent aux SPENDING_PROFILES
 * de l'EconomyEngine ('tourist' y utilise le profil de dépense par défaut).
 * baseBudget : budget par nuit avant modulation par la réputation (x0.8 à x1.2) et la variance (±10 %).
 */
export const PROFILES = Object.freeze({
  VIP: Object.freeze({ key: 'vip', label: 'VIP', baseBudget: 300, minNights: 1, maxNights: 4, patience: 20 }),
  BUSINESS: Object.freeze({ key: 'business', label: 'Business', baseBudget: 160, minNights: 1, maxNights: 3, patience: 40 }),
  FAMILY: Object.freeze({ key: 'family', label: 'Famille', baseBudget: 140, minNights: 3, maxNights: 7, patience: 60 }),
  TOURIST: Object.freeze({ key: 'tourist', label: 'Touriste', baseBudget: 110, minNights: 2, maxNights: 7, patience: 70 }),
  BUDGET: Object.freeze({ key: 'budget', label: 'Budget', baseBudget: 95, minNights: 1, maxNights: 4, patience: 90 }),
});

/**
 * Probabilités d'apparition de chaque profil selon la saison (somme = 1).
 * Le budget moyen pondéré reste proche de l'ancien mix Business/Touriste
 * (~136 en saison normale) : l'économie existante n'est pas déséquilibrée.
 * Les saisons inconnues retombent sur 'normal'.
 */
export const PROFILE_WEIGHTS_BY_SEASON = Object.freeze({
  low: Object.freeze({ vip: 0.05, business: 0.45, family: 0.1, tourist: 0.15, budget: 0.25 }),
  normal: Object.freeze({ vip: 0.05, business: 0.3, family: 0.15, tourist: 0.3, budget: 0.2 }),
  high: Object.freeze({ vip: 0.07, business: 0.13, family: 0.25, tourist: 0.4, budget: 0.15 }),
});

// Ordre fixe de tirage des profils (cumul des probabilités)
const PROFILE_ORDER = [PROFILES.VIP, PROFILES.BUSINESS, PROFILES.FAMILY, PROFILES.TOURIST, PROFILES.BUDGET];

let nextId = 1;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Sensibilité de chaque profil à la réputation de l'hôtel. À réputation r, le poids
 * saisonnier est multiplié par 1 + sensibilité x (r - 50) / 50, puis renormalisé :
 * une bonne réputation attire VIP et Business, une mauvaise surtout la clientèle Budget.
 * Les multiplicateurs restent >= 0.2 : aucun profil ne disparaît totalement.
 */
export const REPUTATION_SENSITIVITY = Object.freeze({
  vip: 0.8,
  business: 0.4,
  family: 0,
  tourist: 0,
  budget: -0.5,
});

/**
 * Probabilités d'apparition des profils selon la saison et la réputation (somme = 1).
 * À réputation 50, elles sont identiques à PROFILE_WEIGHTS_BY_SEASON.
 * @param {string} [season='normal']
 * @param {number} [reputation=50] - Réputation de l'hôtel (0 à 100).
 * @returns {Object<string, number>} Probabilité par clé de profil.
 */
export function getProfileWeights(season = 'normal', reputation = 50) {
  const base = PROFILE_WEIGHTS_BY_SEASON[season] || PROFILE_WEIGHTS_BY_SEASON.normal;
  const tilt = (clamp(Number.isFinite(reputation) ? reputation : 50, 0, 100) - 50) / 50;

  const raw = {};
  let total = 0;
  PROFILE_ORDER.forEach(({ key }) => {
    raw[key] = base[key] * (1 + REPUTATION_SENSITIVITY[key] * tilt);
    total += raw[key];
  });
  Object.keys(raw).forEach((key) => { raw[key] /= total; });
  return raw;
}

/**
 * Tire un profil selon les probabilités de la saison, ajustées par la réputation.
 * @param {string} season - Saison valide de PROFILE_WEIGHTS_BY_SEASON.
 * @param {number} roll - Tirage dans [0, 1[.
 * @param {number} [reputation=50] - Réputation de l'hôtel (0 à 100).
 * @returns {Object} Le profil tiré.
 */
export function pickProfile(season, roll, reputation = 50) {
  const weights = getProfileWeights(season, reputation);
  let cumulative = 0;
  for (const profile of PROFILE_ORDER) {
    cumulative += weights[profile.key];
    if (roll < cumulative) return profile;
  }
  // Filet de sécurité face aux arrondis flottants
  return PROFILE_ORDER[PROFILE_ORDER.length - 1];
}

/**
 * Génère un client.
 * @param {Object} [options={}]
 * @param {number} [options.reputation=50] - Réputation de l'hôtel (0 à 100).
 * @param {string} [options.season='normal'] - 'low' | 'normal' | 'high'.
 * @param {Function} [options.random=Math.random] - Source aléatoire (injectable pour les tests).
 * @returns {{id: string, profile: string, label: string, budget: number, nights: number, patience: number, satisfaction: number, season: string}}
 */
export function generateCustomer(options = {}) {
  const random = options.random || Math.random;
  const reputation = clamp(Number.isFinite(options.reputation) ? options.reputation : 50, 0, 100);
  const season = options.season in PROFILE_WEIGHTS_BY_SEASON ? options.season : 'normal';

  const profile = pickProfile(season, random(), reputation);

  // Une bonne réputation attire une clientèle prête à payer plus (x0.8 à x1.2), ±10 % de variance
  const reputationFactor = 0.8 + (reputation / 100) * 0.4;
  const variance = 0.9 + random() * 0.2;
  const budget = Math.round(profile.baseBudget * reputationFactor * variance);

  const nights = profile.minNights + Math.floor(random() * (profile.maxNights - profile.minNights + 1));

  return {
    id: `customer-${nextId++}`,
    profile: profile.key,
    label: profile.label,
    budget,
    nights,
    patience: profile.patience,
    satisfaction: 50,
    season,
  };
}

/**
 * Génère plusieurs clients.
 * @param {number} count
 * @param {Object} [options={}] - Mêmes options que generateCustomer.
 * @returns {Array<Object>}
 */
export function generateCustomers(count, options = {}) {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('count doit être un entier >= 0');
  }
  return Array.from({ length: count }, () => generateCustomer(options));
}

export default generateCustomer;
