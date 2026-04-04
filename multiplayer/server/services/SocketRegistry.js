/**
 * SocketRegistry - Manages mappings between sockets and games
 * Handles socket-to-game mappings and game room management
 */
class SocketRegistry {
  constructor(io) {
    this.io = io;
    this.socketGameMap = new Map();      // socketId → {gameId, gameType, userId}
    this.gameSocketsMap = new Map();     // gameId → [socketIds]
  }

  /**
   * Register a socket as part of a game
   * @param {string} socketId - Socket ID
   * @param {number} gameId - Game ID
   * @param {string} gameType - Type of game
   * @param {string|null} userId - User ID
   */
  set(socketId, gameId, gameType, userId = null) {
    this.socketGameMap.set(socketId, { gameId, gameType, userId });

    // Add to game sockets map only if this is an actual game (not a queue)
    if (gameId !== null) {
      if (!this.gameSocketsMap.has(gameId)) {
        this.gameSocketsMap.set(gameId, []);
      }
      if (!this.gameSocketsMap.get(gameId).includes(socketId)) {
        this.gameSocketsMap.get(gameId).push(socketId);
      }

      // Make socket join game room
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.connected) {
        socket.join(gameId);
        console.log(`[SocketRegistry] Socket ${socketId} joined game room ${gameId}`);
      }
    }
  }

  /**
   * Get game info for a socket
   * @param {string} socketId - Socket ID
   * @returns {Object|null} - {gameId, gameType, userId} or null
   */
  get(socketId) {
    return this.socketGameMap.get(socketId) || null;
  }

  /**
   * Remove a socket from all mappings
   * @param {string} socketId - Socket ID
   */
  delete(socketId) {
    const gameInfo = this.socketGameMap.get(socketId);
    if (gameInfo) {
      // Remove from game sockets map
      const gameSockets = this.gameSocketsMap.get(gameInfo.gameId);
      if (gameSockets) {
        const filtered = gameSockets.filter(id => id !== socketId);
        if (filtered.length === 0) {
          this.gameSocketsMap.delete(gameInfo.gameId);
        } else {
          this.gameSocketsMap.set(gameInfo.gameId, filtered);
        }
      }

      // Make socket leave game room
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.connected && gameInfo.gameId) {
        socket.leave(gameInfo.gameId);
        console.log(`[SocketRegistry] Socket ${socketId} left game room ${gameInfo.gameId}`);
      }

      this.socketGameMap.delete(socketId);
      console.log(`[SocketRegistry] Removed socket ${socketId} from registry`);
    }
  }

  /**
   * Get all socket IDs for a game
   * @param {number} gameId - Game ID
   * @returns {Array<string>} - Array of socket IDs
   */
  getGameSockets(gameId) {
    return this.gameSocketsMap.get(gameId) || [];
  }

  /**
   * Get all active game IDs
   * @returns {Array<number>} - Array of game IDs
   */
  getActiveGames() {
    return Array.from(this.gameSocketsMap.keys());
  }

  /**
   * Clean up mappings for an ended game
   * @param {number} gameId - Game ID to clean up
   */
  cleanupGame(gameId) {
    const socketIds = this.gameSocketsMap.get(gameId) || [];

    console.log(`[SocketRegistry] Cleaning up ${socketIds.length} sockets for ended game ${gameId}`);

    for (const socketId of socketIds) {
      // Make socket leave game room
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.connected) {
        socket.leave(gameId);
        console.log(`[SocketRegistry] Socket ${socketId} left game room ${gameId}`);
      }

      // Remove from socket map
      const existingInfo = this.socketGameMap.get(socketId);
      if (existingInfo && existingInfo.gameId === gameId) {
        this.socketGameMap.delete(socketId);
        console.log(`[SocketRegistry] Removed socket ${socketId} from game ${gameId}`);
      }
    }

    this.gameSocketsMap.delete(gameId);
    console.log(`[SocketRegistry] Completed cleanup for game ${gameId}`);
  }

  /**
   * Handle socket disconnection
   * @param {Object} socket - Socket object
   * @param {Function} endGameCallback - Callback to end game if needed
   * @returns {Object|null} - Disconnection result
   */
  handleDisconnection(socket, endGameCallback) {
    const gameInfo = this.socketGameMap.get(socket.id);
    if (!gameInfo) {
      return null;
    }

    const { gameId, gameType, userId } = gameInfo;

    // Make socket leave game room
    socket.leave(gameId);
    console.log(`[SocketRegistry] Socket ${socket.id} left game room ${gameId} on disconnect`);

    // Remove from mappings
    this.delete(socket.id);

    const remainingSockets = this.getGameSockets(gameId);

    console.log(`[SocketRegistry] Player disconnected from game ${gameId}, remaining: ${remainingSockets.length}`);

    if (remainingSockets.length === 0 && endGameCallback) {
      console.log(`[SocketRegistry] Ending game ${gameId} - no players remaining`);
      endGameCallback(gameId);
    }

    return {
      gameId,
      gameType,
      userId,
      remainingSockets: remainingSockets.length
    };
  }

  /**
   * Clean up empty game entries
   */
  cleanupEmptyGames() {
    for (const [gameId, sockets] of this.gameSocketsMap.entries()) {
      if (sockets.length === 0) {
        this.gameSocketsMap.delete(gameId);
        console.log(`[SocketRegistry] Cleaned up empty game entry: ${gameId}`);
      }
    }
  }

  /**
   * Get statistics for monitoring
   * @returns {Object} - Registry statistics
   */
  getStats() {
    // Clean up empty games before reporting stats
    this.cleanupEmptyGames();

    return {
      totalSockets: this.socketGameMap.size,
      activeGames: this.gameSocketsMap.size,
      gameSocketCounts: Array.from(this.gameSocketsMap.entries()).map(([gameId, sockets]) => ({
        gameId,
        socketCount: sockets.length
      }))
    };
  }
}

module.exports = SocketRegistry;