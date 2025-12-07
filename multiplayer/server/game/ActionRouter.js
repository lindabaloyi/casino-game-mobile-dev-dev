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

    // ⚡ [DEBUG] Log action execution details
    console.log('⚡ [DEBUG] ACTION EXECUTION START:', {
      gameId,
      playerIndex,
      actionType,
      payloadKeys: action.payload ? Object.keys(action.payload) : [],
      timestamp: new Date().toISOString()
    });

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

      // ✅ TURN MANAGEMENT: Check if current player can still move
      let finalGameState = { ...newGameState };

      // 🔄 [DEBUG] Turn management analysis
      const currentPlayerCanMove = canPlayerMove(finalGameState);
      console.log('🔄 [DEBUG] TURN MANAGEMENT:', {
        gameId,
        currentPlayer: finalGameState.currentPlayer,
        canMove: currentPlayerCanMove,
        playerHand: finalGameState.playerHands[finalGameState.currentPlayer].length + ' cards',
        tableCards: finalGameState.tableCards.length + ' cards',
        phase: currentPlayerCanMove ? 'continue_turn' : 'switch_turn'
      });

      if (!currentPlayerCanMove) {
        // Player cannot move - switch to next player
        const nextPlayer = (finalGameState.currentPlayer + 1) % 2;
        finalGameState.currentPlayer = nextPlayer;

        // 🔄 [DEBUG] Turn switch details
        console.log('🔄 [DEBUG] TURN SWITCHED:', {
          gameId,
          reason: 'no_moves_available',
          fromPlayer: newGameState.currentPlayer,
          toPlayer: nextPlayer,
          actionType
        });

        logger.info('Turn switched - player cannot move', {
          gameId,
          previousPlayer: newGameState.currentPlayer,
          newPlayer: nextPlayer
        });

        // Check if next player can also move, or if game should end
        const nextPlayerCanMove = canPlayerMove(finalGameState);
        console.log('🔄 [DEBUG] NEXT PLAYER ANALYSIS:', {
          gameId,
          nextPlayer,
          nextPlayerCanMove,
          nextPlayerHand: finalGameState.playerHands[nextPlayer].length + ' cards',
          bothCannotMove: !nextPlayerCanMove
        });

        if (!nextPlayerCanMove) {
          // Neither player can move - game might be over
          logger.warn('Neither player can move - potential game end', { gameId });
          // You could implement game ending logic here
        }
      } else {
        // 🔄 [DEBUG] Turn continues - player can still move
        console.log('🔄 [DEBUG] TURN CONTINUES:', {
          gameId,
          player: finalGameState.currentPlayer,
          remainingCards: finalGameState.playerHands[finalGameState.currentPlayer].length,
          availableActions: 'computed_on_next_move',
          reason: 'still_has_moves'
        });
      }

      logger.info('Action executed successfully', {
        gameId,
        actionType,
        finalPlayer: finalGameState.currentPlayer,
        turnSwitched: newGameState.currentPlayer !== finalGameState.currentPlayer
      });

      // ✅ [DEBUG] Log game state changes
      console.log('✅ [DEBUG] ACTION COMPLETED:', {
        gameId,
        actionType,
        beforeState: {
          tableCardsCount: gameState.tableCards?.length || 0,
          currentPlayer: gameState.currentPlayer,
          gameOver: gameState.gameOver
        },
        afterState: {
          tableCardsCount: finalGameState.tableCards?.length || 0,
          currentPlayer: finalGameState.currentPlayer,
          gameOver: finalGameState.gameOver,
          turnChanged: gameState.currentPlayer !== finalGameState.currentPlayer,
          canMove: canPlayerMove(finalGameState)
        },
        timestamp: new Date().toISOString()
      });

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
