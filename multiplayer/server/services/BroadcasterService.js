/**
 * BroadcasterService
 * Handles message broadcasting and game state distribution
 * Extracted from socket-server.js for better separation of concerns
 */

const { createLogger } = require("../utils/logger");

class BroadcasterService {
  constructor(matchmakingService, gameManager, io) {
    this.logger = createLogger("BroadcasterService");
    this.matchmaking = matchmakingService;
    this.gameManager = gameManager;
    this.io = io;
  }

  /**
   * Broadcast game start to all players in a new game
   */
  broadcastGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;

    players.forEach(({ socket, playerNumber }) => {
      this.logger.info(
        `Starting game ${gameId} for Player ${playerNumber} (${socket.id})`,
      );
      socket.emit("game-start", {
        gameId,
        gameState,
        playerNumber,
      });
    });
  }

  /**
   * Broadcast game update to all players in a game
   */
  broadcastGameUpdate(gameId, gameState) {
    const gameSockets = this.matchmaking.getGameSockets(gameId, this.io);

    this.logger.info(
      `Broadcasting game-update to ${gameSockets.length} players in game ${gameId}`,
    );

    // Deep clone to avoid serializing internal references
    const stateToSend = JSON.parse(JSON.stringify(gameState));

    gameSockets.forEach((gameSocket) => {
      gameSocket.emit("game-update", stateToSend);
    });
  }

  /**
   * Broadcast disconnection to remaining players in game
   */
  broadcastDisconnection(gameId, disconnectedSocketId) {
    const gameSockets = this.matchmaking.getGameSockets(gameId, this.io);

    const remainingSockets = gameSockets.filter(
      (socket) => socket.id !== disconnectedSocketId,
    );

    if (remainingSockets.length > 0) {
      this.logger.info(
        `Notifying ${remainingSockets.length} remaining player(s) about disconnection in game ${gameId}`,
      );
      remainingSockets.forEach((otherSocket) => {
        otherSocket.emit("player-disconnected");
      });
    }
  }

  /**
   * Send action choices to a specific player
   */
  sendActionChoices(socket, actions, requestId) {
    socket.emit("action-choices", {
      requestId,
      actions,
    });
  }

  /**
   * Send temp stack options to a specific player
   */
  sendTempStackOptions(socket, payload, requestId) {
    socket.emit("temp-stack-options", {
      requestId,
      tempStackId: payload.tempStackId,
      availableOptions: payload.availableOptions,
    });
  }

  /**
   * Send error message to a specific player
   */
  sendError(socket, message) {
    socket.emit("error", { message });
  }
}

module.exports = BroadcasterService;
