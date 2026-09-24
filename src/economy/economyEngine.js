/**
 * @module EconomyEngine
 * @description Gère les flux financiers, calcule le taux d'occupation et les revenus de l'hôtel.
 */

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