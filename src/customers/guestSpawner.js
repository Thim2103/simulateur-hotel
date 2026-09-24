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
    this.onReview = options.onReview || (() => {});
    this.reviews = []; // Avis laissés par les clients au check-out
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
   * Fait avancer tous les agents clients d'un pas de simulation, enregistre
   * le cycle financier dans l'EconomyEngine s'il est configuré, puis décompte
   * une nuit par client et fait partir ceux dont le séjour est terminé.
   * La facturation précède le décompte : la dernière nuit est donc bien facturée.
   * @param {Object} [context={}]
   * @returns {Object|null} Le bilan financier du cycle, ou null sans EconomyEngine.
   */
  update(context = {}) {
    this.guests.forEach((guest) => guest.update(context));
    const report = this.recordEconomy(context);
    this.processNights(context);
    return report;
  }

  /**
   * Décrémente le nombre de nuits restantes de chaque client et déclenche
   * le check-out de ceux qui arrivent à 0. Les clients sans nombre de nuits
   * valide ne sont pas concernés.
   * @param {Object} [context={}]
   * @returns {Object[]} Les avis émis lors des départs de ce cycle.
   */
  processNights(context = {}) {
    const departing = [];
    this.guests.forEach((guest) => {
      const { nights } = guest.getState();
      if (!Number.isFinite(nights)) return;
      const remaining = Math.max(0, nights - 1);
      guest.setState({ nights: remaining });
      if (remaining === 0) departing.push(guest);
    });
    return departing.map((guest) => this.checkout(guest, context));
  }

  /**
   * Fait partir un client : libère sa chambre, calcule sa satisfaction finale,
   * émet son avis puis le retire des clients actifs.
   * @param {Agent} guest
   * @param {Object} [context={}]
   * @returns {{guestId: string, profile: string, satisfaction: number, rating: number, tick: *}} L'avis du client.
   */
  checkout(guest, context = {}) {
    const hotel = context.hotel;
    if (hotel && typeof hotel.releaseRoom === 'function') {
      hotel.releaseRoom(guest);
    }

    const satisfaction = this.computeFinalSatisfaction(guest);
    const review = {
      guestId: guest.id,
      profile: guest.getState().profile,
      satisfaction,
      rating: GuestSpawner.satisfactionToRating(satisfaction),
      tick: context.tick
    };

    guest.setState({ status: 'checked-out', satisfaction });
    guest.emit('checkout', review);
    this.reviews.push(review);
    this.onReview(review, guest);
    this.removeGuest(guest.id);
    return review;
  }

  /**
   * Satisfaction finale du client, bornée entre 0 et 100 (50 par défaut).
   * @param {Agent} guest
   * @returns {number}
   */
  computeFinalSatisfaction(guest) {
    const { satisfaction } = guest.getState();
    const value = Number.isFinite(satisfaction) ? satisfaction : 50;
    return Math.round(Math.min(100, Math.max(0, value)));
  }

  /**
   * Convertit une satisfaction (0 à 100) en note d'avis de 1 à 5 étoiles.
   * @param {number} satisfaction
   * @returns {number}
   */
  static satisfactionToRating(satisfaction) {
    return Math.min(5, Math.max(1, Math.ceil(satisfaction / 20)));
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
