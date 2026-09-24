import { describe, it, expect, beforeEach } from 'vitest';
import { EconomyEngine } from './economyEngine.js';

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