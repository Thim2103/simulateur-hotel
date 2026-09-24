import { describe, it, expect } from 'vitest';
import generateCustomerDefault, {
  PROFILES,
  PROFILE_WEIGHTS_BY_SEASON,
  REPUTATION_SENSITIVITY,
  generateCustomer,
  generateCustomers,
  getProfileWeights,
  pickProfile,
} from './customerGenerator.js';
import { EconomyEngine } from '../economy/economyEngine.js';

// Source aléatoire déterministe : renvoie les valeurs dans l'ordre, puis boucle.
// Ordre des appels dans generateCustomer : profil, variance du budget, nombre de nuits.
const sequence = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

// Tirages de profil en saison normale (cumul : vip 0.05, business 0.35, family 0.50, tourist 0.80, budget 1)
const NORMAL_ROLLS = { vip: 0.02, business: 0.2, family: 0.4, tourist: 0.6, budget: 0.9 };
const ALL_PROFILES = Object.values(PROFILES);
const ALL_KEYS = ALL_PROFILES.map((p) => p.key);

// Générateur pseudo-aléatoire reproductible (LCG) pour les tests statistiques
const seeded = (seed) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

describe('customerGenerator', () => {
  describe('generateCustomer', () => {
    it('devrait générer un client complet avec les options par défaut', () => {
      const customer = generateCustomer();

      expect(customer.id).toMatch(/^customer-\d+$/);
      expect(ALL_KEYS).toContain(customer.profile);
      expect(customer.season).toBe('normal');
      expect(customer.satisfaction).toBe(50);
      expect(Number.isInteger(customer.budget)).toBe(true);
      expect(Number.isInteger(customer.nights)).toBe(true);
    });

    it('devrait générer des identifiants uniques', () => {
      const a = generateCustomer();
      const b = generateCustomer();
      expect(a.id).not.toBe(b.id);
    });

    it.each([
      ['vip', 'VIP', PROFILES.VIP],
      ['business', 'Business', PROFILES.BUSINESS],
      ['family', 'Famille', PROFILES.FAMILY],
      ['tourist', 'Touriste', PROFILES.TOURIST],
      ['budget', 'Budget', PROFILES.BUDGET],
    ])('devrait générer un profil %s selon le tirage', (key, label, profile) => {
      const customer = generateCustomer({ random: sequence(NORMAL_ROLLS[key], 0.5, 0) });

      expect(customer.profile).toBe(key);
      expect(customer.label).toBe(label);
      expect(customer.patience).toBe(profile.patience);
      expect(customer.budget).toBe(profile.baseBudget); // réputation 50 et variance neutre
    });

    it('devrait appliquer les probabilités de la saison', () => {
      // 0.4 : business en basse saison, famille en saison normale et haute
      expect(generateCustomer({ season: 'low', random: sequence(0.4, 0.5, 0) }).profile).toBe('business');
      expect(generateCustomer({ season: 'normal', random: sequence(0.4, 0.5, 0) }).profile).toBe('family');
      expect(generateCustomer({ season: 'high', random: sequence(0.4, 0.5, 0) }).profile).toBe('family');
      // 0.6 : famille en basse saison, touriste en haute saison
      expect(generateCustomer({ season: 'low', random: sequence(0.55, 0.5, 0) }).profile).toBe('family');
      expect(generateCustomer({ season: 'high', random: sequence(0.6, 0.5, 0) }).profile).toBe('tourist');
      // 0.06 : VIP uniquement en haute saison (0.07)
      expect(generateCustomer({ season: 'high', random: sequence(0.06, 0.5, 0) }).profile).toBe('vip');
      expect(generateCustomer({ season: 'normal', random: sequence(0.06, 0.5, 0) }).profile).toBe('business');
    });

    it('devrait retomber sur la saison normale pour une saison inconnue', () => {
      const customer = generateCustomer({ season: 'hiver', random: sequence(0.4, 0.5, 0) });

      expect(customer.season).toBe('normal');
      expect(customer.profile).toBe('family');
    });

    it('devrait calculer le budget selon la réputation', () => {
      // variance neutre (0.5 => x1.0)
      expect(generateCustomer({ reputation: 50, random: sequence(NORMAL_ROLLS.business, 0.5, 0) }).budget).toBe(160);
      expect(generateCustomer({ reputation: 100, random: sequence(NORMAL_ROLLS.business, 0.5, 0) }).budget).toBe(192);
      expect(generateCustomer({ reputation: 0, random: sequence(NORMAL_ROLLS.tourist, 0.5, 0) }).budget).toBe(88);
      expect(generateCustomer({ reputation: 100, random: sequence(NORMAL_ROLLS.vip, 0.5, 0) }).budget).toBe(360);
    });

    it('devrait borner la réputation entre 0 et 100', () => {
      const high = generateCustomer({ reputation: 500, random: sequence(NORMAL_ROLLS.business, 0.5, 0) });
      const low = generateCustomer({ reputation: -20, random: sequence(NORMAL_ROLLS.business, 0.5, 0) });

      expect(high.budget).toBe(192);
      expect(low.budget).toBe(128);
    });

    it('devrait utiliser 50 de réputation si la valeur n\'est pas un nombre fini', () => {
      const customer = generateCustomer({ reputation: NaN, random: sequence(NORMAL_ROLLS.business, 0.5, 0) });
      expect(customer.budget).toBe(160);
    });

    it('devrait appliquer une variance de ±10 % sur le budget', () => {
      const min = generateCustomer({ reputation: 50, random: sequence(NORMAL_ROLLS.business, 0, 0) });
      const max = generateCustomer({ reputation: 50, random: sequence(NORMAL_ROLLS.business, 0.999999, 0) });

      expect(min.budget).toBe(144);
      expect(max.budget).toBe(176);
    });

    it.each(Object.entries(NORMAL_ROLLS))('devrait respecter les bornes de nuits du profil %s', (key, roll) => {
      const profile = ALL_PROFILES.find((p) => p.key === key);

      expect(generateCustomer({ random: sequence(roll, 0.5, 0) }).nights).toBe(profile.minNights);
      expect(generateCustomer({ random: sequence(roll, 0.5, 0.999999) }).nights).toBe(profile.maxNights);
    });

    it('devrait être exporté par défaut', () => {
      expect(generateCustomerDefault).toBe(generateCustomer);
    });
  });

  describe('pickProfile', () => {
    it('devrait respecter les bornes cumulées de la saison normale', () => {
      expect(pickProfile('normal', 0).key).toBe('vip');
      expect(pickProfile('normal', 0.05).key).toBe('business');
      expect(pickProfile('normal', 0.35).key).toBe('family');
      expect(pickProfile('normal', 0.5).key).toBe('tourist');
      expect(pickProfile('normal', 0.8).key).toBe('budget');
      expect(pickProfile('normal', 0.999999).key).toBe('budget');
    });

    it('devrait retomber sur le dernier profil si le tirage atteint 1', () => {
      expect(pickProfile('normal', 1).key).toBe('budget');
    });

    it('devrait utiliser la saison normale pour une saison inconnue', () => {
      expect(pickProfile('hiver', 0.4).key).toBe('family');
    });
  });

  describe('influence de la réputation sur la clientèle', () => {
    const sum = (weights) => Object.values(weights).reduce((total, w) => total + w, 0);

    it.each(Object.keys(PROFILE_WEIGHTS_BY_SEASON))('devrait reprendre les probabilités saisonnières à réputation 50 (%s)', (season) => {
      const weights = getProfileWeights(season, 50);
      Object.entries(PROFILE_WEIGHTS_BY_SEASON[season]).forEach(([key, w]) => expect(weights[key]).toBeCloseTo(w, 10));
    });

    it.each([0, 25, 75, 100])('devrait produire des probabilités valides à réputation %i', (reputation) => {
      Object.keys(PROFILE_WEIGHTS_BY_SEASON).forEach((season) => {
        const weights = getProfileWeights(season, reputation);
        expect(Object.keys(weights).sort()).toEqual([...ALL_KEYS].sort());
        Object.values(weights).forEach((w) => expect(w).toBeGreaterThan(0));
        expect(sum(weights)).toBeCloseTo(1, 10);
      });
    });

    it('une bonne réputation devrait attirer VIP et Business et raréfier la clientèle Budget', () => {
      const neutral = getProfileWeights('normal', 50);
      const high = getProfileWeights('normal', 100);
      const low = getProfileWeights('normal', 0);

      expect(high.vip).toBeGreaterThan(neutral.vip);
      expect(high.business).toBeGreaterThan(neutral.business);
      expect(high.budget).toBeLessThan(neutral.budget);
      expect(low.vip).toBeLessThan(neutral.vip);
      expect(low.budget).toBeGreaterThan(neutral.budget);
    });

    it('devrait borner la réputation et utiliser 50 par défaut', () => {
      expect(getProfileWeights('normal', 500)).toEqual(getProfileWeights('normal', 100));
      expect(getProfileWeights('normal', -20)).toEqual(getProfileWeights('normal', 0));
      expect(getProfileWeights('normal', NaN)).toEqual(getProfileWeights('normal', 50));
      expect(getProfileWeights()).toEqual(getProfileWeights('normal', 50));
      expect(getProfileWeights('hiver', 80)).toEqual(getProfileWeights('normal', 80));
    });

    it('ne devrait jamais faire disparaître un profil (multiplicateur >= 0.2)', () => {
      Object.values(REPUTATION_SENSITIVITY).forEach((s) => {
        expect(Math.abs(s)).toBeLessThanOrEqual(0.8 + 1e-9); // 1 ± s >= 0.2
      });
      expect(Object.isFrozen(REPUTATION_SENSITIVITY)).toBe(true);
    });

    it('pickProfile devrait tenir compte de la réputation', () => {
      // 0.07 : Business à réputation 50 (VIP < 0.05), VIP à réputation 100 (VIP ~0.085)
      expect(pickProfile('normal', 0.07).key).toBe('business');
      expect(pickProfile('normal', 0.07, 100).key).toBe('vip');
    });

    it('generateCustomer devrait transmettre la réputation au tirage du profil', () => {
      expect(generateCustomer({ reputation: 50, random: sequence(0.07, 0.5, 0) }).profile).toBe('business');
      expect(generateCustomer({ reputation: 100, random: sequence(0.07, 0.5, 0) }).profile).toBe('vip');
    });

    it('le budget moyen pondéré devrait croître avec la réputation tout en restant borné', () => {
      const averageBudget = (reputation) => {
        const weights = getProfileWeights('normal', reputation);
        return ALL_PROFILES.reduce((total, p) => total + weights[p.key] * p.baseBudget, 0);
      };
      expect(averageBudget(0)).toBeLessThan(averageBudget(50));
      expect(averageBudget(50)).toBeLessThan(averageBudget(100));
      expect(averageBudget(0)).toBeGreaterThanOrEqual(115);
      expect(averageBudget(100)).toBeLessThanOrEqual(155);
    });

    it('devrait déplacer la distribution générée selon la réputation', () => {
      const share = (reputation, keys) => {
        const customers = generateCustomers(20000, { reputation, random: seeded(7) });
        return customers.filter((c) => keys.includes(c.profile)).length / customers.length;
      };
      const premium = ['vip', 'business'];

      expect(share(100, premium)).toBeGreaterThan(share(50, premium) + 0.05);
      expect(share(0, premium)).toBeLessThan(share(50, premium) - 0.05);
      expect(share(100, ['budget'])).toBeLessThan(share(0, ['budget']));
    });
  });

  describe('équilibrage', () => {
    it.each(Object.keys(PROFILE_WEIGHTS_BY_SEASON))('devrait avoir des probabilités sommant à 1 en saison %s', (season) => {
      const weights = PROFILE_WEIGHTS_BY_SEASON[season];

      expect(Object.keys(weights).sort()).toEqual([...ALL_KEYS].sort());
      Object.values(weights).forEach((w) => expect(w).toBeGreaterThan(0));
      expect(Object.values(weights).reduce((sum, w) => sum + w, 0)).toBeCloseTo(1, 10);
    });

    it('devrait ordonner les budgets de base : VIP > Business > Famille > Touriste > Budget', () => {
      const budgets = [PROFILES.VIP, PROFILES.BUSINESS, PROFILES.FAMILY, PROFILES.TOURIST, PROFILES.BUDGET].map((p) => p.baseBudget);
      expect(budgets).toEqual([...budgets].sort((a, b) => b - a));
    });

    it('devrait garder un budget moyen pondéré proche de l\'ancien mix Business/Touriste', () => {
      const averageBudget = (season) => ALL_PROFILES.reduce(
        (sum, p) => sum + PROFILE_WEIGHTS_BY_SEASON[season][p.key] * p.baseBudget, 0,
      );
      // Ancien mix : 0.5 x 160 + 0.5 x 110 = 135 en saison normale
      expect(averageBudget('normal')).toBeGreaterThanOrEqual(125);
      expect(averageBudget('normal')).toBeLessThanOrEqual(145);
      Object.keys(PROFILE_WEIGHTS_BY_SEASON).forEach((season) => {
        expect(averageBudget(season)).toBeGreaterThanOrEqual(120);
        expect(averageBudget(season)).toBeLessThanOrEqual(150);
      });
    });

    it('devrait produire une distribution conforme aux probabilités', () => {
      const count = 20000;
      const counts = {};
      generateCustomers(count, { season: 'normal', random: seeded(42) }).forEach((c) => {
        counts[c.profile] = (counts[c.profile] || 0) + 1;
      });

      Object.entries(PROFILE_WEIGHTS_BY_SEASON.normal).forEach(([key, weight]) => {
        expect(counts[key] / count).toBeGreaterThan(weight - 0.02);
        expect(counts[key] / count).toBeLessThan(weight + 0.02);
      });
    });

    it('devrait laisser chaque profil sauf Budget accepter le prix de base (100) à réputation moyenne', () => {
      const economy = new EconomyEngine({ baseRoomPrice: 100 });
      const accepts = (profile, variance) => economy.acceptsRoomPrice(
        { profile: profile.key, budget: Math.round(profile.baseBudget * (0.9 + variance * 0.2)) },
      );

      // Même au plus bas de la variance, les profils hors Budget acceptent
      [PROFILES.VIP, PROFILES.BUSINESS, PROFILES.FAMILY, PROFILES.TOURIST].forEach((p) => expect(accepts(p, 0)).toBe(true));
      // Le profil Budget est sensible au prix : refus en bas de variance, acceptation en haut
      expect(accepts(PROFILES.BUDGET, 0)).toBe(false);
      expect(accepts(PROFILES.BUDGET, 0.999999)).toBe(true);
    });
  });

  describe('generateCustomers', () => {
    it('devrait générer le nombre de clients demandé', () => {
      const customers = generateCustomers(5, { season: 'high' });

      expect(customers).toHaveLength(5);
      customers.forEach((c) => expect(c.season).toBe('high'));
      expect(new Set(customers.map((c) => c.id)).size).toBe(5);
    });

    it('devrait renvoyer un tableau vide pour 0', () => {
      expect(generateCustomers(0)).toEqual([]);
    });

    it.each([-1, 2.5, '3', undefined])('devrait rejeter un count invalide (%s)', (count) => {
      expect(() => generateCustomers(count)).toThrow('count doit être un entier >= 0');
    });
  });

  describe('constantes', () => {
    it('devrait exposer des profils et probabilités saisonnières figés', () => {
      expect(Object.isFrozen(PROFILES)).toBe(true);
      ALL_PROFILES.forEach((p) => expect(Object.isFrozen(p)).toBe(true));
      expect(Object.isFrozen(PROFILE_WEIGHTS_BY_SEASON)).toBe(true);
      Object.values(PROFILE_WEIGHTS_BY_SEASON).forEach((w) => expect(Object.isFrozen(w)).toBe(true));
    });
  });
});
