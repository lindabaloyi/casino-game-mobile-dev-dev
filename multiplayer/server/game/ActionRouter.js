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

    // Use shared router for core logic (validates turn, routes action, executes handler)
    const newState = this.sharedRouter.executeAction(state, playerIndex, type, payload);

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
