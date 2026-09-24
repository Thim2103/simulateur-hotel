/**
 * @module customerGenerator
 * @description Génère des clients (Business, Touriste) selon la réputation de l'hôtel et la saison.
 */

/**
 * Profils de clients disponibles.
 */
export const PROFILES = Object.freeze({
  BUSINESS: Object.freeze({ key: 'business', label: 'Business', baseBudget: 160, minNights: 1, maxNights: 3, patience: 40 }),
  TOURIST: Object.freeze({ key: 'tourist', label: 'Touriste', baseBudget: 110, minNights: 2, maxNights: 7, patience: 70 }),
});

/**
 * Probabilité qu'un client soit un touriste selon la saison.
 * Les saisons inconnues retombent sur 'normal'.
 */
export const TOURIST_SHARE_BY_SEASON = Object.freeze({
  low: 0.3,
  normal: 0.5,
  high: 0.75,
});

let nextId = 1;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
  const season = options.season in TOURIST_SHARE_BY_SEASON ? options.season : 'normal';

  const profile = random() < TOURIST_SHARE_BY_SEASON[season] ? PROFILES.TOURIST : PROFILES.BUSINESS;

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
