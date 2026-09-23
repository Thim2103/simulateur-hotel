/**
 * Turn Manager Module - Hospitality Lab
 * Handles turn state lifecycle, transitions, and phase validations.
 */

/**
 * Frozen object representing game phases.
 * @type {Readonly<{PLANNING: string, PLACEMENT: string, CUSTOMERS: string, END_OF_TURN: string}>}
 */
export const PHASES = Object.freeze({
  PLANNING: 'PLANNING',
  PLACEMENT: 'PLACEMENT',
  CUSTOMERS: 'CUSTOMERS',
  END_OF_TURN: 'END_OF_TURN',
});

/**
 * Validates a TurnState object.
 * @param {Object} state - The state object to validate.
 * @throws {Error} If state or any of its properties are invalid.
 */
function validateTurnState(state) {
  if (!state || typeof state !== 'object') {
    throw new Error('Invalid state: state must be an object');
  }
  if (!Number.isInteger(state.currentTurn) || state.currentTurn < 1) {
    throw new Error('Invalid state: currentTurn must be an integer >= 1');
  }
  if (!Object.values(PHASES).includes(state.currentPhase)) {
    throw new Error('Invalid state: unknown currentPhase');
  }
}

/**
 * Creates an initial TurnState object.
 * @param {number} [initialTurn=1] - Starting turn number (integer >= 1).
 * @returns {import('./turnManager').TurnState} The initialized state object.
 * @throws {Error} If initialTurn is not an integer >= 1.
 */
export function createTurnState(initialTurn = 1) {
  if (!Number.isInteger(initialTurn) || initialTurn < 1) {
    throw new Error('initialTurn must be an integer >= 1');
  }

  return {
    currentTurn: initialTurn,
    currentPhase: PHASES.PLANNING,
    isCompleted: false,
  };
}

/**
 * Pure function determining the next phase in sequence.
 * Cycle: PLANNING -> PLACEMENT -> CUSTOMERS -> END_OF_TURN -> PLANNING
 * @param {string} currentPhase - The active phase.
 * @returns {string} The next phase name.
 * @throws {Error} "Invalid phase" if currentPhase is not recognized.
 */
export function getNextPhase(currentPhase) {
  switch (currentPhase) {
    case PHASES.PLANNING:
      return PHASES.PLACEMENT;
    case PHASES.PLACEMENT:
      return PHASES.CUSTOMERS;
    case PHASES.CUSTOMERS:
      return PHASES.END_OF_TURN;
    case PHASES.END_OF_TURN:
      return PHASES.PLANNING;
    default:
      throw new Error('Invalid phase');
  }
}

/**
 * Advances the state to the next phase sequentially without mutating the original state.
 * @param {import('./turnManager').TurnState} state - The current turn state.
 * @returns {import('./turnManager').TurnState} A new updated state object.
 * @throws {Error} If the state parameter is invalid.
 */
export function advancePhase(state) {
  validateTurnState(state);

  const nextPhase = getNextPhase(state.currentPhase);
  const isLeavingEndOfTurn = state.currentPhase === PHASES.END_OF_TURN;

  const nextTurn = isLeavingEndOfTurn ? state.currentTurn + 1 : state.currentTurn;
  const isCompleted = nextPhase === PHASES.END_OF_TURN;

  return {
    currentTurn: nextTurn,
    currentPhase: nextPhase,
    isCompleted,
  };
}

/**
 * Checks if a domain action is permitted during the current phase.
 * @param {import('./turnManager').TurnState} state - The current turn state.
 * @param {Array<string>} allowedPhases - List of allowed phases for the action.
 * @returns {boolean} True if state.currentPhase is included in allowedPhases, false otherwise.
 */
export function canExecuteAction(state, allowedPhases) {
  if (!state || typeof state !== 'object' || !state.currentPhase) {
    return false;
  }
  if (!Array.isArray(allowedPhases)) {
    return false;
  }

  return allowedPhases.includes(state.currentPhase);
}