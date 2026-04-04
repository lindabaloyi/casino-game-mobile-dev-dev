/**
 * SocketRegistry
 * Manages socket-to-game mappings and handles disconnections
 */

class SocketRegistry {
  constructor() {
    this.socketGameMap = new Map();
    this.gameSocketsMap = new Map();
  }

  set(socketId, gameId, gameType, userId) {
    this.socketGameMap.set(socketId, { gameId, gameType, userId });
  }

  get(socketId) {
    return this.socketGameMap.get(socketId);
  }

  delete(socketId) {
    this.socketGameMap.delete(socketId);
  }

  getGameSockets(gameId) {
    return this.gameSocketsMap.get(gameId) || [];
  }

  setGameSockets(gameId, socketIds) {
    this.gameSocketsMap.set(gameId, socketIds);
  }

  addSocketToGame(gameId, socketId) {
    const existing = this.gameSocketsMap.get(gameId) || [];
    if (!existing.includes(socketId)) {
      existing.push(socketId);
      this.gameSocketsMap.set(gameId, existing);
    }
  }

  cleanupGame(gameId) {
    const socketIds = this.gameSocketsMap.get(gameId) || [];
    socketIds.forEach(socketId => {
      this.socketGameMap.delete(socketId);
    });
    this.gameSocketsMap.delete(gameId);
  }

  isUserInQueue(userId, queueManager) {
    if (!queueManager || !userId) return false;
    const allQueues = queueManager.getAllQueues();
    for (const gameType of Object.keys(allQueues)) {
      const queue = allQueues[gameType];
      if (queue.some(entry => entry.userId === userId)) {
        return true;
      }
    }
    return false;
  }

  isUserInGame(userId) {
    for (const [socketId, info] of this.socketGameMap) {
      if (info.userId === userId && info.gameId) {
        return { socketId, ...info };
      }
    }
    return null;
  }

  handleDisconnection(socket, gameManager) {
    const socketInfo = this.socketGameMap.get(socket.id);
    if (!socketInfo) {
      return null;
    }

    const { gameId, gameType } = socketInfo;

    if (!gameId) {
      this.socketGameMap.delete(socket.id);
      return null;
    }

    this.socketGameMap.delete(socket.id);

    const sockets = (this.gameSocketsMap.get(gameId) || []).filter(id => id !== socket.id);

    if (sockets.length === 0) {
      this.gameSocketsMap.delete(gameId);
      if (gameManager) {
        gameManager.endGame(gameId);
      }
    } else {
      this.gameSocketsMap.set(gameId, sockets);
    }

    return { gameId, remainingSockets: sockets };
  }

  getActiveGamesCount() {
    const unique = new Set(
      [...this.socketGameMap.values()]
        .filter(info => info && info.gameId)
        .map(info => info.gameId)
    );
    return unique.size;
  }
}

module.exports = SocketRegistry;
