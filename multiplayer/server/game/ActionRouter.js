/**
 * Action Router Module
 * Maps action types to handler modules. Ensures unknown actions throw structured errors.
 * Validates turn order before executing actions.
 */

const { createLogger } = require('../utils/logger');
const { canPlayerMove } = require('./logic/determineActions');

const logger = createLogger('ActionRouter');

class ActionRouter {
  constructor(gameManager) {
    this.gameManager = gameManager;

    // Will be populated after action modules are created
    this.actionHandlers = {};

    // Structured error types
    this.ErrorTypes = {
      UNKNOWN_ACTION: 'UNKNOWN_ACTION',
      HANDLER_ERROR: 'HANDLER_ERROR',
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      TURN_ERROR: 'TURN_ERROR'
    };
  }

  /**
   * Register a action handler
   */
  registerAction(actionType, handlerFunction) {
    if (typeof handlerFunction !== 'function') {
      throw new Error(`Handler for ${actionType} must be a function`);
    }
    this.actionHandlers[actionType] = handlerFunction;
    logger.debug('Action handler registered', { actionType });
  }

  /**
   * Execute action through router
   */
  executeAction(gameId, playerIndex, action) {
    const { type: actionType } = action;

    logger.info(`Action: ${actionType} by P${playerIndex + 1} in game ${gameId}`);

    // Check if action type exists
    if (!this.actionHandlers[actionType]) {
      const available = Object.keys(this.actionHandlers).join(', ');
      throw new Error(`Unknown action: ${actionType}. Available: ${available}`);
    }

    try {
      // Get game state and execute action
      const gameState = this.gameManager.getGameState(gameId);
      if (!gameState) {
        throw new Error(`Game ${gameId} not found`);
      }

      const newGameState = this.actionHandlers[actionType](this.gameManager, playerIndex, action);

      // ✅ TURN MANAGEMENT
      let finalGameState = { ...newGameState };
      const currentPlayerCanMove = canPlayerMove(finalGameState);
      const forceTurnSwitch = (actionType === 'trail' || actionType === 'confirmTrail');

      const phase = (currentPlayerCanMove && !forceTurnSwitch) ? 'continue' : 'switch';
      console.log(`TURN: P${finalGameState.currentPlayer + 1} -> ${phase} (${actionType})`);

      if (!currentPlayerCanMove || forceTurnSwitch) {
        // Switch to next player
        const nextPlayer = (finalGameState.currentPlayer + 1) % 2;
        finalGameState.currentPlayer = nextPlayer;

        const fromPlayer = newGameState.currentPlayer;
        console.log(`TURN SWITCH: P${fromPlayer + 1} -> P${nextPlayer + 1} (${actionType})`);

        // Keep TRAIL_FIX log for debugging trail turn management
        if (forceTurnSwitch) {
          console.log(`TRAIL_FIX: ${actionType} forced turn end - P${fromPlayer + 1} -> P${nextPlayer + 1}`);
        }

        // Check if next player can move
        const nextPlayerCanMove = canPlayerMove(finalGameState);
        if (!nextPlayerCanMove) {
          console.log(`GAME END: Neither player can move (game ${gameId})`);
        }
      }

      // Keep essential action completion info
      const turnChanged = newGameState.currentPlayer !== finalGameState.currentPlayer;
      console.log(`ACTION: ${actionType} completed - turn changed: ${turnChanged}`);

      // Update GameManager's state with final game state (after turn logic)
      this.gameManager.activeGames.set(gameId, finalGameState);

      return finalGameState;

    } catch (error) {
      logger.error('Handler execution failed', {
        gameId,
        playerIndex,
        actionType,
        error: error.message,
        stack: error.stack
      });

      // Re-throw with structured format
      throw {
        type: this.ErrorTypes.HANDLER_ERROR,
        message: error.message,
        actionType: actionType,
        originalError: error
      };
    }
  }

  /**
   * Get available action types
   */
  getAvailableActions() {
    return Object.keys(this.actionHandlers);
  }

  /**
   * Check if action type is supported
   */
  isActionSupported(actionType) {
    return !!this.actionHandlers[actionType];
  }
}

module.exports = ActionRouter;
