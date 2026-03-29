/**
 * ActionRouter (Shared)
 * Stateless router that handles action validation and execution.
 * 
 * This is used by both:
 * - Server: wrapped by server/ActionRouter for persistence
 * - Client (CPU): used directly in useLocalGame
 * 
 * Responsibilities:
 * - Validates action type is registered
 * - Validates it's the player's turn
 * - Uses SmartRouter to determine the correct handler
 * - Executes the handler
 * - Returns new state
 */

const Router = require('./smart-router/Router');

// Actions that don't require turn validation in party mode
// Also includes tournament qualification review advancement (any player can trigger)
const OUT_OF_TURN_ACTIONS = ['shiya', 'recall', 'advanceFromQualificationReview'];

/**
 * Creates an ActionRouter with the given handlers.
 * @param {object} config - Configuration object
 * @param {object} config.handlers - Map of action type to handler function
 * @returns {object} ActionRouter instance
 */
function createActionRouter(config) {
  const { handlers = {} } = config;
  
  const router = {
    /**
     * Execute an action on the given state.
     * @param {object} state - Current game state
     * @param {number} playerIndex - Player making the action
     * @param {string} actionType - Type of action
     * @param {object} payload - Action payload
     * @returns {object} New game state
     * @throws if action type is unknown or not player's turn
     */
    executeAction(state, playerIndex, actionType, payload) {
      // 0. Guard: game is already over
      if (state.gameOver) {
        throw new Error('Game is over - no more actions allowed');
      }

      // 1. Guard: unknown action
      if (!handlers[actionType]) {
        const known = Object.keys(handlers).join(', ') || '(none registered yet)';
        throw new Error(`Unknown action "${actionType}". Registered: ${known}`);
      }

      // 2. Guard: wrong player's turn (skip for certain actions in party mode or tournament qualification)
      const isPartyMode = state.playerCount === 4;
      const isOutOfTurnAction = OUT_OF_TURN_ACTIONS.includes(actionType);
      // Also allow during tournament qualification review phase
      const isQualificationReview = state.tournamentPhase === 'QUALIFICATION_REVIEW';
      const canActOutOfTurn = (isPartyMode && isOutOfTurnAction) || isQualificationReview;
      
      console.log(`[ActionRouter] Turn check: playerCount=${state.playerCount}, actionType=${actionType}, isPartyMode=${isPartyMode}, isOutOfTurnAction=${isOutOfTurnAction}, isQualificationReview=${isQualificationReview}, canActOutOfTurn=${canActOutOfTurn}, currentPlayer=${state.currentPlayer}, playerIndex=${playerIndex}`);
      
      if (!canActOutOfTurn && state.currentPlayer !== playerIndex) {
        throw new Error(`Not your turn (current: ${state.currentPlayer}, your: ${playerIndex})`);
      }

      // 3. Smart routing: let Router decide what handler to call
      const router = new Router();
      const { type: finalType, payload: finalPayload } = router.route(
        actionType,
        payload || {},
        state,
        playerIndex
      );

      console.log(`[ActionRouter] Router routed "${actionType}" → "${finalType}"`);

      // 4. Check if handler exists
      const handler = handlers[finalType];
      if (!handler) {
        console.log(`[ActionRouter] No handler for "${finalType}" - returning state unchanged`);
        return state;
      }

      // 5. Execute handler — pure function returns new state
      const newState = handler(state, finalPayload || {}, playerIndex);

      return newState;
    },

    /**
     * Returns true if an action type is registered.
     */
    supports(actionType) {
      return Boolean(handlers[actionType]);
    },

    /**
     * List all registered action types (useful for debugging).
     */
    registeredActions() {
      return Object.keys(handlers);
    }
  };

  return router;
}

module.exports = {
  createActionRouter,
  Router
};
