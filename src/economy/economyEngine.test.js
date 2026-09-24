import { describe, it, expect, beforeEach } from 'vitest';
import { EconomyEngine, SPENDING_PROFILES, DEFAULT_SPENDING_PROFILE } from './economyEngine.js';

describe('EconomyEngine', () => {
    let engine;

    beforeEach(() => {
        engine = new EconomyEngine();
    });

    describe('Constructor & Configuration', () => {
        it('should initialize with default values when no config is provided', () => {
            expect(engine.baseRoomPrice).toBe(100);
            expect(engine.baseDailyCost).toBe(500);
            expect(engine.treasury).toBe(5000);
            expect(engine.history).toEqual([]);
        });

        it('should initialize with custom config values', () => {
            const customEngine = new EconomyEngine({
                baseRoomPrice: 150,
                baseDailyCost: 800,
                initialTreasury: 10000
            });

            expect(customEngine.baseRoomPrice).toBe(150);
            expect(customEngine.baseDailyCost).toBe(800);
            expect(customEngine.treasury).toBe(10000);
        });
    });

    describe('calculateOccupancyRate', () => {
        it('should calculate correct occupancy rate percentage', () => {
            expect(engine.calculateOccupancyRate(100, 50)).toBe(50);
            expect(engine.calculateOccupancyRate(200, 50)).toBe(25);
            expect(engine.calculateOccupancyRate(50, 50)).toBe(100);
        });

        it('should return 0 if totalRooms is 0 or negative', () => {
            expect(engine.calculateOccupancyRate(0, 10)).toBe(0);
            expect(engine.calculateOccupancyRate(-10, 5)).toBe(0);
        });

        it('should clamp the occupancy rate between 0 and 100', () => {
            expect(engine.calculateOccupancyRate(100, 150)).toBe(100);
            expect(engine.calculateOccupancyRate(100, -20)).toBe(0);
        });
    });

    describe('calculateRoomRevenue', () => {
        it('should calculate revenue using base room price by default', () => {
            // baseRoomPrice = 100 by default
            expect(engine.calculateRoomRevenue(5)).toBe(500);
            expect(engine.calculateRoomRevenue(0)).toBe(0);
        });

        it('should calculate revenue using custom price when provided', () => {
            expect(engine.calculateRoomRevenue(5, 200)).toBe(1000);
        });

        it('should not return negative revenue', () => {
            expect(engine.calculateRoomRevenue(-5, 100)).toBe(0);
        });
    });

    describe('Spending profiles', () => {
        it('should expose a spending profile for VIP, Business, Family and Budget guests', () => {
            expect(Object.keys(SPENDING_PROFILES)).toEqual(['vip', 'business', 'family', 'budget']);
            expect(engine.getSpendingProfile('vip')).toBe(SPENDING_PROFILES.vip);
            expect(engine.getSpendingProfile('Business')).toBe(SPENDING_PROFILES.business);
        });

        it('should rank price tolerance and extras propensity from VIP down to Budget', () => {
            const profiles = ['vip', 'business', 'family', 'budget'].map((p) => engine.getSpendingProfile(p));
            const tolerances = profiles.map((p) => p.priceTolerance);
            const propensities = profiles.map((p) => p.extrasPropensity);

            expect(tolerances).toEqual([...tolerances].sort((a, b) => b - a));
            expect(propensities).toEqual([...propensities].sort((a, b) => b - a));
        });

        it('should fall back to the default profile for unknown or missing profiles', () => {
            expect(engine.getSpendingProfile('tourist')).toBe(DEFAULT_SPENDING_PROFILE);
            expect(engine.getSpendingProfile(undefined)).toBe(DEFAULT_SPENDING_PROFILE);
            expect(engine.getSpendingProfile(42)).toBe(DEFAULT_SPENDING_PROFILE);
        });
    });

    describe('getMaxAcceptablePrice & acceptsRoomPrice', () => {
        it('should compute the max price as budget x profile tolerance', () => {
            expect(engine.getMaxAcceptablePrice({ profile: 'vip', budget: 100 })).toBe(150);
            expect(engine.getMaxAcceptablePrice({ profile: 'business', budget: 100 })).toBe(125);
            expect(engine.getMaxAcceptablePrice({ profile: 'family', budget: 100 })).toBeCloseTo(110);
            expect(engine.getMaxAcceptablePrice({ profile: 'budget', budget: 100 })).toBe(100);
        });

        it('should accept the base room price only within the guest tolerance', () => {
            // Budget 80 face au prix de base 100
            expect(engine.acceptsRoomPrice({ profile: 'vip', budget: 80 })).toBe(true); // 120
            expect(engine.acceptsRoomPrice({ profile: 'business', budget: 80 })).toBe(true); // 100
            expect(engine.acceptsRoomPrice({ profile: 'family', budget: 80 })).toBe(false); // 88
            expect(engine.acceptsRoomPrice({ profile: 'budget', budget: 80 })).toBe(false); // 80
        });

        it('should use a custom price when provided', () => {
            expect(engine.acceptsRoomPrice({ profile: 'budget', budget: 80 }, 80)).toBe(true);
            expect(engine.acceptsRoomPrice({ profile: 'vip', budget: 80 }, 121)).toBe(false);
        });

        it('should accept any price when the budget is unknown', () => {
            expect(engine.getMaxAcceptablePrice({ profile: 'budget' })).toBe(Infinity);
            expect(engine.acceptsRoomPrice({}, 10000)).toBe(true);
        });
    });

    describe('calculateExtrasSpending', () => {
        it('should spend a share of the budget left after the room, by profile', () => {
            // 200 - 100 = 100 restant
            expect(engine.calculateExtrasSpending({ profile: 'vip', budget: 200 })).toBe(50);
            expect(engine.calculateExtrasSpending({ profile: 'business', budget: 200 })).toBe(30);
            expect(engine.calculateExtrasSpending({ profile: 'family', budget: 200 })).toBe(25);
            expect(engine.calculateExtrasSpending({ profile: 'budget', budget: 200 })).toBe(5);
            expect(engine.calculateExtrasSpending({ profile: 'tourist', budget: 200 })).toBe(15);
        });

        it('should round the amount and use a custom price when provided', () => {
            expect(engine.calculateExtrasSpending({ profile: 'business', budget: 155 })).toBe(17); // 16.5
            expect(engine.calculateExtrasSpending({ profile: 'vip', budget: 200 }, 150)).toBe(25);
        });

        it('should return 0 when the room absorbs the budget or the budget is unknown', () => {
            expect(engine.calculateExtrasSpending({ profile: 'vip', budget: 100 })).toBe(0);
            expect(engine.calculateExtrasSpending({ profile: 'vip', budget: 60 })).toBe(0);
            expect(engine.calculateExtrasSpending({ profile: 'vip' })).toBe(0);
            expect(engine.calculateExtrasSpending()).toBe(0);
        });
    });

    describe('processDailyTick', () => {
        it('should process daily finances correctly and update treasury and history', () => {
            const initialState = {
                totalRooms: 10,
                occupiedRooms: 5, // Revenue = 5 * 100 = 500
                extraRevenue: 200,
                extraCosts: 100
            };

            // Total Revenue = 500 + 200 = 700
            // Total Costs = 500 (base) + 100 = 600
            // Net Income = 700 - 600 = 100
            // New Treasury = 5000 + 100 = 5100

            const report = engine.processDailyTick(initialState);

            expect(report.occupancyRate).toBe(50);
            expect(report.roomRevenue).toBe(500);
            expect(report.extraRevenue).toBe(200);
            expect(report.totalRevenue).toBe(700);
            expect(report.baseDailyCost).toBe(500);
            expect(report.extraCosts).toBe(100);
            expect(report.totalCosts).toBe(600);
            expect(report.netIncome).toBe(100);
            expect(report.treasury).toBe(5100);
            expect(report.timestamp).toBeTypeOf('number');

            expect(engine.getTreasury()).toBe(5100);
            expect(engine.history).toHaveLength(1);
            expect(engine.history[0]).toEqual(report);
        });

        it('should handle missing hotelState properties by falling back to defaults', () => {
            const report = engine.processDailyTick({});

            // Total Rooms = 0, Occupied = 0 -> Revenue = 0
            // Base Cost = 500, Extra = 0 -> Costs = 500
            // Net Income = 0 - 500 = -500
            // Treasury = 5000 - 500 = 4500

            expect(report.occupancyRate).toBe(0);
            expect(report.roomRevenue).toBe(0);
            expect(report.totalRevenue).toBe(0);
            expect(report.totalCosts).toBe(500);
            expect(report.netIncome).toBe(-500);
            expect(report.treasury).toBe(4500);
            expect(engine.history).toHaveLength(1);
        });
    });

    describe('adjustTreasury', () => {
        it('should increase treasury when positive amount is added', () => {
            const newTreasury = engine.adjustTreasury(1000);
            expect(newTreasury).toBe(6000);
            expect(engine.getTreasury()).toBe(6000);
        });

        it('should decrease treasury when negative amount is added', () => {
            const newTreasury = engine.adjustTreasury(-1500);
            expect(newTreasury).toBe(3500);
            expect(engine.getTreasury()).toBe(3500);
        });
    });

    describe('getTreasury', () => {
        it('should return the current treasury value', () => {
            expect(engine.getTreasury()).toBe(5000);
            engine.adjustTreasury(250);
            expect(engine.getTreasury()).toBe(5250);
        });
    });
});