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
  async handleGameAction(socket, data) {
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
      console.log('[DEBUG-SERVER] Executing action via ActionRouter:', {
        gameId,
        playerIndex,
        actionType: data.type,
        payloadKeys: Object.keys(data.payload || {}),
        timestamp: new Date().toISOString()
      });

      const newGameState = await this.actionRouter.executeAction(gameId, playerIndex, data);

      console.log('[DEBUG-SERVER] Action executed successfully:', {
        gameId,
        actionType: data.type,
        tableCardsBefore: this.gameManager.getGameState(gameId)?.tableCards?.length || 0,
        tableCardsAfter: newGameState.tableCards?.length || 0,
        broadcastingToClients: true,
        timestamp: new Date().toISOString()
      });

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
  async handleCardDrop(socket, data) {
    console.log('[SERVER] card-drop received', {
      playerId: data.draggedItem.player,
      draggedSource: data.draggedItem.source,
      targetType: data.targetInfo.type,
      draggedCardId: data.draggedItem.card.id,
      targetCardId: data.targetInfo.card?.id
    });

    const gameId = this.matchmaking.getGameId(socket.id);
    if (!gameId) {
      this.logger.error('[STAGING_DEBUG] ❌ CARD_DROP: Not in active game', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
      this.broadcaster.sendError(socket, 'Not in an active game');
      return;
    }

    // 🔍 [DEBUG] Log incoming client data
    this.logger.info('[STAGING_DEBUG] 📨 CLIENT PAYLOAD RECEIVED - card-drop:', {
      socketId: socket.id,
      gameId: gameId,
      requestId: data.requestId,
      draggedItem: {
        card: data.draggedItem.card ? `${data.draggedItem.card.rank}${data.draggedItem.card.suit} (val:${data.draggedItem.card.value})` : 'no card',
        source: data.draggedItem.source,
        player: data.draggedItem.player
      },
      targetInfo: {
        type: data.targetInfo.type,
        card: data.targetInfo.card ? `${data.targetInfo.card.rank}${data.targetInfo.card.suit} (val:${data.targetInfo.card.value})` : 'no card',
        index: data.targetInfo.index,
        draggedSource: data.targetInfo.draggedSource
      },
      isStagingCandidate: (data.draggedItem.source === 'hand' && data.targetInfo.type === 'loose'),
      timestamp: new Date().toISOString()
    });

    // Find player's index in the game
    const playerIndex = this.gameManager.getPlayerIndex(gameId, socket.id);
    if (playerIndex === null) {
      this.logger.error('[STAGING_DEBUG] ❌ CARD_DROP: Player not found in game', {
        socketId: socket.id,
        gameId: gameId,
        timestamp: new Date().toISOString()
      });
      this.broadcaster.sendError(socket, 'Player not found in game');
      return;
    }

    this.logger.info('[STAGING_DEBUG] 👤 PLAYER VALIDATED:', {
      socketId: socket.id,
      gameId: gameId,
      playerIndex: playerIndex,
      proceedingToDetermineActions: true
    });

    try {
      // 🔍 DEBUG: Log what we're sending to determineActions
      this.logger.info('[STAGING_DEBUG] 🎯 CALLING determineActions with:', {
        gameId,
        playerIndex,
        draggedItem: {
          card: data.draggedItem.card ? `${data.draggedItem.card.rank}${data.draggedItem.card.suit}` : 'no card',
          source: data.draggedItem.source,
          player: data.draggedItem.player
        },
        targetInfo: {
          type: data.targetInfo.type,
          card: data.targetInfo.card ? `${data.targetInfo.card.rank}${data.targetInfo.card.suit}` : 'no card',
          index: data.targetInfo.index,
          draggedSource: data.targetInfo.draggedSource
        },
        stagingExpected: (data.draggedItem.source === 'hand' && data.targetInfo.type === 'loose')
      });

      // Use GameManager's determineActions (which will delegate to logic module)
      const result = this.gameManager.determineActions(gameId, data.draggedItem, data.targetInfo);

      console.log('[SERVER] determineActions result', {
        actionCount: result.actions.length,
        actionTypes: result.actions.map(a => a.type)
      });

      this.logger.info('[STAGING_DEBUG] 📋 determineActions RESULT:', {
        gameId,
        playerIndex,
        hasActions: result.actions?.length > 0,
        actionCount: result.actions?.length || 0,
        requiresModal: result.requiresModal,
        errorMessage: result.errorMessage,
        actionTypes: result.actions?.map(a => a.type) || [],
        isStagingAction: result.actions?.some(a => a.type === 'tableCardDrop'),
        timestamp: new Date().toISOString()
      });

      if (result.errorMessage) {
        this.logger.error('[STAGING_DEBUG] ❌ CARD_DROP BLOCKED by determineActions:', {
          gameId,
          playerIndex,
          errorMessage: result.errorMessage,
          draggedCard: data.draggedItem.card ? `${data.draggedItem.card.rank}${data.draggedItem.card.suit}` : 'no card',
          targetCard: data.targetInfo.card ? `${data.targetInfo.card.rank}${data.targetInfo.card.suit}` : 'no card',
          timestamp: new Date().toISOString()
        });
        this.broadcaster.sendError(socket, result.errorMessage);
        return;
      }

      // 🎯 NEW: Check for data packets first (like showTempStackOptions)
      if (result.dataPackets && result.dataPackets.length > 0) {
        // Send data packets to frontend instead of executing as actions
        this.logger.info('[STAGING_DEBUG] 📦 SENDING DATA PACKETS TO CLIENT:', {
          gameId,
          playerIndex,
          dataPacketCount: result.dataPackets.length,
          dataPacketTypes: result.dataPackets.map(dp => dp.type),
          requestId: data.requestId,
          timestamp: new Date().toISOString()
        });

        // Send each data packet to the client
        result.dataPackets.forEach(dataPacket => {
          if (dataPacket.type === 'showTempStackOptions') {
            // Send temp stack options for modal display
            this.broadcaster.sendTempStackOptions(socket, dataPacket.payload, data.requestId);
          }
        });

      } else if (result.actions.length === 1 && !result.requiresModal) {
        // Auto-execute single action
        const actionToExecute = result.actions[0];
        this.logger.info('[STAGING_DEBUG] ⚡ AUTO-EXECUTING SINGLE ACTION:', {
          gameId,
          playerIndex,
          actionType: actionToExecute.type,
          isStagingAction: actionToExecute.type === 'tableCardDrop',
          draggedCard: data.draggedItem.card ? `${data.draggedItem.card.rank}${data.draggedItem.card.suit}` : 'no card',
          targetCard: data.targetInfo.card ? `${data.targetInfo.card.rank}${data.targetInfo.card.suit}` : 'no card',
          proceedingToActionRouter: true
        });

        // ✅ FIX: Inject gameId into action payload before execution
        // Remove undefined gameId from client payload first
        const { gameId: undefinedGameId, ...cleanPayload } = actionToExecute.payload;

        const finalActionToExecute = {
          type: actionToExecute.type,
          payload: {
            ...cleanPayload,  // Clean payload without undefined gameId
            gameId  // 🔧 Add the correct gameId
          }
        };

        this.logger.info('[STAGING_DEBUG] 🚀 EXECUTING ACTION VIA ActionRouter:', {
          gameId,
          playerIndex,
          actionType: finalActionToExecute.type,
          payloadKeys: Object.keys(finalActionToExecute.payload),
          hasGameId: !!finalActionToExecute.payload.gameId,
          timestamp: new Date().toISOString()
        });

        const newGameState = await this.actionRouter.executeAction(gameId, playerIndex, finalActionToExecute);

        this.logger.info('[STAGING_DEBUG] ✅ ACTION EXECUTED SUCCESSFULLY:', {
          gameId,
          playerIndex,
          actionType: finalActionToExecute.type,
          newCurrentPlayer: newGameState.currentPlayer,
          tableCardCountBefore: this.gameManager.getGameState(gameId).tableCards.length,
          tableCardCountAfter: newGameState.tableCards.length,
          broadcastingToClients: true,
          timestamp: new Date().toISOString()
        });

        // Broadcast to all game players
        this.broadcaster.broadcastGameUpdate(gameId, newGameState);

      } else if (result.actions.length > 0) {
        // Send action choices to client for modal selection
        this.logger.info('[STAGING_DEBUG] 📤 SENDING ACTION CHOICES TO CLIENT:', {
          gameId,
          playerIndex,
          actionCount: result.actions.length,
          actionTypes: result.actions.map(a => a.type),
          requestId: data.requestId,
          requiresModal: true,
          timestamp: new Date().toISOString()
        });
        this.broadcaster.sendActionChoices(socket, result.actions, data.requestId);
      } else {
        this.logger.warn('[STAGING_DEBUG] ⚠️ NO VALID ACTIONS FOUND:', {
          gameId,
          playerIndex,
          draggedCard: data.draggedItem.card ? `${data.draggedItem.card.rank}${data.draggedItem.card.suit}` : 'no card',
          targetType: data.targetInfo.type,
          sendingErrorToClient: true,
          timestamp: new Date().toISOString()
        });
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
  async handleExecuteAction(socket, data) {
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

      const newGameState = await this.actionRouter.executeAction(gameId, playerIndex, actionToExecute);

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
