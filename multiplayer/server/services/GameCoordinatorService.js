/**
 * GameCoordinatorService
 * Handles game session orchestration, action routing, and game flow
 * Extracted from socket-server.js for better separation of concerns
 */

const { createLogger } = require('../utils/logger');

class GameCoordinatorService {
  constructor(gameManager, actionRouter, matchmaking, broadcaster) {
    this.logger = createLogger('GameCoordinatorService');
    this.gameManager = gameManager;
    this.actionRouter = actionRouter;
    this.matchmaking = matchmaking;
    this.broadcaster = broadcaster;
  }

  /**
   * Handle game action submission
   */
  handleGameAction(socket, data) {
    const gameId = this.matchmaking.getGameId(socket.id);
    if (!gameId) {
      this.broadcaster.sendError(socket, 'Not in an active game');
      return;
    }

    // Find player's index in the game
    const playerIndex = this.gameManager.getPlayerIndex(gameId, socket.id);
    if (playerIndex === null) {
      this.broadcaster.sendError(socket, 'Player not found in game');
      return;
    }

    try {
      this.logger.info(`Routing action ${data.type} from Player ${playerIndex} in game ${gameId}`);

      // Route through ActionRouter
      const newGameState = this.actionRouter.executeAction(gameId, playerIndex, data);

      // Broadcast updated game state to all players in game
      this.broadcaster.broadcastGameUpdate(gameId, newGameState);

    } catch (error) {
      this.logger.error(`Action failed:`, error);
      this.broadcaster.sendError(socket, error.message);
    }
  }

  /**
   * Handle card drop action coordination
   */
  handleCardDrop(socket, data) {
    const gameId = this.matchmaking.getGameId(socket.id);
    if (!gameId) {
      this.broadcaster.sendError(socket, 'Not in an active game');
      return;
    }

    // 🔍 [DEBUG] Log incoming client data
    this.logger.debug('CLIENT PAYLOAD - card-drop:', JSON.stringify({
      socketId: socket.id,
      gameId: gameId,
      payload: data,
      timestamp: new Date().toISOString()
    }, null, 2));

    // Find player's index in the game
    const playerIndex = this.gameManager.getPlayerIndex(gameId, socket.id);
    if (playerIndex === null) {
      this.broadcaster.sendError(socket, 'Player not found in game');
      return;
    }

    try {
      // Use GameManager's determineActions (which will delegate to logic module)
      const result = this.gameManager.determineActions(gameId, data.draggedItem, data.targetInfo);

      if (result.errorMessage) {
        this.broadcaster.sendError(socket, result.errorMessage);
        return;
      }

      if (result.actions.length === 1 && !result.requiresModal) {
        // Auto-execute single action
        this.logger.info(`Auto-executing ${result.actions[0].type}`);

        // ✅ FIX: Inject gameId into action payload before execution
        // Remove undefined gameId from client payload first
        const { gameId: undefinedGameId, ...cleanPayload } = result.actions[0].payload;

        const actionToExecute = {
          type: result.actions[0].type,
          payload: {
            ...cleanPayload,  // Clean payload without undefined gameId
            gameId  // 🔧 Add the correct gameId
          }
        };

        const newGameState = this.actionRouter.executeAction(gameId, playerIndex, actionToExecute);

        // Broadcast to all game players
        this.broadcaster.broadcastGameUpdate(gameId, newGameState);

      } else if (result.actions.length > 0) {
        // Send action choices to client for modal selection
        this.broadcaster.sendActionChoices(socket, result.actions, data.requestId);
      }

    } catch (error) {
      // 🚨 [DEBUG] Log full error details for debugging
      this.logger.error('FULL ERROR DETAILS - card-drop:', {
        event: 'card-drop',
        gameId,
        playerIndex,
        socketId: socket.id,
        input: {
          draggedItem: data.draggedItem,
          targetInfo: data.targetInfo,
          requestId: data.requestId
        },
        error: {
          message: error.message,
          stack: error.stack,
          type: error.type || 'UNKNOWN_ERROR',
          originalError: error.originalError
        },
        timestamp: new Date().toISOString()
      });

      this.logger.error(`Card drop failed:`, error);
      this.broadcaster.sendError(socket, 'Invalid move');
    }
  }

  /**
   * Handle action choice from client modal
   */
  handleExecuteAction(socket, data) {
    const gameId = this.matchmaking.getGameId(socket.id);
    if (!gameId) {
      this.broadcaster.sendError(socket, 'Not in an active game');
      return;
    }

    // Find player's index in the game
    const playerIndex = this.gameManager.getPlayerIndex(gameId, socket.id);
    if (playerIndex === null) {
      this.broadcaster.sendError(socket, 'Player not found in game');
      return;
    }

    // 🔍 [DEBUG] Log incoming client data for manual action selections
    this.logger.info('EXECUTE-ACTION RECEIVED:', {
      socketId: socket.id,
      gameId: gameId,
      playerIndex: playerIndex,
      actionType: data.action?.type,
      payloadKeys: data.action?.payload ? Object.keys(data.action.payload) : [],
      cardInfo: data.action?.payload?.card ? `${data.action.payload.card.rank}${data.action.payload.card.suit}` : 'no card',
      timestamp: new Date().toISOString()
    });

    this.logger.debug('CLIENT PAYLOAD - execute-action:', JSON.stringify({
      socketId: socket.id,
      gameId: gameId,
      action: data.action,
      timestamp: new Date().toISOString()
    }, null, 2));

    try {
      // ✅ FIX: Inject gameId into action payload for manual selections
      const actionToExecute = {
        type: data.action.type,
        payload: {
          gameId,  // 🔧 Add gameId for manual action selections
          ...data.action.payload
        }
      };

      this.logger.info('EXECUTE-ACTION PROCESSED:', {
        gameId: gameId,
        playerIndex: playerIndex,
        finalActionType: actionToExecute.type,
        payloadKeys: Object.keys(actionToExecute.payload),
        cardInfo: actionToExecute.payload?.card ? `${actionToExecute.payload.card.rank}${actionToExecute.payload.card.suit}` : 'no card'
      });

      const newGameState = this.actionRouter.executeAction(gameId, playerIndex, actionToExecute);

      this.logger.info('EXECUTE-ACTION COMPLETED SUCCESSFULLY:', {
        gameId: gameId,
        actionType: actionToExecute.type,
        currentPlayer: newGameState.currentPlayer,
        tableCardCount: newGameState.tableCards?.length || 0
      });

      // Broadcast to all game players
      this.broadcaster.broadcastGameUpdate(gameId, newGameState);

    } catch (error) {
      // 🚨 [DEBUG] Log full error details for debugging
      this.logger.error('FULL ERROR DETAILS - execute-action:', {
        event: 'execute-action',
        gameId,
        playerIndex,
        socketId: socket.id,
        input: {
          actionType: data.action?.type,
          payloadKeys: data.action?.payload ? Object.keys(data.action.payload) : []
        },
        error: {
          message: error.message,
          stack: error.stack,
          type: error.type || 'UNKNOWN_ERROR',
          originalError: error.originalError
        },
        timestamp: new Date().toISOString()
      });

      this.logger.error(`Execute action failed:`, error);
      this.broadcaster.sendError(socket, 'Action failed');
    }
  }

  /**
   * Validate player has permission to perform game actions
   */
  validatePlayerInGame(socket) {
    const gameId = this.matchmaking.getGameId(socket.id);
    if (!gameId) {
      return { valid: false, error: 'Not in an active game' };
    }

    const playerIndex = this.gameManager.getPlayerIndex(gameId, socket.id);
    if (playerIndex === null) {
      return { valid: false, error: 'Player not found in game' };
    }

    return { valid: true, gameId, playerIndex };
  }
}

module.exports = GameCoordinatorService;
