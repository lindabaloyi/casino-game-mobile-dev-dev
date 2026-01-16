/**
 * Action Router Module
 * Maps action types to handler modules. Ensures unknown actions throw structured errors.
 * Validates turn order before executing actions.
 */

const { createLogger } = require('../utils/logger');
const { canPlayerMove } = require('./logic/actionDetermination');

const logger = createLogger('ActionRouter');

// ============================================================================
// GAME STATE CHECKS - Centralized state validation and transitions
// ============================================================================

class GameStateChecks {
  static isGameOver(gameState) {
    // RULE: Both players have empty hands in round 2
    const bothHandsEmpty = gameState.playerHands[0].length === 0 &&
                          gameState.playerHands[1].length === 0;
    return (gameState.round === 2 && bothHandsEmpty) || gameState.gameOver;
  }

  static shouldSwitchToRound2(gameState) {
    return gameState.round === 1 &&
           gameState.playerHands[0].length === 0 &&
           gameState.playerHands[1].length === 0;
  }

  static getTransitionMessage(gameState, actionType) {
    if (this.shouldSwitchToRound2(gameState)) {
      return `🎯 ROUND 1 → ROUND 2: Both players emptied hands (action: ${actionType})`;
    }
    if (this.isGameOver(gameState)) {
      return `🏆 GAME OVER: Round 2 complete (action: ${actionType})`;
    }
    return null;
  }
}

// ============================================================================
// GAME OVER HANDLER - Centralized game over logic
// ============================================================================

const handleGameOver = (gameState, lastPlayerIndex) => {
  console.log('🏆 HANDLING GAME OVER:', {
    round: gameState.round,
    tableCards: gameState.tableCards.length,
    lastPlayer: lastPlayerIndex
  });

  const updatedState = { ...gameState };

  // Award remaining table cards to last player
  if (updatedState.tableCards.length > 0) {
    if (!updatedState.playerCaptures[lastPlayerIndex]) {
      updatedState.playerCaptures[lastPlayerIndex] = [];
    }
    updatedState.playerCaptures[lastPlayerIndex].push(...updatedState.tableCards);
    updatedState.tableCards = [];
  }

  // Calculate final scores
  const { calculateGameResult } = require('./GameState');
  const gameResult = calculateGameResult(updatedState, lastPlayerIndex);

  // Update state
  updatedState.gameOver = true;
  updatedState.winner = gameResult.winner;
  updatedState.finalScores = gameResult.scores;
  updatedState.scoreDetails = gameResult.details;

  console.log('Game over finalized:', {
    winner: gameResult.winner,
    scores: gameResult.scores
  });

  return updatedState;
};

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

      // 🎯 DEBUG: Log state changes from action execution
      console.log('🎯 ACTION EXECUTED:', {
        actionType,
        playerIndex,
        playerHandsBefore: gameState.playerHands.map(h => h.length),
        playerHandsAfter: newGameState.playerHands.map(h => h.length),
        tableCardsChange: newGameState.tableCards.length - gameState.tableCards.length,
        round: newGameState.round
      });

      // Get updated state (in case action modified it)
      const updatedGameState = this.gameManager.getGameState(gameId);

      // 🎯 AFTER STATE - only if updatedGameState exists
      if (updatedGameState) {
        logger.gameState(gameId, gameState, updatedGameState, `AFTER_${actionType}`);
      } else {
        logger.warn(`No game state after ${actionType} execution for game ${gameId}`);
      }

      // ✅ TURN AND ROUND MANAGEMENT (Simplified)
      let finalGameState = { ...newGameState };

      // 1. Check for round/game transitions FIRST
      console.log('🔍 CHECKING FOR TRANSITIONS:', {
        actionType,
        round: finalGameState.round,
        player0HandSize: finalGameState.playerHands[0].length,
        player1HandSize: finalGameState.playerHands[1].length,
        bothEmpty: finalGameState.playerHands[0].length === 0 && finalGameState.playerHands[1].length === 0,
        isGameOver: GameStateChecks.isGameOver(finalGameState),
        shouldSwitchToRound2: GameStateChecks.shouldSwitchToRound2(finalGameState)
      });

      const transitionMessage = GameStateChecks.getTransitionMessage(finalGameState, actionType);
      if (transitionMessage) {
        console.log(transitionMessage);

        if (GameStateChecks.shouldSwitchToRound2(finalGameState)) {
          const { initializeRound2 } = require('./GameState');
          finalGameState = initializeRound2(finalGameState);
        }
        else if (GameStateChecks.isGameOver(finalGameState)) {
          finalGameState = handleGameOver(finalGameState, playerIndex);
          // Return early - no turn switching needed for game over
          this.gameManager.activeGames.set(gameId, finalGameState);
          return finalGameState;
        }
      }

      // 2. Handle turn switching
      const forceTurnSwitch = (actionType === 'trail' || actionType === 'confirmTrail' || actionType === 'createBuildFromTempStack');
      const currentPlayerCanMove = canPlayerMove(finalGameState);

      if (!currentPlayerCanMove || forceTurnSwitch) {
        const nextPlayer = (finalGameState.currentPlayer + 1) % 2;
        finalGameState.currentPlayer = nextPlayer;

        // Reset turn trackers
        if (finalGameState.tempStackHandCardUsedThisTurn) {
          finalGameState.tempStackHandCardUsedThisTurn = [false, false];
        }
        if (finalGameState.buildHandCardUsedThisTurn) {
          finalGameState.buildHandCardUsedThisTurn = [false, false];
        }

        logger.info(`Turn switched: P${finalGameState.currentPlayer} -> P${nextPlayer + 1}`, {
          actionType,
          reason: forceTurnSwitch ? 'forced' : 'no_moves'
        });
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

      // 🎯 EMIT ACTION FAILURE TO CLIENT: For drag-related actions that should reset cards
      const dragRelatedActions = ['addToOwnTemp', 'addToOwnBuild', 'trail', 'capture'];
      if (dragRelatedActions.includes(actionType)) {
        console.log('[ActionRouter] 🚨 Emitting action-failed event to client:', {
          actionType,
          playerIndex,
          error: error.message,
          resetCard: payload?.card ? { rank: payload.card.rank, suit: payload.card.suit } : null
        });

        // Emit to the specific player's socket
        const gameManager = this.gameManager;
        const game = gameManager.activeGames.get(gameId);
        if (game && game.players) {
          const playerSocketId = game.players[playerIndex]?.socketId;
          if (playerSocketId) {
            const io = require('../socket-server').getIO();
            io.to(playerSocketId).emit('action-failed', {
              actionType,
              error: error.message,
              resetCard: payload?.card ? { rank: payload.card.rank, suit: payload.card.suit } : null
            });
          }
        }
      }

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
