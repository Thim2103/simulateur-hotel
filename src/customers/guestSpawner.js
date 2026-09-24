import { Agent } from '../agents/Agent.js';
import { generateCustomer, PROFILES } from './customerGenerator.js';

export class GuestSpawner {
  constructor(options = {}) {
    this.baseSpawnRate = options.baseSpawnRate || 10000; // en millisecondes
    this.minSpawnRate = options.minSpawnRate || 2000;
    this.timer = null;
    this.onSpawn = options.onSpawn || (() => {});
    this.guests = new Map(); // id -> Agent client actif
    this.economy = options.economy || null; // EconomyEngine (optionnel)
    this.costPerGuest = options.costPerGuest ?? 20; // Coût d'exploitation par chambre occupée et par cycle
    this.reputation = options.reputation || null; // ReputationEngine (optionnel)
    this.onReview = options.onReview || (() => {});
    this.reviews = []; // Avis laissés par les clients au check-out
    this.onReject = options.onReject || (() => {});
    this.rejectedCount = 0; // Clients repartis car le prix de la chambre dépassait leur tolérance
    this.profileCounts = {}; // Nombre de clients accueillis par clé de profil
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
   * Réputation courante de l'hôtel (0 à 100) : celle du ReputationEngine s'il est
   * configuré, sinon hotel.reputation (50 par défaut).
   * @param {Object} [hotel]
   * @returns {number}
   */
  getReputation(hotel) {
    if (this.reputation) return this.reputation.getReputation();
    return hotel?.reputation || 50;
  }

  /**
   * Calcule le délai avant la prochaine tentative d'apparition basé sur la réputation et la saison.
   */
  calculateInterval(hotel, world) {
    const seasonalityModifier = world?.getSeasonalityMultiplier() || 1.0; // Ex: 0.5 (hiver/basse) à 2.0 (été/haute)
    const attractiveness = this.reputation
      ? this.reputation.getAttractiveness()
      : this.getReputation(hotel) / 50;

    // Plus la réputation est haute et la saison favorable, plus l'intervalle est court
    const effectiveRate = attractiveness * seasonalityModifier;
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
   * Avec un EconomyEngine, le client n'est retenu que si le prix de la chambre
   * reste dans sa tolérance (budget x profil) ; sinon onReject est appelé.
   * @returns {Agent|null} L'agent client créé, ou null si aucune chambre n'est disponible
   * ou si le client refuse le prix.
   */
  trySpawn(hotel, world) {
    // Vérifier si l'hôtel a de la place (optionnel selon la logique du jeu)
    if (hotel && typeof hotel.hasAvailableRooms === 'function' && !hotel.hasAvailableRooms()) {
      return null;
    }

    const customer = generateCustomer({
      reputation: this.getReputation(hotel),
      season: world?.currentSeason || 'normal'
    });

    const guest = this.createGuestAgent(customer);
    if (this.economy && !this.economy.acceptsRoomPrice(guest.getState())) {
      this.rejectedCount += 1;
      guest.setState({ status: 'rejected' });
      this.onReject(guest, {
        price: this.economy.baseRoomPrice,
        maxPrice: this.economy.getMaxAcceptablePrice(guest.getState())
      });
      return null;
    }

    this.guests.set(guest.id, guest);
    const { profile } = guest.getState();
    this.profileCounts[profile] = (this.profileCounts[profile] || 0) + 1;
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
   * émet son avis puis le retire des clients actifs. L'avis est transmis au
   * ReputationEngine s'il est configuré, et la nouvelle réputation est reportée
   * sur hotel.reputation.
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
    this.recordReview(review, hotel);
    this.onReview(review, guest);
    this.removeGuest(guest.id);
    return review;
  }

  /**
   * Transmet un avis au ReputationEngine et synchronise sur l'hôtel la réputation,
   * la note moyenne des avis et l'attractivité.
   * @param {Object} review
   * @param {Object} [hotel]
   * @returns {number|null} La nouvelle réputation, ou null sans ReputationEngine.
   */
  recordReview(review, hotel) {
    if (!this.reputation) return null;
    this.reputation.addReview(review);
    const reputation = this.reputation.getReputation();
    if (hotel) {
      hotel.reputation = reputation;
      hotel.averageRating = this.reputation.getAverageRating();
      hotel.attractiveness = this.reputation.getAttractiveness();
    }
    return reputation;
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
   * Chaque client dépense en plus, pour la nuit, des extras calculés par
   * l'EconomyEngine selon son budget et son profil. Les extras (state.extras)
   * sont remis à zéro une fois facturés.
   * @param {Object} [context={}]
   * @returns {Object|null}
   */
  recordEconomy(context = {}) {
    if (!this.economy) return null;

    const guests = this.getGuests();
    let extraRevenue = 0;
    guests.forEach((guest) => {
      const state = guest.getState();
      const extras = (state.extras || 0) + this.economy.calculateExtrasSpending(state);
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

  /**
   * Note moyenne des avis (1 à 5, arrondie au centième) : celle du ReputationEngine
   * s'il est configuré, sinon celle des avis collectés par le spawner.
   * @returns {number|null} null tant qu'aucun avis n'a été reçu.
   */
  getAverageRating() {
    if (this.reputation) return this.reputation.getAverageRating();
    if (!this.reviews.length) return null;
    const sum = this.reviews.reduce((total, review) => total + review.rating, 0);
    return Math.round((sum / this.reviews.length) * 100) / 100;
  }

  /**
   * Répartition des clients accueillis (hors refus) par profil, dans l'ordre fixe de PROFILES.
   * @returns {Array<{key: string, label: string, count: number, share: number}>} share entre 0 et 1.
   */
  getProfileDistribution() {
    const total = Object.values(this.profileCounts).reduce((sum, count) => sum + count, 0);
    return Object.values(PROFILES).map(({ key, label }) => {
      const count = this.profileCounts[key] || 0;
      return { key, label, count, share: total ? count / total : 0 };
    });
  }

  /**
   * Instantané des indicateurs de clientèle pour le tableau de bord.
   * @param {Object} [hotel]
   * @returns {{averageRating: number|null, reviewCount: number, reputation: number, attractiveness: number, rejectedCount: number, welcomedCount: number, profileDistribution: Array}}
   */
  getStats(hotel) {
    const reputation = this.getReputation(hotel);
    const profileDistribution = this.getProfileDistribution();
    return {
      averageRating: this.getAverageRating(),
      reviewCount: this.reputation ? this.reputation.getReviewCount() : this.reviews.length,
      reputation,
      attractiveness: this.reputation ? this.reputation.getAttractiveness() : Math.max(0.1, reputation / 50),
      rejectedCount: this.rejectedCount,
      welcomedCount: profileDistribution.reduce((sum, { count }) => sum + count, 0),
      profileDistribution
    };
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
