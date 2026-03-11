/**
 * PartyMatchmakingService
 * Manages 4-player party game matchmaking.
 * Queues players and starts a game when 4 are ready.
 */

class PartyMatchmakingService {
  constructor(gameManager, io = null) {
    this.gameManager = gameManager;
    this.io = io;

    /** Sockets waiting for a party game */
    this.waitingPlayers = [];

    /** socketId → gameId */
    this.socketGameMap = new Map();

    /** gameId → socketId[] */
    this.gameSocketsMap = new Map();
  }

  // ── Queue management ──────────────────────────────────────────────────────

  /**
   * Add a socket to the party queue. If 4 players are waiting, start a party game.
   * @returns {object|null} game result object if a game was created, else null
   */
  addToQueue(socket) {
    // Don't add if already in a game or queue
    if (this.socketGameMap.has(socket.id)) {
      return null;
    }

    this.waitingPlayers.push(socket);
    this.socketGameMap.set(socket.id, null);
    
    return this._tryCreatePartyGame();
  }

  /**
   * Broadcast party-waiting event to ALL waiting players
   * This ensures all players in the lobby see the updated count
   */
  broadcastPartyWaiting(io) {
    const count = this.waitingPlayers.length;
    
    this.waitingPlayers.forEach(playerSocket => {
      playerSocket.emit('party-waiting', { playersJoined: count });
    });
  }

  /**
   * Alias for addToQueue
   */
  addToPartyQueue(socket) {
    return this.addToQueue(socket);
  }

  /**
   * Alias for handleDisconnection
   */
  handlePartyDisconnection(socket) {
    return this.handleDisconnection(socket);
  }

  _tryCreatePartyGame() {
    if (this.waitingPlayers.length < 4) {
      return null;
    }

    // CRITICAL: Verify we have exactly 4 ready sockets
    if (this.waitingPlayers.length !== 4) {
      console.error(`[PartyMatchmaking] ❌ Cannot start game - expected 4 players, have ${this.waitingPlayers.length}`);
      return null;
    }

    const players = this.waitingPlayers.splice(0, 4);

    // Validate all sockets are connected and valid
    for (let i = 0; i < players.length; i++) {
      if (!players[i] || !players[i].id) {
        console.error(`[PartyMatchmaking] ❌ Invalid socket at index ${i}`);
        return null;
      }
    }

    // Start a 4-player game
    const { gameId, gameState } = this.gameManager.startPartyGame();

    // Validate game state was created properly
    if (!gameState) {
      console.error(`[PartyMatchmaking] ❌ Failed to create game state`);
      return null;
    }

    if (gameState.players.length !== 4) {
      console.error(`[PartyMatchmaking] ❌ Game state has wrong player count: ${gameState.players.length}`);
      return null;
    }

    // Validate each player has 10 cards
    for (let i = 0; i < 4; i++) {
      if (!gameState.players[i].hand || gameState.players[i].hand.length !== 10) {
        console.error(`[PartyMatchmaking] ❌ Player ${i} has wrong hand size: ${gameState.players[i].hand?.length}`);
        return null;
      }
    }

    // Map sockets → gameId
    for (const p of players) {
      this.socketGameMap.set(p.id, gameId);
    }
    this.gameSocketsMap.set(gameId, players.map(p => p.id));

    // Register players in GameManager (0, 1, 2, 3)
    for (let i = 0; i < 4; i++) {
      this.gameManager.addPlayerToGame(gameId, players[i].id, i);
    }

    return {
      gameId,
      gameState,
      players: players.map((socket, index) => ({
        socket,
        playerNumber: index
      })),
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
    
    if (!gameId) {
      // Wasn't in a game, just return
      this.socketGameMap.delete(socket.id);
      return null;
    }

    this.socketGameMap.delete(socket.id);

    const sockets = (this.gameSocketsMap.get(gameId) || []).filter(id => id !== socket.id);
    
    if (sockets.length === 0) {
      // No more players in this game, clean up
      this.gameSocketsMap.delete(gameId);
      this.gameManager.endGame(gameId);
    } else {
      this.gameSocketsMap.set(gameId, sockets);
    }

    return { gameId, remainingSockets: sockets };
  }

  // ── Lookups ─────────────────────────────────────────────────────────────

  getGameId(socketId) {
    return this.socketGameMap.get(socketId) || null;
  }

  /**
   * Get game ID for party (alias for getGameId)
   */
  getPartyGameId(socketId) {
    return this.getGameId(socketId);
  }

  getGameSockets(gameId, io) {
    return (this.gameSocketsMap.get(gameId) || [])
      .map(id => io.sockets.sockets.get(id))
      .filter(Boolean);
  }

  /**
   * Get sockets for a party game (alias for getGameSockets)
   */
  getPartyGameSockets(gameId, io) {
    return this.getGameSockets(gameId, io);
  }

  getWaitingPlayersCount() {
    return this.waitingPlayers.length;
  }

  /**
   * Get socket IDs of all waiting players (for broadcasting)
   */
  getWaitingPlayerIds() {
    return this.waitingPlayers.map(s => s.id);
  }

  /**
   * Get waiting party players count (alias)
   */
  getWaitingPartyPlayersCount() {
    return this.getWaitingPlayersCount();
  }

  /**
   * Get the number of players needed to start a party game
   */
  getPlayersNeeded() {
    return Math.max(0, 4 - this.waitingPlayers.length);
  }

  /**
   * Get current party queue status
   */
  getQueueStatus() {
    return {
      waiting: this.waitingPlayers.length,
      needed: this.getPlayersNeeded()
    };
  }
}

module.exports = PartyMatchmakingService;
