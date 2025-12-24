/**
 * Action Router Module
 * Maps action types to handler modules. Ensures unknown actions throw structured errors.
 * Validates turn order before executing actions.
 */

const { createLogger } = require('../utils/logger');
const { canPlayerMove } = require('./logic/actionDetermination');

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
  async executeAction(gameId, playerIndex, action) {
    const { type: actionType, payload } = action;

    // 🔍 ACTION ENTRY LOG
    logger.action(`START ${actionType}`, gameId, playerIndex, {
      payload: payload,
      timestamp: new Date().toISOString()
    });

    // Check if action type exists
    if (!this.actionHandlers[actionType]) {
      const available = Object.keys(this.actionHandlers).join(', ');
      logger.error(`No handler for action type: ${actionType}`, { availableHandlers: available });
      throw new Error(`Unknown action: ${actionType}. Available: ${available}`);
    }

    try {
      // Get game state and execute action
      const gameState = this.gameManager.getGameState(gameId);
      if (!gameState) {
        logger.error(`Game ${gameId} not found for action ${actionType}`, { playerIndex });
        throw new Error(`Game ${gameId} not found`);
      }

      // 🎯 BEFORE STATE - only if gameState exists
      logger.gameState(gameId, gameState, null, `BEFORE_${actionType}`);

      logger.info(`Executing ${actionType} for Player ${playerIndex} in Game ${gameId}`);

      const newGameState = await this.actionHandlers[actionType](this.gameManager, playerIndex, action, gameId);

      // Get updated state (in case action modified it)
      const updatedGameState = this.gameManager.getGameState(gameId);

      // 🎯 AFTER STATE - only if updatedGameState exists
      if (updatedGameState) {
        logger.gameState(gameId, gameState, updatedGameState, `AFTER_${actionType}`);
      } else {
        logger.warn(`No game state after ${actionType} execution for game ${gameId}`);
      }

      // ✅ TURN MANAGEMENT
      let finalGameState = { ...newGameState };
      const currentPlayerCanMove = canPlayerMove(finalGameState);
      const forceTurnSwitch = (actionType === 'trail' || actionType === 'confirmTrail' || actionType === 'createBuildFromTempStack');

      const phase = (currentPlayerCanMove && !forceTurnSwitch) ? 'continue' : 'switch';
      logger.info(`Turn management: P${finalGameState.currentPlayer + 1} -> ${phase}`, {
        actionType,
        currentPlayerCanMove,
        forceTurnSwitch
      });

      if (!currentPlayerCanMove || forceTurnSwitch) {
        // Switch to next player
        const nextPlayer = (finalGameState.currentPlayer + 1) % 2;
        finalGameState.currentPlayer = nextPlayer;

        const fromPlayer = newGameState.currentPlayer;
        logger.info(`Turn switched: P${fromPlayer + 1} -> P${nextPlayer + 1}`, {
          actionType,
          reason: forceTurnSwitch ? 'forced' : 'no_moves'
        });

        // Check if next player can move
        const nextPlayerCanMove = canPlayerMove(finalGameState);
        if (!nextPlayerCanMove) {
          logger.warn('Game end condition: Neither player can move', { gameId });
        }
      }

      // Update GameManager's state with final game state (after turn logic)
      this.gameManager.activeGames.set(gameId, finalGameState);

      // 🔍 ACTION EXIT LOG
      const turnChanged = newGameState.currentPlayer !== finalGameState.currentPlayer;
      logger.action(`END ${actionType}`, gameId, playerIndex, {
        success: true,
        turnChanged,
        newCurrentPlayer: finalGameState.currentPlayer,
        tableCardsChange: finalGameState.tableCards.length - gameState.tableCards.length,
        timestamp: new Date().toISOString()
      });

      return finalGameState;

    } catch (error) {
      // 🚨 ERROR LOGGING
      logger.error(`Action ${actionType} failed`, {
        gameId,
        playerIndex,
        payload,
        error: error.message,
        stack: error.stack
      });

      // 🔍 ACTION ERROR LOG
      logger.action(`ERROR ${actionType}`, gameId, playerIndex, {
        error: error.message,
        timestamp: new Date().toISOString()
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
