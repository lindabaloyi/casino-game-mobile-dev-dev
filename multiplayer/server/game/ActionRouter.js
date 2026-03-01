/**
 * ActionRouter
 * Routes incoming game-action events to the correct handler function.
 *
 * Handler contract:
 *   (gameState, payload, playerIndex) => newGameState   (pure, no side effects)
 *
 * The router:
 *   1. Validates the action type is registered
 *   2. Calls the handler
 *   3. Saves the returned state back to GameManager
 *   4. Returns the new state so the coordinator can broadcast it
 */

class ActionRouter {
  constructor(gameManager) {
    this.gameManager = gameManager;
    // Loaded from actions/index.js — a plain { actionType: handlerFn } map
    this.handlers = require('./actions/index.js');
  }

  /**
   * Execute an action.
   * @param {string}  gameId
   * @param {number}  playerIndex
   * @param {{ type: string, payload: any }} action
   * @returns {object} updated game state
   * @throws if action type is unknown or handler throws
   */
  executeAction(gameId, playerIndex, action) {
    const { type, payload } = action;

    // 1. Guard: unknown action
    if (!this.handlers[type]) {
      const known = Object.keys(this.handlers).join(', ') || '(none registered yet)';
      throw new Error(`Unknown action "${type}". Registered: ${known}`);
    }

    // 2. Get current state
    const state = this.gameManager.getGameState(gameId);
    if (!state) throw new Error(`Game "${gameId}" not found`);

    // 3. Guard: wrong player's turn
    if (state.currentPlayer !== playerIndex) {
      throw new Error(`Not your turn (current player: ${state.currentPlayer})`);
    }

    // 4. Smart routing: check if capture should become addToTemp
    let finalType = type;
    let finalPayload = payload;

    if (type === 'capture' && payload?.targetType === 'build' && payload?.targetStackId) {
      const stack = state.tableCards.find(
        tc => (tc.type === 'build_stack' || tc.type === 'temp_stack') && tc.stackId === payload.targetStackId,
      );
      
      if (stack && payload.card.value !== stack.value) {
        // Card value doesn't match - route to addToTemp instead
        console.log(`[ActionRouter] Routing capture → addToTemp (card ${payload.card.value} vs stack ${stack.value})`);
        finalType = 'addToTemp';
        finalPayload = {
          card: payload.card,
          stackId: payload.targetStackId,
        };
      }
    }

    // 5. Execute handler — pure function returns new state
    const handler = this.handlers[finalType];
    const newState = handler(state, finalPayload || {}, playerIndex);

    // 6. Persist updated state
    this.gameManager.saveGameState(gameId, newState);

    return newState;
  }

  /**
   * Returns true if an action type is registered.
   */
  supports(actionType) {
    return Boolean(this.handlers[actionType]);
  }

  /**
   * List all registered action types (useful for debugging).
   */
  registeredActions() {
    return Object.keys(this.handlers);
  }
}

module.exports = ActionRouter;
