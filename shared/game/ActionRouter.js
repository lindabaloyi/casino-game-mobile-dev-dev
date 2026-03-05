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

const SmartRouter = require('./smart-router');

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
      // 1. Guard: unknown action
      if (!handlers[actionType]) {
        const known = Object.keys(handlers).join(', ') || '(none registered yet)';
        throw new Error(`Unknown action "${actionType}". Registered: ${known}`);
      }

      // 2. Guard: wrong player's turn
      if (state.currentPlayer !== playerIndex) {
        throw new Error(`Not your turn (current: ${state.currentPlayer}, your: ${playerIndex})`);
      }

      // 3. Smart routing: let SmartRouter decide what handler to call
      const smartRouter = new SmartRouter();
      const { type: finalType, payload: finalPayload } = smartRouter.route(
        actionType,
        payload || {},
        state,
        playerIndex
      );

      console.log(`[ActionRouter] SmartRouter routed "${actionType}" → "${finalType}"`);

      // 4. Execute handler — pure function returns new state
      const handler = handlers[finalType];
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
  SmartRouter
};
