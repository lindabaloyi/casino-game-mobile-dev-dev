/**
 * BroadcasterService
 * Handles message broadcasting and game state distribution
 * Extracted from socket-server.js for better separation of concerns
 */

class BroadcasterService {
  constructor(matchmakingService, gameManager, io, partyMatchmakingService = null) {
    this.matchmaking = matchmakingService;
    this.gameManager = gameManager;
    this.io = io;
    this.partyMatchmaking = partyMatchmakingService;
  }

  /**
   * Broadcast game start to all players in a new game
   */
  broadcastGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;

    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-start", {
        gameId,
        gameState,
        playerNumber,
      });
    });
  }

  /**
   * Broadcast party game start to all 4 players in a new party game
   */
  broadcastPartyGameStart(gameResult) {
    const { gameId, gameState, players } = gameResult;

    players.forEach(({ socket, playerNumber }) => {
      socket.emit("game-start", {
        gameId,
        gameState,
        playerNumber,
        isPartyGame: true,
      });
    });
  }

  /**
   * Broadcast game update to all players in a game
   */
  broadcastGameUpdate(gameId, gameState, matchmakingService = null) {
    // Use the provided matchmaking service or default to regular matchmaking
    const mm = matchmakingService || this.matchmaking;
    const gameSockets = mm.getGameSockets(gameId, this.io);

    if (gameSockets.length === 0) {
      return;
    }

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
      remainingSockets.forEach((otherSocket) => {
        otherSocket.emit("player-disconnected");
      });
    }
  }

  /**
   * Broadcast party disconnection to remaining players in party game
   */
  broadcastPartyDisconnection(gameId, disconnectedSocketId) {
    if (!this.partyMatchmaking) return;
    
    // Use party matchmaking's getGameSockets method
    const gameSockets = this.partyMatchmaking.getPartyGameSockets(gameId, this.io);

    const remainingSockets = gameSockets.filter(
      (socket) => socket.id !== disconnectedSocketId,
    );

    if (remainingSockets.length > 0) {
      remainingSockets.forEach((otherSocket) => {
        otherSocket.emit("player-disconnected");
      });
    }
  }

  /**
   * Send error message to a specific player
   */
  sendError(socket, message) {
    socket.emit("error", { message });
  }

  /**
   * Broadcast to all players in a game EXCEPT one socket
   * Used for drag events - sender doesn't need to receive their own broadcasts
   */
  broadcastToOthers(gameId, excludeSocketId, event, data, matchmakingService = null) {
    const mm = matchmakingService || this.matchmaking;
    const gameSockets = mm.getGameSockets(gameId, this.io);

    const otherSockets = gameSockets.filter(
      (socket) => socket.id !== excludeSocketId,
    );

    if (otherSockets.length > 0) {
      otherSockets.forEach((otherSocket) => {
        otherSocket.emit(event, data);
      });
    }
  }

  /**
   * Broadcast to ALL players in a game (including sender)
   * Used for round-end and game-over events
   */
  broadcastToGame(gameId, event, data, matchmakingService = null) {
    const mm = matchmakingService || this.matchmaking;
    const gameSockets = mm.getGameSockets(gameId, this.io);

    gameSockets.forEach((gameSocket) => {
      gameSocket.emit(event, data);
    });
  }
}

module.exports = BroadcasterService;
