/**
 * ActionRouter (Server)
 * Routes incoming game-action events to the correct handler function.
 * 
 * This is a wrapper around the shared ActionRouter that adds:
 * - Game state persistence via gameManager
 * - Server-specific logging
 * 
 * The core routing logic is delegated to the shared ActionRouter.
 */

// Use shared ActionRouter for core logic
const { createActionRouter: createSharedRouter } = require('../../../shared/game/ActionRouter');

class ActionRouter {
  constructor(gameManager) {
    this.gameManager = gameManager;
    // Create shared router with handlers from shared
    this.sharedRouter = createSharedRouter({
      handlers: require('../../../shared/game/actions'),
    });
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

    // Get current state
    const state = this.gameManager.getGameState(gameId);
    if (!state) throw new Error(`Game "${gameId}" not found`);

    console.log(`[ActionRouter] executeAction - gameId: ${gameId}, action: ${type}, playerIndex: ${playerIndex}`);
    console.log(`[ActionRouter] State before action - tableCards count: ${state.tableCards?.length}, tempStacks: ${state.tableCards?.filter(tc => tc.type === 'temp_stack').length}`);

    // Use shared router for core logic (validates turn, routes action, executes handler)
    const newState = this.sharedRouter.executeAction(state, playerIndex, type, payload);

    console.log(`[ActionRouter] State after action - tableCards count: ${newState.tableCards?.length}, tempStacks: ${newState.tableCards?.filter(tc => tc.type === 'temp_stack').length}`);

    // Log the actual routed action type
    console.log(`[ActionRouter] Executed action: ${type}`);

    // Log the players' captures for debugging
    if (type === 'cancelTemp') {
      console.log(`[ActionRouter] After cancelTemp - Player captures:`);
      for (let i = 0; i < newState.players.length; i++) {
        console.log(`[ActionRouter]   Player ${i}: ${newState.players[i]?.captures?.length} cards - ${newState.players[i]?.captures?.map(c => c.rank + c.suit).join(', ')}`);
      }
    }

    // Clean up expired shiyal recalls (older than 4 seconds)
    if (newState.shiyaRecalls) {
      const now = Date.now();
      let cleaned = false;
      for (const playerIdx of Object.keys(newState.shiyaRecalls)) {
        const recall = newState.shiyaRecalls[playerIdx];
        if (recall && recall.expiresAt && now > recall.expiresAt) {
          delete newState.shiyaRecalls[playerIdx];
          cleaned = true;
        }
      }
      if (cleaned) {
        console.log(`[ActionRouter] Cleaned up expired shiyal recalls`);
      }
    }

    // Persist updated state
    this.gameManager.saveGameState(gameId, newState);

    return newState;
  }

  /**
   * Returns true if an action type is registered.
   */
  supports(actionType) {
    return this.sharedRouter.supports(actionType);
  }

  /**
   * List all registered action types (useful for debugging).
   */
  registeredActions() {
    return this.sharedRouter.registeredActions();
  }
}

module.exports = ActionRouter;
