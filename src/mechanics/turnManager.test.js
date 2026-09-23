import { describe, it, expect } from 'vitest';
import {
  PHASES,
  createTurnState,
  getNextPhase,
  advancePhase,
  canExecuteAction,
} from './turnManager';

describe('Turn Manager Module', () => {
  describe('PHASES constant', () => {
    it('should contain the expected phase keys and values', () => {
      expect(PHASES).toEqual({
        PLANNING: 'PLANNING',
        PLACEMENT: 'PLACEMENT',
        CUSTOMERS: 'CUSTOMERS',
        END_OF_TURN: 'END_OF_TURN',
      });
    });

    it('should be a frozen object', () => {
      expect(Object.isFrozen(PHASES)).toBe(true);
    });
  });

  describe('createTurnState', () => {
    it('should initialize state with default turn 1 and PLANNING phase', () => {
      const state = createTurnState();
      expect(state).toEqual({
        currentTurn: 1,
        currentPhase: PHASES.PLANNING,
        isCompleted: false,
      });
    });

    it('should initialize state with a custom valid initial turn', () => {
      const state = createTurnState(5);
      expect(state).toEqual({
        currentTurn: 5,
        currentPhase: PHASES.PLANNING,
        isCompleted: false,
      });
    });

    it('should throw an error if initialTurn is less than 1', () => {
      expect(() => createTurnState(0)).toThrow('initialTurn must be an integer >= 1');
      expect(() => createTurnState(-3)).toThrow('initialTurn must be an integer >= 1');
    });

    it('should throw an error if initialTurn is not an integer', () => {
      expect(() => createTurnState(1.5)).toThrow('initialTurn must be an integer >= 1');
      expect(() => createTurnState('1')).toThrow('initialTurn must be an integer >= 1');
      expect(() => createTurnState(null)).toThrow('initialTurn must be an integer >= 1');
      expect(() => createTurnState(NaN)).toThrow('initialTurn must be an integer >= 1');
    });
  });

  describe('getNextPhase', () => {
    it('should correctly cycle through sequential phases', () => {
      expect(getNextPhase(PHASES.PLANNING)).toBe(PHASES.PLACEMENT);
      expect(getNextPhase(PHASES.PLACEMENT)).toBe(PHASES.CUSTOMERS);
      expect(getNextPhase(PHASES.CUSTOMERS)).toBe(PHASES.END_OF_TURN);
      expect(getNextPhase(PHASES.END_OF_TURN)).toBe(PHASES.PLANNING);
    });

    it('should throw an error for an unknown or invalid phase', () => {
      expect(() => getNextPhase('UNKNOWN_PHASE')).toThrow('Invalid phase');
      expect(() => getNextPhase('')).toThrow('Invalid phase');
      expect(() => getNextPhase(null)).toThrow('Invalid phase');
      expect(() => getNextPhase(undefined)).toThrow('Invalid phase');
    });
  });

  describe('advancePhase', () => {
    it('should advance phase within the same turn', () => {
      const initialState = createTurnState(1);

      const state2 = advancePhase(initialState);
      expect(state2).toEqual({
        currentTurn: 1,
        currentPhase: PHASES.PLACEMENT,
        isCompleted: false,
      });

      const state3 = advancePhase(state2);
      expect(state3).toEqual({
        currentTurn: 1,
        currentPhase: PHASES.CUSTOMERS,
        isCompleted: false,
      });

      const state4 = advancePhase(state3);
      expect(state4).toEqual({
        currentTurn: 1,
        currentPhase: PHASES.END_OF_TURN,
        isCompleted: true,
      });
    });

    it('should increment turn number and reset to PLANNING when transitioning from END_OF_TURN', () => {
      const stateAtEnd = {
        currentTurn: 1,
        currentPhase: PHASES.END_OF_TURN,
        isCompleted: true,
      };

      const nextTurnState = advancePhase(stateAtEnd);
      expect(nextTurnState).toEqual({
        currentTurn: 2,
        currentPhase: PHASES.PLANNING,
        isCompleted: false,
      });
    });

    it('should maintain immutability and not modify the input state', () => {
      const originalState = createTurnState(1);
      const frozenOriginalState = Object.freeze({ ...originalState });

      const newState = advancePhase(frozenOriginalState);

      expect(newState).not.toBe(frozenOriginalState);
      expect(newState.currentPhase).toBe(PHASES.PLACEMENT);
      expect(frozenOriginalState.currentPhase).toBe(PHASES.PLANNING);
    });

    it('should throw an error if input state is not a valid object', () => {
      expect(() => advancePhase(null)).toThrow('Invalid state: state must be an object');
      expect(() => advancePhase(undefined)).toThrow('Invalid state: state must be an object');
      expect(() => advancePhase('invalid')).toThrow('Invalid state: state must be an object');
      expect(() => advancePhase(123)).toThrow('Invalid state: state must be an object');
    });

    it('should throw an error if currentTurn in state is invalid', () => {
      expect(() => advancePhase({ currentTurn: 0, currentPhase: PHASES.PLANNING })).toThrow(
        'Invalid state: currentTurn must be an integer >= 1'
      );
      expect(() => advancePhase({ currentTurn: 1.5, currentPhase: PHASES.PLANNING })).toThrow(
        'Invalid state: currentTurn must be an integer >= 1'
      );
      expect(() => advancePhase({ currentTurn: '1', currentPhase: PHASES.PLANNING })).toThrow(
        'Invalid state: currentTurn must be an integer >= 1'
      );
    });

    it('should throw an error if currentPhase in state is unrecognized', () => {
      expect(() => advancePhase({ currentTurn: 1, currentPhase: 'INVALID' })).toThrow(
        'Invalid state: unknown currentPhase'
      );
    });
  });

  describe('canExecuteAction', () => {
    const validState = createTurnState(1); // currentPhase: PLANNING

    it('should return true when state currentPhase is included in allowedPhases', () => {
      const allowedPhases = [PHASES.PLANNING, PHASES.PLACEMENT];
      expect(canExecuteAction(validState, allowedPhases)).toBe(true);
    });

    it('should return false when state currentPhase is not included in allowedPhases', () => {
      const allowedPhases = [PHASES.PLACEMENT, PHASES.CUSTOMERS];
      expect(canExecuteAction(validState, allowedPhases)).toBe(false);
    });

    it('should return false when state is invalid or missing currentPhase', () => {
      expect(canExecuteAction(null, [PHASES.PLANNING])).toBe(false);
      expect(canExecuteAction(undefined, [PHASES.PLANNING])).toBe(false);
      expect(canExecuteAction('notAnObject', [PHASES.PLANNING])).toBe(false);
      expect(canExecuteAction({}, [PHASES.PLANNING])).toBe(false);
    });

    it('should return false when allowedPhases is not an array', () => {
      expect(canExecuteAction(validState, null)).toBe(false);
      expect(canExecuteAction(validState, undefined)).toBe(false);
      expect(canExecuteAction(validState, 'PLANNING')).toBe(false);
      expect(canExecuteAction(validState, { phase: PHASES.PLANNING })).toBe(false);
    });
  });
});