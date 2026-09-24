import { Agent } from '../agents/Agent.js';
import { generateCustomer } from './customerGenerator.js';

export class GuestSpawner {
  constructor(options = {}) {
    this.baseSpawnRate = options.baseSpawnRate || 10000; // en millisecondes
    this.minSpawnRate = options.minSpawnRate || 2000;
    this.timer = null;
    this.onSpawn = options.onSpawn || (() => {});
    this.guests = new Map(); // id -> Agent client actif
    this.economy = options.economy || null; // EconomyEngine (optionnel)
    this.costPerGuest = options.costPerGuest ?? 20; // Coût d'exploitation par chambre occupée et par cycle
  }

  /**
   * Démarre le générateur de clients.
   * @param {Object} hotel - L'instance de l'hôtel.
   * @param {Object} world - L'instance du monde (contient la saisonnalité, météo, etc.).
   */
  start(hotel, world) {
    if (this.timer) return;
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
   * Crée un agent client à partir des données produites par generateCustomer.
   * @param {Object} customer - Données brutes du client.
   * @returns {Agent}
   */
  createGuestAgent(customer) {
    const { id, ...data } = customer;
    return new Agent({ id, type: 'customer', state: { ...data, status: 'arriving' } });
  }

  /**
   * Tente de générer un client et l'ajoute si les conditions sont réunies.
   * @returns {Agent|null} L'agent client créé, ou null si aucune chambre n'est disponible.
   */
  trySpawn(hotel, world) {
    // Vérifier si l'hôtel a de la place (optionnel selon la logique du jeu)
    if (hotel && typeof hotel.hasAvailableRooms === 'function' && !hotel.hasAvailableRooms()) {
      return null;
    }

    const customer = generateCustomer({
      reputation: hotel?.reputation || 50,
      season: world?.currentSeason || 'normal'
    });

    const guest = this.createGuestAgent(customer);
    this.guests.set(guest.id, guest);
    this.onSpawn(guest);
    return guest;
  }

  /**
   * Retourne la liste des agents clients actifs.
   * @returns {Agent[]}
   */
  getGuests() {
    return [...this.guests.values()];
  }

  /**
   * @param {string} id
   * @returns {Agent|undefined}
   */
  getGuest(id) {
    return this.guests.get(id);
  }

  /**
   * Retire un client (départ, annulation...).
   * @param {string} id
   * @returns {boolean} true si le client existait.
   */
  removeGuest(id) {
    return this.guests.delete(id);
  }

  /**
   * Fait avancer tous les agents clients d'un pas de simulation, puis enregistre
   * le cycle financier dans l'EconomyEngine s'il est configuré.
   * @param {Object} [context={}]
   * @returns {Object|null} Le bilan financier du cycle, ou null sans EconomyEngine.
   */
  update(context = {}) {
    this.guests.forEach((guest) => guest.update(context));
    return this.recordEconomy(context);
  }

  /**
   * Facture les chambres occupées et les extras consommés par les clients,
   * et impute les dépenses d'exploitation liées à l'occupation.
   * Les extras (state.extras) sont remis à zéro une fois facturés.
   * @param {Object} [context={}]
   * @returns {Object|null}
   */
  recordEconomy(context = {}) {
    if (!this.economy) return null;

    const guests = this.getGuests();
    let extraRevenue = 0;
    guests.forEach((guest) => {
      const extras = guest.getState().extras || 0;
      if (extras > 0) {
        extraRevenue += extras;
        guest.setState({ extras: 0 });
      }
    });

    const occupiedRooms = guests.length;
    return this.economy.processDailyTick({
      totalRooms: context.hotel?.totalRooms || 0,
      occupiedRooms,
      extraRevenue,
      extraCosts: occupiedRooms * this.costPerGuest
    });
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
