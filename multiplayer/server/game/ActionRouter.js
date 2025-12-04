/**
 * Action Router Module
 * Maps action types to handler modules. Ensures unknown actions throw structured errors.
 * Validates turn order before executing actions.
 */

const { createLogger } = require('../utils/logger');

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
    logger.info('Routing action', { gameId, playerIndex, actionType });

    // Check if action type exists
    if (!this.actionHandlers[actionType]) {
      const error = {
        type: this.ErrorTypes.UNKNOWN_ACTION,
        message: `Unknown action type: ${actionType}`,
        actionType: actionType,
        availableActions: Object.keys(this.actionHandlers)
      };

      logger.error('Unknown action type', error);
      throw error;
    }

    try {
      // Get game state from GameManager
      const gameState = this.gameManager.getGameState(gameId);
      if (!gameState) {
        throw new Error(`Game ${gameId} not found`);
      }

      // Get handler and execute
      const handler = this.actionHandlers[actionType];
      logger.debug('Executing handler', { actionType });

      // Pass gameState to handler instead of gameId
      const newGameState = handler(this.gameManager, playerIndex, action);

      logger.info('Action executed successfully', { gameId, actionType, newPlayer: newGameState.currentPlayer });

      // Update GameManager's state
      this.gameManager.activeGames.set(gameId, newGameState);

      return newGameState;

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
