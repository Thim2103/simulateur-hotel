import { describe, it, expect, vi, afterEach } from 'vitest';
import { GuestSpawner } from './guestSpawner.js';
import { ReputationEngine } from '../reputation/reputationEngine.js';

// Intégration sans mock : avis au check-out -> ReputationEngine -> hôtel -> customerGenerator.

// Générateur pseudo-aléatoire reproductible (LCG)
const seeded = (seed) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const world = { getSeasonalityMultiplier: () => 1.0, currentSeason: 'normal' };

const createHotel = () => ({
  reputation: 50,
  totalRooms: 1000,
  hasAvailableRooms: () => true,
  releaseRoom: vi.fn(),
});

// Fait séjourner puis partir `count` clients avec la satisfaction donnée
const runStays = (spawner, hotel, count, satisfaction) => {
  for (let i = 0; i < count; i += 1) {
    spawner.trySpawn(hotel, world).setState({ nights: 1, satisfaction });
  }
  spawner.update({ hotel });
};

// Génère `count` arrivées et renvoie la répartition des profils et le budget moyen
const sampleArrivals = (spawner, hotel, count) => {
  const profiles = {};
  let budget = 0;
  for (let i = 0; i < count; i += 1) {
    const state = spawner.trySpawn(hotel, world).getState();
    profiles[state.profile] = (profiles[state.profile] || 0) + 1;
    budget += state.budget;
  }
  const share = (...keys) => keys.reduce((sum, k) => sum + (profiles[k] || 0), 0) / count;
  return { share, averageBudget: budget / count };
};

const simulate = (satisfaction) => {
  const hotel = createHotel();
  const reputation = new ReputationEngine();
  const spawner = new GuestSpawner({ reputation });
  runStays(spawner, hotel, 30, satisfaction);
  return { hotel, reputation, spawner };
};

describe('Flux réputation -> clientèle (intégration)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devrait calculer la note moyenne et mettre à jour l'attractivité de l'hôtel", () => {
    const good = simulate(95); // 5 étoiles
    const bad = simulate(25); // 2 étoiles

    expect(good.reputation.getReviewCount()).toBe(30);
    expect(good.hotel.averageRating).toBe(5);
    expect(bad.hotel.averageRating).toBe(2);
    // Lissage par la note de départ (priorWeight 10) : (30 x 5 + 10 x 3) / 40 = 4.5 -> 88
    expect(good.hotel.reputation).toBe(88);
    expect(bad.hotel.reputation).toBe(31);
    expect(good.hotel.attractiveness).toBeGreaterThan(1);
    expect(bad.hotel.attractiveness).toBeLessThan(1);
    expect(good.hotel.releaseRoom).toHaveBeenCalledTimes(30);
  });

  it('devrait accélérer les arrivées pour un hôtel bien noté et les ralentir sinon', () => {
    const good = simulate(95);
    const bad = simulate(25);
    const neutral = new GuestSpawner({ reputation: new ReputationEngine() });

    const neutralInterval = neutral.calculateInterval(createHotel(), world);
    expect(good.spawner.calculateInterval(good.hotel, world)).toBeLessThan(neutralInterval);
    expect(bad.spawner.calculateInterval(bad.hotel, world)).toBeGreaterThan(neutralInterval);
  });

  it('devrait attirer une clientèle plus premium et plus aisée après de bons avis', () => {
    const good = simulate(95);
    const bad = simulate(25);

    vi.spyOn(Math, 'random').mockImplementation(seeded(2026));
    const goodArrivals = sampleArrivals(good.spawner, good.hotel, 5000);
    vi.spyOn(Math, 'random').mockImplementation(seeded(2026));
    const badArrivals = sampleArrivals(bad.spawner, bad.hotel, 5000);

    expect(goodArrivals.share('vip', 'business')).toBeGreaterThan(badArrivals.share('vip', 'business') + 0.05);
    expect(goodArrivals.share('budget')).toBeLessThan(badArrivals.share('budget'));
    expect(goodArrivals.averageBudget).toBeGreaterThan(badArrivals.averageBudget * 1.15);
  });
});
