import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GuestSpawner } from './guestSpawner.js';
import { generateCustomer } from './customerGenerator.js';

// Mock de la dépendance externe
vi.mock('./customerGenerator.js', () => ({
  generateCustomer: vi.fn((options) => ({ id: 'mock-customer', ...options }))
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
      expect(onSpawnMock).toHaveBeenCalledWith({
        id: 'mock-customer',
        reputation: 50,
        season: 'normal'
      });
    });

    it('ne devrait PAS générer de client si l\'hôtel n\'a plus de chambres disponibles', () => {
      const spawner = new GuestSpawner({ onSpawn: onSpawnMock });
      hotel.hasAvailableRooms.mockReturnValue(false);

      spawner.trySpawn(hotel, world);

      expect(hotel.hasAvailableRooms).toHaveBeenCalled();
      expect(generateCustomer).not.toHaveBeenCalled();
      expect(onSpawnMock).not.toHaveBeenCalled();
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