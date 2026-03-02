/**
 * ActionRouter
 * Routes incoming game-action events to the correct handler function.
 *
 * Responsibilities:
 * - Validates action type is registered
 * - Validates it's the player's turn
 * - Uses SmartRouter to determine the correct handler
 * - Executes the handler
 * - Persists the new state
 *
 * Smart routing logic is delegated to SmartRouter for testability.
 */

const SmartRouter = require('./smart-router/index.js');

class ActionRouter {
  constructor(gameManager) {
    this.gameManager = gameManager;
    // Loaded from actions/index.js — a plain { actionType: handlerFn } map
    this.handlers = require('./actions/index.js');
    // SmartRouter handles all game rule routing logic
    this.smartRouter = new SmartRouter();
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

    // 4. Smart routing: let SmartRouter decide what handler to call
    // SmartRouter throws errors for invalid game actions (e.g., invalid steals)
    const { type: finalType, payload: finalPayload } = this.smartRouter.route(
      type,
      payload,
      state,
      playerIndex
    );

    console.log(`[ActionRouter] Routed "${type}" → "${finalType}"`);

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
