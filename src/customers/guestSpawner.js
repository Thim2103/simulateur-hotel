import { generateCustomer } from './customerGenerator.js';

export class GuestSpawner {
  constructor(options = {}) {
    this.baseSpawnRate = options.baseSpawnRate || 10000; // en millisecondes
    this.minSpawnRate = options.minSpawnRate || 2000;
    this.timer = null;
    this.onSpawn = options.onSpawn || (() => {});
  }

  /**
   * Démarre le générateur de clients.
   * @param {Object} hotel - L'instance de l'hôtel.
   * @param {Object} world - L'instance du monde (contient la saisonnalité, météo, etc.).
   */
  start(hotel, world) {
    if (this.timer) return;

    const tick = () => {
      this.trySpawn(hotel, world);
      this.scheduleNextSpawn(hotel, world);
    };

    this.scheduleNextSpawn(hotel, world);
  }

  /**
   * Arrête le générateur.
   */
  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Calcule le délai avant la prochaine tentative d'apparition basé sur la réputation et la saison.
   */
  calculateInterval(hotel, world) {
    const reputation = hotel?.reputation || 50; // 0 à 100
    const seasonalityModifier = world?.getSeasonalityMultiplier() || 1.0; // Ex: 0.5 (hiver/basse) à 2.0 (été/haute)

    // Plus la réputation est haute et la saison favorable, plus l'intervalle est court
    const effectiveRate = (reputation / 50) * seasonalityModifier;
    const interval = this.baseSpawnRate / Math.max(0.1, effectiveRate);

    return Math.max(this.minSpawnRate, interval);
  }

  /**
   * Tente de générer un client et l'ajoute si les conditions sont réunies.
   */
  trySpawn(hotel, world) {
    // Vérifier si l'hôtel a de la place (optionnel selon la logique du jeu)
    if (hotel && typeof hotel.hasAvailableRooms === 'function' && !hotel.hasAvailableRooms()) {
      return;
    }

    const customer = generateCustomer({
      reputation: hotel?.reputation || 50,
      season: world?.currentSeason || 'normal'
    });

    this.onSpawn(customer);
  }

  scheduleNextSpawn(hotel, world) {
    const delay = this.calculateInterval(hotel, world);
    this.timer = setTimeout(() => {
      this.trySpawn(hotel, world);
      this.scheduleNextSpawn(hotel, world);
    }, delay);
  }
}

export default GuestSpawner;