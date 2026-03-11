/**
 * MatchmakingService
 * Queues players and pairs them into games when two are ready.
 */

class MatchmakingService {
  constructor(gameManager) {
    this.gameManager = gameManager;

    /** Sockets waiting for an opponent */
    this.waitingPlayers = [];

    /** socketId → gameId */
    this.socketGameMap = new Map();

    /** gameId → socketId[] */
    this.gameSocketsMap = new Map();
  }

  // ── Queue management ──────────────────────────────────────────────────────

  /**
   * Add a socket to the queue. If two players are waiting, start a game.
   * @returns {object|null} game result object if a game was created, else null
   */
  addToQueue(socket) {
    this.waitingPlayers.push(socket);
    this.socketGameMap.set(socket.id, null);
    return this._tryCreateGame();
  }

  _tryCreateGame() {
    if (this.waitingPlayers.length < 2) return null;

    const [p1, p2] = this.waitingPlayers.splice(0, 2);

    const { gameId, gameState } = this.gameManager.startGame();

    // Map sockets → gameId
    this.socketGameMap.set(p1.id, gameId);
    this.socketGameMap.set(p2.id, gameId);
    this.gameSocketsMap.set(gameId, [p1.id, p2.id]);

    // Register players in GameManager
    this.gameManager.addPlayerToGame(gameId, p1.id, 0);
    this.gameManager.addPlayerToGame(gameId, p2.id, 1);

    return {
      gameId,
      gameState,
      players: [
        { socket: p1, playerNumber: 0 },
        { socket: p2, playerNumber: 1 },
      ],
    };
  }

  // ── Disconnection ─────────────────────────────────────────────────────────

  /**
   * Clean up when a socket disconnects.
   * @returns {{ gameId, remainingSockets }|null}
   */
  handleDisconnection(socket) {
    // Remove from queue if still waiting
    this.waitingPlayers = this.waitingPlayers.filter(s => s.id !== socket.id);

    const gameId = this.socketGameMap.get(socket.id);
    this.socketGameMap.delete(socket.id);

    if (!gameId) return null;

    const sockets = (this.gameSocketsMap.get(gameId) || []).filter(id => id !== socket.id);
    this.gameSocketsMap.set(gameId, sockets);

    return { gameId, remainingSockets: sockets };
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  getGameId(socketId) {
    return this.socketGameMap.get(socketId) || null;
  }

  getGameSockets(gameId, io) {
    return (this.gameSocketsMap.get(gameId) || [])
      .map(id => io.sockets.sockets.get(id))
      .filter(Boolean);
  }

  /**
   * Get sockets for a party game (stub - uses same gameSocketsMap)
   */
  getPartyGameSockets(gameId, io) {
    return this.getGameSockets(gameId, io);
  }

  /**
   * Remove a socket from the queue (used when player joins party queue instead)
   */
  removeFromQueue(socketId) {
    const wasInQueue = this.waitingPlayers.some(s => s.id === socketId);
    this.waitingPlayers = this.waitingPlayers.filter(s => s.id !== socketId);
    this.socketGameMap.delete(socketId);
    return wasInQueue;
  }

  getWaitingPlayersCount() {
    return this.waitingPlayers.length;
  }

  getActiveGamesCount() {
    const unique = new Set([...this.socketGameMap.values()].filter(Boolean));
    return unique.size;
  }
}

module.exports = MatchmakingService;
