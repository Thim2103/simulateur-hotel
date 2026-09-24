/**
 * @module EconomyEngine
 * @description Gère les flux financiers, calcule le taux d'occupation et les revenus de l'hôtel.
 */

/**
 * Comportement de dépense par profil client, appliqué au budget individuel (par nuit) :
 * - priceTolerance : multiplicateur du budget donnant le prix de chambre maximal accepté ;
 * - extrasPropensity : part du budget restant après la chambre dépensée en extras chaque nuit.
 * Les profils inconnus (ex: 'tourist') utilisent DEFAULT_SPENDING_PROFILE.
 */
export const SPENDING_PROFILES = Object.freeze({
    vip: Object.freeze({ priceTolerance: 1.5, extrasPropensity: 0.5 }),
    business: Object.freeze({ priceTolerance: 1.25, extrasPropensity: 0.3 }),
    family: Object.freeze({ priceTolerance: 1.1, extrasPropensity: 0.25 }),
    budget: Object.freeze({ priceTolerance: 1, extrasPropensity: 0.05 })
});

export const DEFAULT_SPENDING_PROFILE = Object.freeze({ priceTolerance: 1.1, extrasPropensity: 0.15 });

export class EconomyEngine {
    /**
     * @param {Object} [config={}] - Configuration initiale de l'économie.
     * @param {number} [config.baseRoomPrice=100] - Prix de base par nuit d'une chambre.
     * @param {number} [config.baseDailyCost=500] - Coûts fixes journaliers (maintenance, salaires, etc.).
     */
    constructor(config = {}) {
        this.baseRoomPrice = config.baseRoomPrice || 100;
        this.baseDailyCost = config.baseDailyCost || 500;
        this.treasury = config.initialTreasury || 5000;
        
        // Historique financier
        this.history = [];
    }

    /**
     * Calcule le taux d'occupation actuel de l'hôtel.
     * @param {number} totalRooms - Nombre total de chambres disponibles.
     * @param {number} occupiedRooms - Nombre de chambres actuellement occupées.
     * @returns {number} Le taux d'occupation en pourcentage (0 à 100).
     */
    calculateOccupancyRate(totalRooms, occupiedRooms) {
        if (!totalRooms || totalRooms <= 0) return 0;
        const rate = (occupiedRooms / totalRooms) * 100;
        return Math.min(Math.max(rate, 0), 100);
    }

    /**
     * Calcule les revenus générés par les chambres pour une période donnée.
     * @param {number} occupiedRooms - Nombre de chambres occupées.
     * @param {number} [customPrice] - Prix personnalisé par chambre (optionnel).
     * @returns {number} Le revenu total généré.
     */
    calculateRoomRevenue(occupiedRooms, customPrice = null) {
        const price = customPrice !== null ? customPrice : this.baseRoomPrice;
        return Math.max(0, occupiedRooms * price);
    }

    /**
     * Comportement de dépense associé à un profil client (insensible à la casse).
     * @param {string} [profile]
     * @returns {{priceTolerance: number, extrasPropensity: number}}
     */
    getSpendingProfile(profile) {
        const key = typeof profile === 'string' ? profile.toLowerCase() : '';
        return SPENDING_PROFILES[key] || DEFAULT_SPENDING_PROFILE;
    }

    /**
     * Prix de chambre maximal qu'un client accepte de payer : budget x tolérance du profil.
     * @param {Object} guest - État du client ({ profile, budget }).
     * @returns {number} Infinity si le budget n'est pas renseigné.
     */
    getMaxAcceptablePrice(guest = {}) {
        if (!Number.isFinite(guest.budget)) return Infinity;
        return guest.budget * this.getSpendingProfile(guest.profile).priceTolerance;
    }

    /**
     * Indique si le client accepte le prix de la chambre.
     * @param {Object} guest - État du client ({ profile, budget }).
     * @param {number} [price] - Prix de la chambre (baseRoomPrice par défaut).
     * @returns {boolean}
     */
    acceptsRoomPrice(guest, price = this.baseRoomPrice) {
        return price <= this.getMaxAcceptablePrice(guest);
    }

    /**
     * Montant d'extras dépensé par un client pour une nuit : part du budget restant
     * après la chambre, selon la propension du profil. Nul si le budget est absent
     * ou entièrement absorbé par le prix de la chambre.
     * @param {Object} guest - État du client ({ profile, budget }).
     * @param {number} [price] - Prix de la chambre (baseRoomPrice par défaut).
     * @returns {number}
     */
    calculateExtrasSpending(guest = {}, price = this.baseRoomPrice) {
        if (!Number.isFinite(guest.budget)) return 0;
        const remaining = Math.max(0, guest.budget - price);
        return Math.round(remaining * this.getSpendingProfile(guest.profile).extrasPropensity);
    }

    /**
     * Traite un cycle financier journalier (revenus, dépenses, mise à jour de la trésorerie).
     * @param {Object} hotelState - État actuel de l'hôtel.
     * @param {number} hotelState.totalRooms - Total des chambres.
     * @param {number} hotelState.occupiedRooms - Chambres occupées.
     * @param {number} [hotelState.extraRevenue=0] - Revenus supplémentaires (restaurant, spa, etc.).
     * @param {number} [hotelState.extraCosts=0] - Coûts variables supplémentaires.
     * @returns {Object} Le bilan financier de la journée.
     */
    processDailyTick(hotelState) {
        const {
            totalRooms = 0,
            occupiedRooms = 0,
            extraRevenue = 0,
            extraCosts = 0
        } = hotelState;

        const occupancyRate = this.calculateOccupancyRate(totalRooms, occupiedRooms);
        const roomRevenue = this.calculateRoomRevenue(occupiedRooms);
        
        const totalRevenue = roomRevenue + extraRevenue;
        const totalCosts = this.baseDailyCost + extraCosts;
        const netIncome = totalRevenue - totalCosts;

        // Mise à jour de la trésorerie
        this.treasury += netIncome;

        const dailyReport = {
            occupancyRate,
            roomRevenue,
            extraRevenue,
            totalRevenue,
            baseDailyCost: this.baseDailyCost,
            extraCosts,
            totalCosts,
            netIncome,
            treasury: this.treasury,
            timestamp: Date.now()
        };

        this.history.push(dailyReport);

        return dailyReport;
    }

    /**
     * Ajoute ou retire des fonds manuellement de la trésorerie (ex: emprunt, amende, subvention).
     * @param {number} amount - Montant à ajouter (positif) ou retirer (négatif).
     * @returns {number} La nouvelle trésorerie.
     */
    adjustTreasury(amount) {
        this.treasury += amount;
        return this.treasury;
    }

    /**
     * Récupère l'état actuel de la trésorerie.
     * @returns {number}
     */
    getTreasury() {
        return this.treasury;
    }
}