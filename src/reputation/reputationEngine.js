/**
 * @module ReputationEngine
 * @description Agrège les avis clients (1 à 5 étoiles) pour calculer la note moyenne
 * de l'hôtel, sa réputation (0 à 100) et son attractivité.
 */

const MIN_RATING = 1;
const MAX_RATING = 5;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export class ReputationEngine {
    /**
     * @param {Object} [config={}]
     * @param {number} [config.initialRating=3] - Note de départ de l'hôtel, avant tout avis (1 à 5).
     * @param {number} [config.priorWeight=10] - Poids de la note de départ, en nombre d'avis fictifs.
     *   Plus il est élevé, moins un avis isolé fait varier la réputation.
     */
    constructor(config = {}) {
        this.initialRating = clamp(Number.isFinite(config.initialRating) ? config.initialRating : 3, MIN_RATING, MAX_RATING);
        this.priorWeight = Math.max(0, config.priorWeight ?? 10);

        // Historique des avis enregistrés
        this.reviews = [];
        this.ratingSum = 0;
    }

    /**
     * Enregistre un avis client. Les avis sans note valide sont ignorés.
     * La note est bornée entre 1 et 5.
     * @param {Object} review - Avis émis au check-out (voir GuestSpawner.checkout).
     * @param {number} review.rating - Note de 1 à 5.
     * @returns {boolean} true si l'avis a été pris en compte.
     */
    addReview(review) {
        const rating = Number(review?.rating);
        if (!Number.isFinite(rating)) return false;

        const bounded = clamp(rating, MIN_RATING, MAX_RATING);
        this.reviews.push({ ...review, rating: bounded });
        this.ratingSum += bounded;
        return true;
    }

    /**
     * @returns {number} Le nombre d'avis enregistrés.
     */
    getReviewCount() {
        return this.reviews.length;
    }

    /**
     * Note moyenne réelle des avis (1 à 5), arrondie au centième.
     * @returns {number|null} null tant qu'aucun avis n'a été reçu.
     */
    getAverageRating() {
        if (!this.reviews.length) return null;
        return Math.round((this.ratingSum / this.reviews.length) * 100) / 100;
    }

    /**
     * Note lissée : moyenne des avis pondérée avec la note de départ,
     * pour éviter qu'un premier avis fasse basculer la réputation.
     * @returns {number}
     */
    getWeightedRating() {
        const count = this.reviews.length;
        const totalWeight = count + this.priorWeight;
        if (totalWeight === 0) return this.initialRating;
        return (this.ratingSum + this.initialRating * this.priorWeight) / totalWeight;
    }

    /**
     * Réputation de l'hôtel (0 à 100) : 1 étoile = 0, 3 étoiles = 50, 5 étoiles = 100.
     * @returns {number}
     */
    getReputation() {
        const ratio = (this.getWeightedRating() - MIN_RATING) / (MAX_RATING - MIN_RATING);
        return Math.round(clamp(ratio * 100, 0, 100));
    }

    /**
     * Multiplicateur d'attractivité de l'hôtel : 1.0 pour une réputation de 50,
     * 2.0 pour 100, borné à 0.1 au minimum pour qu'un hôtel ne soit jamais totalement déserté.
     * @returns {number}
     */
    getAttractiveness() {
        return Math.max(0.1, this.getReputation() / 50);
    }
}

export default ReputationEngine;
