/**
 * Action Router Module
 * Maps action types to handler modules. Ensures unknown actions throw structured errors.
 * Validates turn order before executing actions.
 */

const { createLogger } = require("../utils/logger");
const { canPlayerMove } = require("./logic/actionDetermination");

const logger = createLogger("ActionRouter");

// ============================================================================
// GAME STATE CHECKS - Centralized state validation and transitions
// ============================================================================

class GameStateChecks {
  static shouldSwitchToRound2(gameState) {
    return (
      gameState.round === 1 &&
      gameState.playerHands[0].length === 0 &&
      gameState.playerHands[1].length === 0
    );
  }

  static getTransitionMessage(gameState, actionType) {
    if (this.shouldSwitchToRound2(gameState)) {
      return `🎯 ROUND 1 → ROUND 2: Both players emptied hands (action: ${actionType})`;
    }
    return null;
  }
}

class ActionRouter {
  constructor(gameManager) {
    this.gameManager = gameManager;

    // Will be populated after action modules are created
    this.actionHandlers = {};

    // Structured error types
    this.ErrorTypes = {
      UNKNOWN_ACTION: "UNKNOWN_ACTION",
      HANDLER_ERROR: "HANDLER_ERROR",
      VALIDATION_ERROR: "VALIDATION_ERROR",
      TURN_ERROR: "TURN_ERROR",
    };
  }

  /**
   * Register a action handler
   */
  registerAction(actionType, handlerFunction) {
    if (typeof handlerFunction !== "function") {
      throw new Error(`Handler for ${actionType} must be a function`);
    }
    this.actionHandlers[actionType] = handlerFunction;
    logger.debug("Action handler registered", { actionType });
  }

  /**
   * Execute action through router
   */
  async executeAction(gameId, playerIndex, action) {
    const { type: actionType, payload } = action;

    // 🔍 ACTION ENTRY LOG
    logger.action(`START ${actionType}`, gameId, playerIndex, {
      payload: payload,
      timestamp: new Date().toISOString(),
    });

    // Check if action type exists
    if (!this.actionHandlers[actionType]) {
      const available = Object.keys(this.actionHandlers).join(", ");
      logger.error(`No handler for action type: ${actionType}`, {
        availableHandlers: available,
      });
      throw new Error(`Unknown action: ${actionType}. Available: ${available}`);
    }

    try {
      // Get game state and execute action
      const gameState = this.gameManager.getGameState(gameId);
      if (!gameState) {
        logger.error(`Game ${gameId} not found for action ${actionType}`, {
          playerIndex,
        });
        throw new Error(`Game ${gameId} not found`);
      }

      // Track original currentPlayer for turn counter logic
      const originalCurrentPlayer = gameState.currentPlayer;

      // 🎯 BEFORE STATE - only if gameState exists
      logger.gameState(gameId, gameState, null, `BEFORE_${actionType}`);

      logger.info(
        `Executing ${actionType} for Player ${playerIndex} in Game ${gameId}`,
      );

      const newGameState = await this.actionHandlers[actionType](
        this.gameManager,
        playerIndex,
        action,
        gameId,
      );

      // 🎯 DEBUG: Log state changes from action execution
      console.log("🎯 ACTION EXECUTED:", {
        actionType,
        playerIndex,
        playerHandsBefore: gameState.playerHands.map((h) => h.length),
        playerHandsAfter: newGameState.playerHands.map((h) => h.length),
        tableCardsChange:
          newGameState.tableCards.length - gameState.tableCards.length,
        round: newGameState.round,
        ...(actionType === "game-over" && {
          gameOver: newGameState.gameOver,
          tableCardsCount: newGameState.tableCards.length,
          scores: newGameState.scores,
        }),
      });

      // Get updated state (in case action modified it)
      const updatedGameState = this.gameManager.getGameState(gameId);

      // 🎯 AFTER STATE - only if updatedGameState exists
      if (updatedGameState) {
        logger.gameState(
          gameId,
          gameState,
          updatedGameState,
          `AFTER_${actionType}`,
        );
      } else {
        logger.warn(
          `No game state after ${actionType} execution for game ${gameId}`,
        );
      }

      // ✅ TURN AND ROUND MANAGEMENT (Simplified)
      let finalGameState = { ...newGameState };

      // 1. Check for round transitions FIRST
      console.log("🔍 CHECKING FOR TRANSITIONS:", {
        actionType,
        round: finalGameState.round,
        player0HandSize: finalGameState.playerHands[0].length,
        player1HandSize: finalGameState.playerHands[1].length,
        bothEmpty:
          finalGameState.playerHands[0].length === 0 &&
          finalGameState.playerHands[1].length === 0,
        shouldSwitchToRound2:
          GameStateChecks.shouldSwitchToRound2(finalGameState),
      });

      const transitionMessage = GameStateChecks.getTransitionMessage(
        finalGameState,
        actionType,
      );
      if (transitionMessage) {
        console.log(transitionMessage);

        if (GameStateChecks.shouldSwitchToRound2(finalGameState)) {
          const { initializeRound2 } = require("./GameState");
          finalGameState = initializeRound2(finalGameState);
        }
      }

      // 2. Handle turn switching
      const actionsThatCompleteTurns = [
        "trail",
        "confirmTrail",
        "createBuildFromTempStack",
        "capture", // Captures complete turns
        "ReinforceBuild", // Build reinforcement completes turns
      ];

      const shouldCompleteTurn = actionsThatCompleteTurns.includes(actionType);
      const currentPlayerCanMove = canPlayerMove(finalGameState);

      if (!currentPlayerCanMove || shouldCompleteTurn) {
        // Determine if the current turn was completed
        // - If player performed an action that completes turns, turn was completed
        // - If player had no moves, turn was incomplete
        const turnCompleted = shouldCompleteTurn;

        // Initialize turnCompletionFlags array if it doesn't exist (for backward compatibility)
        if (!finalGameState.turnCompletionFlags) {
          finalGameState.turnCompletionFlags = [];
        }

        // Record completion status for the current turn (turnCounter represents the turn that just ended)
        const currentTurnIndex = finalGameState.turnCounter - 1; // turnCounter starts at 1, array index starts at 0
        finalGameState.turnCompletionFlags[currentTurnIndex] = turnCompleted;

        const nextPlayer = (finalGameState.currentPlayer + 1) % 2;
        finalGameState.currentPlayer = nextPlayer;

        // Reset turn trackers
        if (finalGameState.tempStackHandCardUsedThisTurn) {
          finalGameState.tempStackHandCardUsedThisTurn = [false, false];
        }
        if (finalGameState.buildHandCardUsedThisTurn) {
          finalGameState.buildHandCardUsedThisTurn = [false, false];
        }

        logger.info(
          `Turn switched: P${finalGameState.currentPlayer} -> P${nextPlayer + 1}`,
          {
            actionType,
            reason: shouldCompleteTurn ? "action_completed" : "no_moves",
            turnCompleted,
            turnCounter: finalGameState.turnCounter,
          },
        );
      }

      // 3. Always increment turn counter if currentPlayer changed
      if (finalGameState.currentPlayer !== originalCurrentPlayer) {
        finalGameState.turnCounter = finalGameState.turnCounter + 1;
        logger.info(
          `Turn counter incremented: Turn #${finalGameState.turnCounter} - Player ${finalGameState.currentPlayer} now active`,
          {
            actionType,
            originalPlayer: originalCurrentPlayer,
            newPlayer: finalGameState.currentPlayer,
            turnCounter: finalGameState.turnCounter,
          },
        );

        // 4. Check for turn 40 analysis (cleanup now handled client-side)
        if (finalGameState.turnCounter === 40) {
          // Get the most current game state for accurate analysis
          const currentGameState = this.gameManager.getGameState(gameId);

          // Calculate turn completion statistics
          const turnCompletionFlags =
            currentGameState.turnCompletionFlags || [];
          const completedTurns = turnCompletionFlags.filter(
            (flag) => flag === true,
          ).length;
          const incompleteTurns = turnCompletionFlags.filter(
            (flag) => flag === false,
          ).length;
          const totalTurnsTracked = turnCompletionFlags.length;

          const turn40Analysis = {
            turnCounter: finalGameState.turnCounter,
            tableCardsCount: currentGameState.tableCards.length,
            lastCapturer: currentGameState.lastCapturer,
            currentPlayer: currentGameState.currentPlayer,
            playerCaptures: currentGameState.playerCaptures.map(
              (captures, idx) => ({
                player: idx,
                cards: captures.length,
              }),
            ),
            turnCompletionStats: {
              totalTurnsTracked,
              completedTurns,
              incompleteTurns,
              completionRate:
                totalTurnsTracked > 0
                  ? ((completedTurns / totalTurnsTracked) * 100).toFixed(1) +
                    "%"
                  : "N/A",
              turnCompletionFlags: turnCompletionFlags.slice(0, 10), // First 10 turns for detailed logging
            },
          };

          logger.info("🎯 TURN 40 GAME ANALYSIS:", turn40Analysis);

          // Send analysis to client for logging and client-side cleanup trigger
          finalGameState.turn40Analysis = turn40Analysis;
        }
      }

      // Update GameManager's state with final game state (after turn logic)
      this.gameManager.activeGames.set(gameId, finalGameState);

      // 🔍 ACTION EXIT LOG
      const turnChanged =
        newGameState.currentPlayer !== finalGameState.currentPlayer;
      logger.action(`END ${actionType}`, gameId, playerIndex, {
        success: true,
        turnChanged,
        newCurrentPlayer: finalGameState.currentPlayer,
        tableCardsChange:
          finalGameState.tableCards.length - gameState.tableCards.length,
        timestamp: new Date().toISOString(),
      });

      return finalGameState;
    } catch (error) {
      // 🚨 ERROR LOGGING
      logger.error(`Action ${actionType} failed`, {
        gameId,
        playerIndex,
        payload,
        error: error.message,
        stack: error.stack,
      });

      // 🔍 ACTION ERROR LOG
      logger.action(`ERROR ${actionType}`, gameId, playerIndex, {
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // 🎯 EMIT ACTION FAILURE TO CLIENT: For drag-related actions that should reset cards
      const dragRelatedActions = [
        "addToOwnTemp",
        "addToOwnBuild",
        "trail",
        "capture",
        "ReinforceBuild",
      ];
      if (dragRelatedActions.includes(actionType)) {
        console.log(
          "[ActionRouter] 🚨 Emitting action-failed event to client:",
          {
            actionType,
            playerIndex,
            error: error.message,
            resetCard: payload?.card
              ? { rank: payload.card.rank, suit: payload.card.suit }
              : null,
          },
        );

        // Emit to the specific player's socket
        const gameManager = this.gameManager;
        const game = gameManager.activeGames.get(gameId);
        if (game && game.players) {
          const playerSocketId = game.players[playerIndex]?.socketId;
          if (playerSocketId) {
            const io = require("../socket-server").getIO();
            io.to(playerSocketId).emit("action-failed", {
              actionType,
              error: error.message,
              resetCard: payload?.card
                ? { rank: payload.card.rank, suit: payload.card.suit }
                : null,
            });
          }
        }
      }

      // Re-throw with structured format
      throw {
        type: this.ErrorTypes.HANDLER_ERROR,
        message: error.message,
        actionType: actionType,
        originalError: error,
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
