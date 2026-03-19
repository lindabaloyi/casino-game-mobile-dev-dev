/**
 * UnifiedMatchmakingService
 * Centralized matchmaking service that handles all game types:
 * - Duel (2-player)
 * - Three-hands (3-player)
 * - Party (4-player with teams)
 * - Free-for-all (4-player without teams)
 */

class UnifiedMatchmakingService {
  constructor(gameManager, io = null) {
    this.gameManager = gameManager;
    this.io = io;

    // Map of gameType → waiting players queue
    this.waitingQueues = {};

    // Initialize queues for all game types
    Object.keys(GAME_TYPES).forEach(type => {
      this.waitingQueues[type] = [];
    });

    // Shared mappings
    this.socketGameMap = new Map();      // socketId → {gameId, gameType}
    this.gameSocketsMap = new Map();     // gameId → [socketIds]
  }

  // Add player to specific game type queue
  addToQueue(socket, gameType) {
    // Validation: not already in queue/game
    if (this.socketGameMap.has(socket.id)) {
      return null;
    }

    this.waitingQueues[gameType].push(socket);
    this.socketGameMap.set(socket.id, { gameId: null, gameType });

    return this._tryCreateGame(gameType);
  }

  // Try to create game for specific type when enough players
  _tryCreateGame(gameType) {
    const config = GAME_TYPES[gameType];
    const queue = this.waitingQueues[gameType];

    if (queue.length < config.minPlayers) {
      return null;
    }

    // Validate we have exactly the required number
    if (queue.length !== config.minPlayers) {
      console.error(`[UnifiedMatchmaking] Expected ${config.minPlayers} players for ${gameType}, have ${queue.length}`);
      return null;
    }

    // Extract players
    const players = queue.splice(0, config.minPlayers);

    // Validate sockets
    for (const socket of players) {
      if (!socket || !socket.id) {
        console.error(`[UnifiedMatchmaking] Invalid socket in ${gameType} queue`);
        return null;
      }
    }

    // Create game
    const { gameId, gameState } = config.createGame(this.gameManager);
    if (!gameState) {
      console.error(`[UnifiedMatchmaking] Failed to create ${gameType} game state`);
      return null;
    }

    // Validate player count
    if (gameState.players.length !== config.minPlayers) {
      console.error(`[UnifiedMatchmaking] ${gameType} game has wrong player count: ${gameState.players.length}`);
      return null;
    }

    // Map sockets → gameId
    for (const socket of players) {
      this.socketGameMap.set(socket.id, { gameId, gameType });
    }
    this.gameSocketsMap.set(gameId, players.map(p => p.id));

    // Register players
    config.playerRegistration(gameId, players, this.gameManager);

    return {
      gameId,
      gameState,
      players: players.map((socket, index) => ({ socket, playerNumber: index }))
    };
  }

  // Handle disconnection for any game type
  handleDisconnection(socket) {
    const socketInfo = this.socketGameMap.get(socket.id);
    if (!socketInfo) {
      // Not in any queue/game
      return null;
    }

    const { gameId, gameType } = socketInfo;

    // Remove from waiting queue if still waiting
    if (!gameId) {
      this.waitingQueues[gameType] = this.waitingQueues[gameType].filter(s => s.id !== socket.id);
      this.socketGameMap.delete(socket.id);
      return null;
    }

    // Handle in-game disconnection
    this.socketGameMap.delete(socket.id);

    const sockets = (this.gameSocketsMap.get(gameId) || []).filter(id => id !== socket.id);

    if (sockets.length === 0) {
      // Game ended
      this.gameSocketsMap.delete(gameId);
      this.gameManager.endGame(gameId);
    } else {
      this.gameSocketsMap.set(gameId, sockets);
    }

    return { gameId, remainingSockets: sockets };
  }

  // Lookup methods
  getGameId(socketId) {
    const info = this.socketGameMap.get(socketId);
    return info ? info.gameId : null;
  }

  getGameType(socketId) {
    const info = this.socketGameMap.get(socketId);
    return info ? info.gameType : null;
  }

  getGameSockets(gameId, io) {
    const socketIds = this.gameSocketsMap.get(gameId) || [];
    return socketIds
      .map(id => io.sockets.sockets.get(id))
      .filter(Boolean);
  }

  getWaitingCount(gameType) {
    return this.waitingQueues[gameType]?.length || 0;
  }

  getPlayersNeeded(gameType) {
    const config = GAME_TYPES[gameType];
    const waiting = this.getWaitingCount(gameType);
    return Math.max(0, config.minPlayers - waiting);
  }

  // Convenience methods for backward compatibility
  getWaitingPlayersCount() {
    return this.getWaitingCount('two-hands');
  }

  getActiveGamesCount() {
    const unique = new Set([...this.socketGameMap.values()].filter(Boolean).map(info => info.gameId));
    return unique.size;
  }
}

// Game type configurations - using client terminology
const GAME_TYPES = {
  'two-hands': { 
    minPlayers: 2, 
    maxPlayers: 2,
    createGame: (gameManager) => gameManager.startGame(2, false),
    playerRegistration: (gameId, players, gameManager) => {
      // Register players 0, 1
      for (let i = 0; i < 2; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i);
      }
    }
  },
  'three-hands': {
    minPlayers: 3,
    maxPlayers: 3,
    createGame: (gameManager) => gameManager.startGame(3, false),
    playerRegistration: (gameId, players, gameManager) => {
      // Register players 0, 1, 2
      for (let i = 0; i < 3; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i);
      }
    }
  },
  'four-hands': {
    minPlayers: 4,
    maxPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, false),
    playerRegistration: (gameId, players, gameManager) => {
      // Register players 0, 1, 2, 3
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i);
      }
    }
  },
  party: {
    minPlayers: 4,
    maxPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, true),
    playerRegistration: (gameId, players, gameManager) => {
      // Register players 0, 1, 2, 3
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i);
      }
    }
  },
  // freeforall is kept for quick play matchmaking (same as four-hands but different queue)
  freeforall: {
    minPlayers: 4,
    maxPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, false),
    playerRegistration: (gameId, players, gameManager) => {
      // Register players 0, 1, 2, 3
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i);
      }
    }
  },
  // Tournament mode - 4-player knockout
  tournament: {
    minPlayers: 4,
    maxPlayers: 4,
    createGame: (gameManager) => gameManager.startTournamentGame(),
    playerRegistration: (gameId, players, gameManager) => {
      // Register players 0, 1, 2, 3
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i);
      }
    }
  }
};

module.exports = UnifiedMatchmakingService;