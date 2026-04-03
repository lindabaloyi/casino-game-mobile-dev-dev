/**
 * UnifiedMatchmakingService
 * Centralized matchmaking service that handles all game types:
 * - Duel (2-player)
 * - Three-hands (3-player)
 * - Party (4-player with teams)
 * - Free-for-all (4-player without teams)
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;

class UnifiedMatchmakingService {
  constructor(gameManager, io = null) {
    this.gameManager = gameManager;
    this.io = io;

    // Map of gameType → waiting players queue
    this.waitingQueues = {};

    // Room codes for each matchmaking queue (gameType → roomCode)
    this.queueRoomCodes = {};

    // Initialize queues for all game types
    Object.keys(GAME_TYPES).forEach(type => {
      this.waitingQueues[type] = [];
      this.queueRoomCodes[type] = null;
    });

    // Shared mappings
    this.socketGameMap = new Map();      // socketId → {gameId, gameType}
    this.gameSocketsMap = new Map();     // gameId → [socketIds]
  }

  // Generate a unique 6-character room code for matchmaking queues
  _generateQueueRoomCode() {
    let code;
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      attempts++;
    } while (this._isCodeTaken(code) && attempts < 100);
    return code;
  }

  _isCodeTaken(code) {
    // Check if code is already used in any queue
    return Object.values(this.queueRoomCodes).includes(code);
  }

  // Get or create a room code for a specific game type queue
  getQueueRoomCode(gameType) {
    if (!this.queueRoomCodes[gameType]) {
      this.queueRoomCodes[gameType] = this._generateQueueRoomCode();
      console.log(`[UnifiedMatchmaking] Generated room code ${this.queueRoomCodes[gameType]} for ${gameType} queue`);
    }
    return this.queueRoomCodes[gameType];
  }

  // Clear room code when queue is emptied (game started)
  clearQueueRoomCode(gameType) {
    this.queueRoomCodes[gameType] = null;
  }

  // Add player to specific game type queue
  addToQueue(socket, gameType, userId = null) {
    console.log(`[UnifiedMatchmaking] addToQueue called: gameType=${gameType}, userId=${userId}, socket.id=${socket.id}`);
    
    // Validation: not already in queue/game
    if (this.socketGameMap.has(socket.id)) {
      console.log(`[UnifiedMatchmaking] Socket ${socket.id} already in queue/game, skipping`);
      return null;
    }

    // Store socket with userId metadata
    const socketEntry = { 
      id: socket.id, 
      socket: socket,
      userId: userId 
    };
    
    console.log(`[UnifiedMatchmaking] Adding to ${gameType} queue:`, socketEntry);
    this.waitingQueues[gameType].push(socketEntry);
    this.socketGameMap.set(socket.id, { gameId: null, gameType, userId });

    console.log(`[UnifiedMatchmaking] ${gameType} queue now has ${this.waitingQueues[gameType].length} players`);
    return this._tryCreateGame(gameType);
  }

  // Try to create game for specific type when enough players
  _tryCreateGame(gameType) {
    const config = GAME_TYPES[gameType];
    const queue = this.waitingQueues[gameType];
    
    console.log(`[UnifiedMatchmaking] _tryCreateGame for ${gameType}: queue.length=${queue.length}, minPlayers=${config.minPlayers}`);

    if (queue.length < config.minPlayers) {
      console.log(`[UnifiedMatchmaking] Not enough players for ${gameType}, need ${config.minPlayers}, have ${queue.length}`);
      return null;
    }

    // Validate we have exactly the required number
    if (queue.length !== config.minPlayers) {
      console.error(`[UnifiedMatchmaking] Expected ${config.minPlayers} players for ${gameType}, have ${queue.length}`);
      return null;
    }

    // Extract players (socketEntry objects)
    const playerEntries = queue.splice(0, config.minPlayers);
    console.log(`[UnifiedMatchmaking] Extracted ${playerEntries.length} players from ${gameType} queue`);

    // Validate sockets
    for (const entry of playerEntries) {
      if (!entry || !entry.socket || !entry.socket.id) {
        console.error(`[UnifiedMatchmaking] Invalid socket in ${gameType} queue`);
        return null;
      }
      console.log(`[UnifiedMatchmaking] Player entry: socket.id=${entry.socket.id}, userId=${entry.userId}`);
    }

    // Extract actual sockets and userIds
    const players = playerEntries.map(e => e.socket);
    const userIds = playerEntries.map(e => e.userId);
    console.log(`[UnifiedMatchmaking] Ready to create ${gameType} game with userIds:`, userIds);

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

    // Map sockets → gameId (overwrite entries that had gameId: null from joining queue)
    for (let i = 0; i < players.length; i++) {
      this.socketGameMap.set(players[i].id, { gameId, gameType, userId: userIds[i] });
      // Join socket to game room for room-based broadcasts (e.g., all-clients-ready)
      players[i].join(gameId);
      console.log(`[UnifiedMatchmaking] Socket ${players[i].id.substr(0,8)} joined game room ${gameId}`);
    }
    this.gameSocketsMap.set(gameId, players.map(p => p.id));
    
    console.log(`[UnifiedMatchmaking] socketGameMap updated for ${gameType} game ${gameId}:`, 
      players.map((socket, i) => `${socket.id.substr(0,8)}→{gameId:${gameId}, gameType:${gameType}}`).join(', '));

    // Register players (pass userIds)
    config.playerRegistration(gameId, players, this.gameManager, userIds);
    
    // Also set userId on gameState players directly (for persistence)
    for (let i = 0; i < players.length; i++) {
      if (userIds[i]) {
        this.gameManager.setPlayerUserId(gameId, i, userIds[i]);
      }
    }

    return {
      gameId,
      gameState,
      players: players.map((socket, index) => ({ 
        socket, 
        playerNumber: index,
        userId: userIds[index] 
      }))
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

    // Safety check: ensure gameType is valid
    if (!gameType || !this.waitingQueues[gameType]) {
      console.log(`[UnifiedMatchmaking] Unknown gameType on disconnect: ${gameType}, socket: ${socket.id}`);
      this.socketGameMap.delete(socket.id);
      return null;
    }

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
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      // Register players 0, 1
      for (let i = 0; i < 2; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  'three-hands': {
    minPlayers: 3,
    maxPlayers: 3,
    createGame: (gameManager) => gameManager.startGame(3, false),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      // Register players 0, 1, 2
      for (let i = 0; i < 3; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  'four-hands': {
    minPlayers: 4,
    maxPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, false),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      // Register players 0, 1, 2, 3
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  party: {
    minPlayers: 4,
    maxPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, true),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      // Register players 0, 1, 2, 3
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  // freeforall is kept for quick play matchmaking (same as four-hands but different queue)
  freeforall: {
    minPlayers: 4,
    maxPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, false),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      // Register players 0, 1, 2, 3
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  // Tournament mode - 4-player knockout
  tournament: {
    minPlayers: 4,
    maxPlayers: 4,
    createGame: (gameManager) => gameManager.startTournamentGame(),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      // Register players 0, 1, 2, 3
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  }
};

module.exports = UnifiedMatchmakingService;