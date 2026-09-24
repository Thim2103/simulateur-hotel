import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GuestSpawner } from './guestSpawner.js';
import { generateCustomer } from './customerGenerator.js';
import { Agent } from '../agents/Agent.js';
import { EconomyEngine } from '../economy/economyEngine.js';
import { ReputationEngine } from '../reputation/reputationEngine.js';

// Mock de la dépendance externe : ids uniques pour pouvoir suivre plusieurs clients
let mockId = 0;
vi.mock('./customerGenerator.js', () => ({
  generateCustomer: vi.fn((options) => ({
    id: `mock-customer-${++mockId}`,
    profile: 'tourist',
    budget: 120,
    nights: 3,
    ...options
  }))
}));

describe('GuestSpawner', () => {
  let hotel;
  let world;
  let onSpawnMock;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    hotel = {
      reputation: 50,
      hasAvailableRooms: vi.fn(() => true)
    };

    world = {
      getSeasonalityMultiplier: vi.fn(() => 1.0),
      currentSeason: 'normal'
    };

    onSpawnMock = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('devrait initialiser avec les options par défaut', () => {
      const spawner = new GuestSpawner();
      expect(spawner.baseSpawnRate).toBe(10000);
      expect(spawner.minSpawnRate).toBe(2000);
      expect(spawner.timer).toBeNull();
      expect(typeof spawner.onSpawn).toBe('function');
      expect(spawner.economy).toBeNull();
      expect(spawner.costPerGuest).toBe(20);
      expect(spawner.reputation).toBeNull();
      expect(typeof spawner.onReview).toBe('function');
      expect(spawner.reviews).toEqual([]);
    });

    it('devrait accepter des options personnalisées', () => {
      const customOnSpawn = () => {};
      const spawner = new GuestSpawner({
        baseSpawnRate: 5000,
        minSpawnRate: 1000,
        onSpawn: customOnSpawn
      });

      expect(spawner.baseSpawnRate).toBe(5000);
      expect(spawner.minSpawnRate).toBe(1000);
      expect(spawner.onSpawn).toBe(customOnSpawn);
    });
  });

  describe('calculateInterval', () => {
    it('devrait calculer un intervalle correct avec des valeurs par défaut', () => {
      const spawner = new GuestSpawner({ baseSpawnRate: 10000, minSpawnRate: 2000 });
      // reputation = 50 (50/50 = 1), seasonality = 1.0 => rate = 1.0 => interval = 10000 / 1 = 10000
      const interval = spawner.calculateInterval(hotel, world);
      expect(interval).toBe(10000);
    });

    it('devrait réduire l\'intervalle si la réputation est élevée', () => {
      const spawner = new GuestSpawner({ baseSpawnRate: 10000, minSpawnRate: 2000 });
      hotel.reputation = 100; // rate = (100/50) * 1 = 2 => interval = 10000 / 2 = 5000
      const interval = spawner.calculateInterval(hotel, world);
      expect(interval).toBe(5000);
    });

    it('ne devrait pas descendre en dessous de minSpawnRate', () => {
      const spawner = new GuestSpawner({ baseSpawnRate: 10000, minSpawnRate: 3000 });
      hotel.reputation = 100;
      world.getSeasonalityMultiplier = vi.fn(() => 10.0); // rate très haut => interval très bas
      
      const interval = spawner.calculateInterval(hotel, world);
      expect(interval).toBe(3000);
    });

    it('devrait gérer les objets hotel et world manquants', () => {
      const spawner = new GuestSpawner();
      const interval = spawner.calculateInterval(null, null);
      // valeurs par défaut: reputation = 50, multiplier = 1.0 => 10000
      expect(interval).toBe(10000);
    });
  });

  describe('trySpawn', () => {
    it('devrait générer et envoyer un client si les chambres sont disponibles', () => {
      const spawner = new GuestSpawner({ onSpawn: onSpawnMock });
      
      spawner.trySpawn(hotel, world);

      expect(hotel.hasAvailableRooms).toHaveBeenCalled();
      expect(generateCustomer).toHaveBeenCalledWith({
        reputation: 50,
        season: 'normal'
      });
      expect(onSpawnMock).toHaveBeenCalledTimes(1);
      const guest = onSpawnMock.mock.calls[0][0];
      expect(guest).toBeInstanceOf(Agent);
      expect(guest.type).toBe('customer');
      expect(guest.id).toMatch(/^mock-customer-\d+$/);
      expect(guest.getState()).toEqual({
        profile: 'tourist',
        budget: 120,
        nights: 3,
        reputation: 50,
        season: 'normal',
        status: 'arriving'
      });
    });

    it("devrait retourner l'agent créé et l'enregistrer parmi les clients actifs", () => {
      const spawner = new GuestSpawner({ onSpawn: onSpawnMock });

      const guest = spawner.trySpawn(hotel, world);

      expect(guest).toBeInstanceOf(Agent);
      expect(spawner.getGuest(guest.id)).toBe(guest);
      expect(spawner.getGuests()).toEqual([guest]);
    });

    it('ne devrait PAS générer de client si l\'hôtel n\'a plus de chambres disponibles', () => {
      const spawner = new GuestSpawner({ onSpawn: onSpawnMock });
      hotel.hasAvailableRooms.mockReturnValue(false);

      const guest = spawner.trySpawn(hotel, world);

      expect(guest).toBeNull();
      expect(hotel.hasAvailableRooms).toHaveBeenCalled();
      expect(generateCustomer).not.toHaveBeenCalled();
      expect(onSpawnMock).not.toHaveBeenCalled();
      expect(spawner.getGuests()).toEqual([]);
    });

    it('devrait fonctionner même si hotel.hasAvailableRooms n\'est pas une fonction', () => {
      const spawner = new GuestSpawner({ onSpawn: onSpawnMock });
      const simpleHotel = { reputation: 80 };

      spawner.trySpawn(simpleHotel, world);

      expect(generateCustomer).toHaveBeenCalledWith({
        reputation: 80,
        season: 'normal'
      });
      expect(onSpawnMock).toHaveBeenCalled();
    });
  });

  describe('gestion des clients', () => {
    it('devrait gérer plusieurs clients distincts et permettre leur retrait', () => {
      const spawner = new GuestSpawner();
      const first = spawner.trySpawn(hotel, world);
      const second = spawner.trySpawn(hotel, world);

      expect(first.id).not.toBe(second.id);
      expect(spawner.getGuests()).toEqual([first, second]);

      expect(spawner.removeGuest(first.id)).toBe(true);
      expect(spawner.removeGuest(first.id)).toBe(false);
      expect(spawner.getGuest(first.id)).toBeUndefined();
      expect(spawner.getGuests()).toEqual([second]);
    });

    it('update devrait faire avancer chaque agent client avec le contexte', () => {
      const spawner = new GuestSpawner();
      const guests = [spawner.trySpawn(hotel, world), spawner.trySpawn(hotel, world)];
      const spies = guests.map((g) => vi.spyOn(g, 'update'));
      const context = { hotel, world, tick: 1 };

      spawner.update(context);

      spies.forEach((spy) => expect(spy).toHaveBeenCalledWith(context));
    });

    it('les clients générés devraient être des agents réactifs (setState / change)', () => {
      const spawner = new GuestSpawner();
      const guest = spawner.trySpawn(hotel, world);
      const onChange = vi.fn();
      guest.on('change', onChange);

      guest.setState({ status: 'checked-in' });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(spawner.getGuest(guest.id).getState().status).toBe('checked-in');
    });
  });

  describe('intégration avec le vrai customerGenerator', () => {
    it('devrait produire un agent client à partir de données réelles', async () => {
      const actual = await vi.importActual('./customerGenerator.js');
      generateCustomer.mockImplementationOnce(actual.generateCustomer);
      const spawner = new GuestSpawner();

      const guest = spawner.trySpawn({ reputation: 90 }, { currentSeason: 'high' });

      expect(guest.id).toMatch(/^customer-\d+$/);
      expect(guest.type).toBe('customer');
      const state = guest.getState();
      expect(['business', 'tourist']).toContain(state.profile);
      expect(state.season).toBe('high');
      expect(state.budget).toBeGreaterThan(0);
      expect(state.nights).toBeGreaterThanOrEqual(1);
      expect(state.status).toBe('arriving');
    });
  });

  describe('intégration avec EconomyEngine', () => {
    let economy;

    beforeEach(() => {
      // Prix chambre 100, coûts fixes 500, trésorerie 5000
      economy = new EconomyEngine();
    });

    it("update ne devrait rien enregistrer sans EconomyEngine", () => {
      const spawner = new GuestSpawner();
      spawner.trySpawn(hotel, world);

      expect(spawner.update({ hotel })).toBeNull();
    });

    it('devrait enregistrer le CA des chambres et les dépenses à chaque cycle', () => {
      const spawner = new GuestSpawner({ economy, costPerGuest: 30 });
      hotel.totalRooms = 10;
      spawner.trySpawn(hotel, world);
      spawner.trySpawn(hotel, world);

      const report = spawner.update({ hotel });

      // CA : 2 x 100 = 200 ; dépenses : 500 + 2 x 30 = 560 ; net : -360
      expect(report.occupancyRate).toBe(20);
      expect(report.roomRevenue).toBe(200);
      expect(report.extraRevenue).toBe(0);
      expect(report.extraCosts).toBe(60);
      expect(report.totalCosts).toBe(560);
      expect(report.netIncome).toBe(-360);
      expect(economy.getTreasury()).toBe(4640);
      expect(economy.history).toEqual([report]);
    });

    it('devrait facturer les extras des clients une seule fois', () => {
      const spawner = new GuestSpawner({ economy, costPerGuest: 0 });
      const first = spawner.trySpawn(hotel, world);
      const second = spawner.trySpawn(hotel, world);
      first.setState({ extras: 45 });
      second.setState({ extras: 15 });

      const report = spawner.update({ hotel });

      expect(report.extraRevenue).toBe(60);
      expect(report.totalRevenue).toBe(260);
      expect(first.getState().extras).toBe(0);
      expect(second.getState().extras).toBe(0);

      const next = spawner.update({ hotel });
      expect(next.extraRevenue).toBe(0);
      expect(economy.history).toHaveLength(2);
    });

    it('devrait prendre en compte les extras ajoutés par les agents pendant le cycle', () => {
      const spawner = new GuestSpawner({ economy, costPerGuest: 0 });
      const guest = spawner.trySpawn(hotel, world);
      guest.update = () => guest.setState({ extras: 25 });

      const report = spawner.update({ hotel });

      expect(report.extraRevenue).toBe(25);
    });

    it('ne devrait plus facturer un client retiré', () => {
      const spawner = new GuestSpawner({ economy, costPerGuest: 10 });
      const guest = spawner.trySpawn(hotel, world);
      spawner.trySpawn(hotel, world);
      spawner.removeGuest(guest.id);

      const report = spawner.update({ hotel });

      expect(report.roomRevenue).toBe(100);
      expect(report.extraCosts).toBe(10);
    });

    it("devrait imputer les coûts fixes même sans client", () => {
      const spawner = new GuestSpawner({ economy });

      const report = spawner.update();

      expect(report.occupancyRate).toBe(0);
      expect(report.totalRevenue).toBe(0);
      expect(report.totalCosts).toBe(500);
      expect(economy.getTreasury()).toBe(4500);
    });
  });

  describe('gestion des nuits et check-out', () => {
    it('devrait décrémenter les nuits restantes à chaque cycle', () => {
      const spawner = new GuestSpawner();
      const guest = spawner.trySpawn(hotel, world); // 3 nuits

      spawner.update({ hotel });
      expect(guest.getState().nights).toBe(2);

      spawner.update({ hotel });
      expect(guest.getState().nights).toBe(1);
      expect(spawner.getGuest(guest.id)).toBe(guest);
    });

    it('devrait faire partir le client quand ses nuits atteignent 0', () => {
      const spawner = new GuestSpawner();
      const guest = spawner.trySpawn(hotel, world);
      const removeSpy = vi.spyOn(spawner, 'removeGuest');

      spawner.update({ hotel });
      spawner.update({ hotel });
      expect(removeSpy).not.toHaveBeenCalled();

      spawner.update({ hotel });

      expect(removeSpy).toHaveBeenCalledWith(guest.id);
      expect(spawner.getGuest(guest.id)).toBeUndefined();
      expect(spawner.getGuests()).toEqual([]);
      expect(guest.getState()).toMatchObject({ nights: 0, status: 'checked-out' });
    });

    it('devrait libérer la chambre du client au check-out', () => {
      const spawner = new GuestSpawner();
      hotel.releaseRoom = vi.fn();
      const guest = spawner.trySpawn(hotel, world);
      guest.setState({ nights: 1 });

      spawner.update({ hotel });

      expect(hotel.releaseRoom).toHaveBeenCalledTimes(1);
      expect(hotel.releaseRoom).toHaveBeenCalledWith(guest);
    });

    it('ne devrait pas échouer si hotel.releaseRoom est absent', () => {
      const spawner = new GuestSpawner();
      const guest = spawner.trySpawn(hotel, world);
      guest.setState({ nights: 1 });

      expect(() => spawner.update()).not.toThrow();
      expect(spawner.getGuests()).toEqual([]);
    });

    it('devrait calculer la satisfaction finale et émettre un avis', () => {
      const onReview = vi.fn();
      const spawner = new GuestSpawner({ onReview });
      const guest = spawner.trySpawn(hotel, world);
      guest.setState({ nights: 1, satisfaction: 72.6 });
      const onCheckout = vi.fn();
      guest.on('checkout', onCheckout);

      const report = spawner.update({ hotel, tick: 7 });

      const expected = {
        guestId: guest.id,
        profile: 'tourist',
        satisfaction: 73,
        rating: 4,
        tick: 7
      };
      expect(report).toBeNull();
      expect(spawner.reviews).toEqual([expected]);
      expect(onReview).toHaveBeenCalledWith(expected, guest);
      expect(onCheckout).toHaveBeenCalledWith(expected, guest);
      expect(guest.getState().satisfaction).toBe(73);
    });

    it('devrait borner la satisfaction et utiliser 50 par défaut', () => {
      const spawner = new GuestSpawner();
      const [angry, delighted, neutral] = [0, 1, 2].map(() => spawner.trySpawn(hotel, world));
      angry.setState({ nights: 1, satisfaction: -20 });
      delighted.setState({ nights: 1, satisfaction: 150 });
      neutral.setState({ nights: 1 }); // satisfaction absente

      spawner.update({ hotel });

      expect(spawner.reviews.map(({ satisfaction, rating }) => [satisfaction, rating])).toEqual([
        [0, 1],
        [100, 5],
        [50, 3]
      ]);
    });

    it('satisfactionToRating devrait convertir 0-100 en 1 à 5 étoiles', () => {
      expect([0, 20, 21, 40, 60, 80, 81, 100].map(GuestSpawner.satisfactionToRating))
        .toEqual([1, 1, 2, 2, 3, 4, 5, 5]);
    });

    it('ne devrait faire partir que les clients arrivés au bout de leur séjour', () => {
      const spawner = new GuestSpawner();
      const leaving = spawner.trySpawn(hotel, world);
      const staying = spawner.trySpawn(hotel, world);
      leaving.setState({ nights: 1 });

      spawner.update({ hotel });

      expect(spawner.getGuests()).toEqual([staying]);
      expect(staying.getState().nights).toBe(2);
      expect(spawner.reviews.map((r) => r.guestId)).toEqual([leaving.id]);
    });

    it('devrait ignorer les clients sans nombre de nuits valide', () => {
      const spawner = new GuestSpawner();
      const guest = spawner.trySpawn(hotel, world);
      guest.setState({ nights: undefined });

      spawner.update({ hotel });

      expect(spawner.getGuest(guest.id)).toBe(guest);
      expect(spawner.reviews).toEqual([]);
    });

    it('devrait facturer la dernière nuit avant le départ du client', () => {
      const economy = new EconomyEngine();
      const spawner = new GuestSpawner({ economy, costPerGuest: 0 });
      const guest = spawner.trySpawn(hotel, world);
      guest.setState({ nights: 1, extras: 30 });

      const report = spawner.update({ hotel });
      expect(report.roomRevenue).toBe(100);
      expect(report.extraRevenue).toBe(30);
      expect(spawner.getGuests()).toEqual([]);

      const next = spawner.update({ hotel });
      expect(next.roomRevenue).toBe(0);
    });

    it('un séjour de 3 nuits devrait être facturé exactement 3 fois', () => {
      const economy = new EconomyEngine();
      const spawner = new GuestSpawner({ economy, costPerGuest: 0 });
      spawner.trySpawn(hotel, world);

      const revenues = [1, 2, 3, 4].map(() => spawner.update({ hotel }).roomRevenue);

      expect(revenues).toEqual([100, 100, 100, 0]);
      expect(spawner.reviews).toHaveLength(1);
    });
  });

  describe('intégration avec ReputationEngine', () => {
    let reputation;

    beforeEach(() => {
      // Note de départ 3 (réputation 50), sans lissage pour des calculs lisibles
      reputation = new ReputationEngine({ priorWeight: 0 });
    });

    const checkoutWithSatisfaction = (spawner, satisfactions, context = { hotel }) => {
      satisfactions.forEach((satisfaction) => {
        const guest = spawner.trySpawn(hotel, world);
        guest.setState({ nights: 1, satisfaction });
      });
      return spawner.update(context);
    };

    it('recordReview ne devrait rien faire sans ReputationEngine', () => {
      const spawner = new GuestSpawner();
      checkoutWithSatisfaction(spawner, [100]);

      expect(spawner.recordReview({ rating: 5 }, hotel)).toBeNull();
      expect(hotel.reputation).toBe(50);
    });

    it('devrait transmettre les avis du check-out au ReputationEngine', () => {
      const spawner = new GuestSpawner({ reputation });
      checkoutWithSatisfaction(spawner, [95, 70]); // 5 et 4 étoiles

      expect(reputation.getReviewCount()).toBe(2);
      expect(reputation.reviews).toEqual(spawner.reviews);
      expect(reputation.getAverageRating()).toBe(4.5);
    });

    it('devrait mettre à jour hotel.reputation après chaque avis', () => {
      const spawner = new GuestSpawner({ reputation });
      const seen = [];
      const onReview = vi.fn(() => seen.push(hotel.reputation));
      spawner.onReview = onReview;

      checkoutWithSatisfaction(spawner, [95, 10]); // 5 puis 1 étoile

      // La réputation est à jour quand onReview est appelé
      expect(seen).toEqual([100, 50]);
      expect(hotel.reputation).toBe(50);
    });

    it("ne devrait pas échouer sans hôtel dans le contexte", () => {
      const spawner = new GuestSpawner({ reputation });

      expect(() => checkoutWithSatisfaction(spawner, [95], {})).not.toThrow();
      expect(reputation.getReputation()).toBe(100);
    });

    it("les bons avis devraient accélérer l'arrivée des clients", () => {
      const spawner = new GuestSpawner({ reputation });
      const before = spawner.calculateInterval(hotel, world);

      checkoutWithSatisfaction(spawner, [95, 95]);

      expect(before).toBe(10000);
      expect(spawner.calculateInterval(hotel, world)).toBe(5000);
    });

    it("les mauvais avis devraient ralentir l'arrivée des clients", () => {
      const spawner = new GuestSpawner({ reputation, baseSpawnRate: 10000 });

      checkoutWithSatisfaction(spawner, [30, 30]); // 2 étoiles -> réputation 25

      expect(hotel.reputation).toBe(25);
      expect(spawner.calculateInterval(hotel, world)).toBe(20000);
    });

    it("la réputation du ReputationEngine devrait primer sur celle de l'hôtel", () => {
      const spawner = new GuestSpawner({ reputation });
      hotel.reputation = 100;

      expect(spawner.getReputation(hotel)).toBe(50);
      expect(spawner.calculateInterval(hotel, world)).toBe(10000);
    });

    it('devrait générer les nouveaux clients avec la réputation à jour', () => {
      const spawner = new GuestSpawner({ reputation });
      checkoutWithSatisfaction(spawner, [95]);
      generateCustomer.mockClear();

      spawner.trySpawn({ hasAvailableRooms: () => true }, world);

      expect(generateCustomer).toHaveBeenCalledWith({ reputation: 100, season: 'normal' });
    });

    it('le prochain spawn planifié devrait tenir compte de la nouvelle réputation', () => {
      const spawner = new GuestSpawner({ reputation, onSpawn: onSpawnMock });
      spawner.start(hotel, world); // premier délai : 10000 ms

      checkoutWithSatisfaction(spawner, [95]); // réputation 100
      onSpawnMock.mockClear();

      vi.advanceTimersByTime(10000); // spawn, puis prochain délai : 5000 ms
      expect(onSpawnMock).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(5000);
      expect(onSpawnMock).toHaveBeenCalledTimes(2);

      spawner.stop();
    });

    it('un séjour complet devrait être facturé puis noté', () => {
      const economy = new EconomyEngine();
      const spawner = new GuestSpawner({ economy, reputation, costPerGuest: 0 });
      const guest = spawner.trySpawn(hotel, world); // 3 nuits
      guest.setState({ satisfaction: 90 });

      [1, 2, 3].forEach(() => spawner.update({ hotel }));

      expect(economy.history.map((r) => r.roomRevenue)).toEqual([100, 100, 100]);
      expect(reputation.getAverageRating()).toBe(5);
      expect(hotel.reputation).toBe(100);
      expect(spawner.getGuests()).toEqual([]);
    });
  });

  describe('start and stop', () => {
    it('devrait démarrer le timer et planifier les apparitions', () => {
      const spawner = new GuestSpawner({ onSpawn: onSpawnMock });

      spawner.start(hotel, world);

      // Le start appelle scheduleNextSpawn, qui définit un setTimeout
      expect(spawner.timer).not.toBeNull();

      // Avancer le temps pour déclencher le premier spawn
      vi.advanceTimersByTime(10000);

      expect(onSpawnMock).toHaveBeenCalledTimes(1);

      // Avancer à nouveau pour le deuxième spawn
      vi.advanceTimersByTime(10000);
      expect(onSpawnMock).toHaveBeenCalledTimes(2);
      expect(spawner.getGuests()).toHaveLength(2);

      spawner.stop();
    });

    it('ne devrait pas créer plusieurs timers si start est appelé plusieurs fois', () => {
      const spawner = new GuestSpawner({ onSpawn: onSpawnMock });

      spawner.start(hotel, world);
      const firstTimer = spawner.timer;

      spawner.start(hotel, world);
      const secondTimer = spawner.timer;

      expect(firstTimer).toBe(secondTimer);
      spawner.stop();
    });

    it('devrait arrêter correctement le timer', () => {
      const spawner = new GuestSpawner({ onSpawn: onSpawnMock });

      spawner.start(hotel, world);
      expect(spawner.timer).not.toBeNull();

      spawner.stop();
      expect(spawner.timer).toBeNull();

      // Avancer le temps ne devrait déclencher aucun spawn après l'arrêt
      vi.advanceTimersByTime(20000);
      expect(onSpawnMock).not.toHaveBeenCalled();
    });
  });
});