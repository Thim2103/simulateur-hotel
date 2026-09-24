import { describe, it, expect, beforeEach } from 'vitest';
import { ReputationEngine } from './reputationEngine.js';

describe('ReputationEngine', () => {
    let engine;

    beforeEach(() => {
        engine = new ReputationEngine();
    });

    describe('constructor', () => {
        it('devrait initialiser avec les valeurs par défaut', () => {
            expect(engine.initialRating).toBe(3);
            expect(engine.priorWeight).toBe(10);
            expect(engine.reviews).toEqual([]);
            expect(engine.getReviewCount()).toBe(0);
        });

        it('devrait accepter une configuration personnalisée et borner la note de départ', () => {
            expect(new ReputationEngine({ initialRating: 4, priorWeight: 0 })).toMatchObject({ initialRating: 4, priorWeight: 0 });
            expect(new ReputationEngine({ initialRating: 9 }).initialRating).toBe(5);
            expect(new ReputationEngine({ initialRating: -2 }).initialRating).toBe(1);
        });
    });

    describe('addReview', () => {
        it('devrait enregistrer un avis valide', () => {
            const review = { guestId: 'g1', rating: 4, satisfaction: 73 };

            expect(engine.addReview(review)).toBe(true);
            expect(engine.getReviewCount()).toBe(1);
            expect(engine.reviews).toEqual([review]);
        });

        it('devrait ignorer les avis sans note valide', () => {
            expect(engine.addReview(null)).toBe(false);
            expect(engine.addReview({})).toBe(false);
            expect(engine.addReview({ rating: 'abc' })).toBe(false);
            expect(engine.getReviewCount()).toBe(0);
        });

        it('devrait borner la note entre 1 et 5', () => {
            engine.addReview({ rating: 0 });
            engine.addReview({ rating: 8 });

            expect(engine.reviews.map((r) => r.rating)).toEqual([1, 5]);
        });
    });

    describe('getAverageRating', () => {
        it('devrait retourner null sans avis', () => {
            expect(engine.getAverageRating()).toBeNull();
        });

        it('devrait calculer la moyenne réelle arrondie au centième', () => {
            [5, 4, 4].forEach((rating) => engine.addReview({ rating }));

            expect(engine.getAverageRating()).toBe(4.33);
        });
    });

    describe('getReputation', () => {
        it('devrait valoir 50 sans avis avec une note de départ de 3', () => {
            expect(engine.getReputation()).toBe(50);
        });

        it('devrait convertir la note en réputation 0-100 sans lissage', () => {
            const raw = new ReputationEngine({ priorWeight: 0 });
            raw.addReview({ rating: 1 });
            expect(raw.getReputation()).toBe(0);

            raw.addReview({ rating: 5 });
            expect(raw.getReputation()).toBe(50);

            raw.addReview({ rating: 5 });
            raw.addReview({ rating: 5 });
            expect(raw.getReputation()).toBe(75); // moyenne 4
        });

        it('devrait amortir l\'effet d\'un avis isolé grâce à la note de départ', () => {
            engine.addReview({ rating: 5 });

            // (5 + 3 x 10) / 11 = 3.18 -> 55
            expect(engine.getWeightedRating()).toBeCloseTo(3.18, 2);
            expect(engine.getReputation()).toBe(55);
        });

        it('devrait tendre vers la note réelle avec de nombreux avis', () => {
            for (let i = 0; i < 200; i++) engine.addReview({ rating: 5 });

            expect(engine.getReputation()).toBeGreaterThanOrEqual(98);
        });

        it('devrait baisser avec des avis négatifs', () => {
            for (let i = 0; i < 10; i++) engine.addReview({ rating: 1 });

            // (10 + 30) / 20 = 2 -> 25
            expect(engine.getReputation()).toBe(25);
        });
    });

    describe('getAttractiveness', () => {
        it('devrait valoir 1 pour une réputation de 50', () => {
            expect(engine.getAttractiveness()).toBe(1);
        });

        it('devrait suivre la réputation', () => {
            const raw = new ReputationEngine({ priorWeight: 0 });
            raw.addReview({ rating: 5 });
            expect(raw.getAttractiveness()).toBe(2);
        });

        it('ne devrait jamais descendre sous 0.1', () => {
            const raw = new ReputationEngine({ priorWeight: 0 });
            raw.addReview({ rating: 1 });
            expect(raw.getAttractiveness()).toBe(0.1);
        });
    });
});
