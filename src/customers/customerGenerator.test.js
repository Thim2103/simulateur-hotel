import { describe, it, expect } from 'vitest';
import generateCustomerDefault, {
  PROFILES,
  TOURIST_SHARE_BY_SEASON,
  generateCustomer,
  generateCustomers,
} from './customerGenerator.js';

// Source aléatoire déterministe : renvoie les valeurs dans l'ordre, puis boucle.
// Ordre des appels dans generateCustomer : profil, variance du budget, nombre de nuits.
const sequence = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('customerGenerator', () => {
  describe('generateCustomer', () => {
    it('devrait générer un client complet avec les options par défaut', () => {
      const customer = generateCustomer();

      expect(customer.id).toMatch(/^customer-\d+$/);
      expect(['business', 'tourist']).toContain(customer.profile);
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

    it('devrait choisir un profil Business quand le tirage dépasse la part touriste', () => {
      const customer = generateCustomer({ random: sequence(0.6, 0.5, 0) });

      expect(customer.profile).toBe(PROFILES.BUSINESS.key);
      expect(customer.label).toBe('Business');
      expect(customer.patience).toBe(PROFILES.BUSINESS.patience);
    });

    it('devrait choisir un profil Touriste quand le tirage est sous la part touriste', () => {
      const customer = generateCustomer({ random: sequence(0.4, 0.5, 0) });

      expect(customer.profile).toBe(PROFILES.TOURIST.key);
      expect(customer.label).toBe('Touriste');
      expect(customer.patience).toBe(PROFILES.TOURIST.patience);
    });

    it('devrait appliquer la part touriste de la saison', () => {
      // 0.7 : touriste en haute saison (0.75), business en saison normale (0.5)
      expect(generateCustomer({ season: 'high', random: sequence(0.7, 0.5, 0) }).profile).toBe('tourist');
      expect(generateCustomer({ season: 'normal', random: sequence(0.7, 0.5, 0) }).profile).toBe('business');
      // 0.4 : business en basse saison (0.3)
      expect(generateCustomer({ season: 'low', random: sequence(0.4, 0.5, 0) }).profile).toBe('business');
    });

    it('devrait retomber sur la saison normale pour une saison inconnue', () => {
      const customer = generateCustomer({ season: 'hiver', random: sequence(0.4, 0.5, 0) });

      expect(customer.season).toBe('normal');
      expect(customer.profile).toBe('tourist');
    });

    it('devrait calculer le budget selon la réputation', () => {
      // variance neutre (0.5 => x1.0)
      expect(generateCustomer({ reputation: 50, random: sequence(0.9, 0.5, 0) }).budget).toBe(160);
      expect(generateCustomer({ reputation: 100, random: sequence(0.9, 0.5, 0) }).budget).toBe(192);
      expect(generateCustomer({ reputation: 0, random: sequence(0.1, 0.5, 0) }).budget).toBe(88);
    });

    it('devrait borner la réputation entre 0 et 100', () => {
      const high = generateCustomer({ reputation: 500, random: sequence(0.9, 0.5, 0) });
      const low = generateCustomer({ reputation: -20, random: sequence(0.9, 0.5, 0) });

      expect(high.budget).toBe(192);
      expect(low.budget).toBe(128);
    });

    it('devrait utiliser 50 de réputation si la valeur n\'est pas un nombre fini', () => {
      const customer = generateCustomer({ reputation: NaN, random: sequence(0.9, 0.5, 0) });
      expect(customer.budget).toBe(160);
    });

    it('devrait appliquer une variance de ±10 % sur le budget', () => {
      const min = generateCustomer({ reputation: 50, random: sequence(0.9, 0, 0) });
      const max = generateCustomer({ reputation: 50, random: sequence(0.9, 0.999999, 0) });

      expect(min.budget).toBe(144);
      expect(max.budget).toBe(176);
    });

    it('devrait respecter les bornes de nuits de chaque profil', () => {
      expect(generateCustomer({ random: sequence(0.9, 0.5, 0) }).nights).toBe(PROFILES.BUSINESS.minNights);
      expect(generateCustomer({ random: sequence(0.9, 0.5, 0.999999) }).nights).toBe(PROFILES.BUSINESS.maxNights);
      expect(generateCustomer({ random: sequence(0.1, 0.5, 0) }).nights).toBe(PROFILES.TOURIST.minNights);
      expect(generateCustomer({ random: sequence(0.1, 0.5, 0.999999) }).nights).toBe(PROFILES.TOURIST.maxNights);
    });

    it('devrait être exporté par défaut', () => {
      expect(generateCustomerDefault).toBe(generateCustomer);
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
    it('devrait exposer des profils et parts saisonnières figés', () => {
      expect(Object.isFrozen(PROFILES)).toBe(true);
      expect(Object.isFrozen(PROFILES.BUSINESS)).toBe(true);
      expect(Object.isFrozen(TOURIST_SHARE_BY_SEASON)).toBe(true);
    });
  });
});
