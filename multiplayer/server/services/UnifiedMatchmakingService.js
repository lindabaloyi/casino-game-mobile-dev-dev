/**
 * UnifiedMatchmakingService
 * Centralized matchmaking service that handles all game types
 * Uses QueueManager for queue operations and SocketRegistry for socket mappings
 */

const QueueManager = require("./QueueManager");
const SocketRegistry = require("./SocketRegistry");
const CleanupScheduler = require("./CleanupScheduler");

const GAME_TYPES = {
  'two-hands': {
    minPlayers: 2,
    createGame: (gameManager) => gameManager.startGame(2, false),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      for (let i = 0; i < 2; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  'three-hands': {
    minPlayers: 3,
    createGame: (gameManager) => gameManager.startGame(3, false),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      for (let i = 0; i < 3; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  'four-hands': {
    minPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, false),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  'party': {
    minPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, true),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  'freeforall': {
    minPlayers: 4,
    createGame: (gameManager) => gameManager.startGame(4, false),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  },
  'tournament': {
    minPlayers: 4,
    createGame: (gameManager) => gameManager.startTournamentGame(),
    playerRegistration: (gameId, players, gameManager, userIds = []) => {
      for (let i = 0; i < 4; i++) {
        gameManager.addPlayerToGame(gameId, players[i].id, i, userIds[i] || null);
      }
    }
  }
};

class UnifiedMatchmakingService {
  constructor(gameManager, io = null) {
    this.gameManager = gameManager;
    this.io = io;

    this.queueManager = new QueueManager(gameManager);
    this.socketRegistry = new SocketRegistry();
    this.cleanupScheduler = new CleanupScheduler(this.queueManager, this.socketRegistry);
    this.cleanupScheduler.start();
  }

  get socketGameMap() {
    return this.socketRegistry.socketGameMap;
  }

  get gameSocketsMap() {
    return this.socketRegistry.gameSocketsMap;
  }

  get waitingQueues() {
    return this.queueManager.waitingQueues;
  }

  getQueueRoomCode(gameType) {
    return this.queueManager.getQueueRoomCode(gameType);
  }

  clearQueueRoomCode(gameType) {
    return this.queueManager.clearQueueRoomCode(gameType);
  }

  addToQueue(socket, gameType, userId = null) {
    if (this.socketRegistry.get(socket.id)) {
      console.log(`[UnifiedMatchmaking] Socket ${socket.id} already in queue/game, skipping`);
      return null;
    }

    this.socketRegistry.set(socket.id, null, gameType, userId);
    const playerEntries = this.queueManager.addToQueue(socket, gameType, userId);

    if (!playerEntries) {
      return null;
    }

    return this._createGame(gameType, playerEntries);
  }

  _createGame(gameType, playerEntries) {
    const config = GAME_TYPES[gameType];
    const players = playerEntries.map(e => e.socket);
    const userIds = playerEntries.map(e => e.userId);

    console.log(`[UnifiedMatchmaking] Ready to create ${gameType} game with userIds:`, userIds);

    const { gameId, gameState } = config.createGame(this.gameManager);
    if (!gameState) {
      console.error(`[UnifiedMatchmaking] Failed to create ${gameType} game state`);
      return null;
    }

    if (gameState.players.length !== config.minPlayers) {
      console.error(`[UnifiedMatchmaking] ${gameType} game has wrong player count: ${gameState.players.length}`);
      return null;
    }

    const socketIds = [];
    for (let i = 0; i < players.length; i++) {
      this.socketRegistry.set(players[i].id, gameId, gameType, userIds[i]);
      players[i].join(gameId);
      socketIds.push(players[i].id);
      console.log(`[UnifiedMatchmaking] Socket ${players[i].id.substr(0,8)} joined game room ${gameId}`);
    }
    this.socketRegistry.setGameSockets(gameId, socketIds);

    console.log(`[UnifiedMatchmaking] socketGameMap updated for ${gameType} game ${gameId}:`,
      players.map((socket, i) => `${socket.id.substr(0,8)}→{gameId:${gameId}, gameType:${gameType}}`).join(', '));

    config.playerRegistration(gameId, players, this.gameManager, userIds);

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

  handleDisconnection(socket) {
    return this.socketRegistry.handleDisconnection(socket, this.gameManager);
  }

  getGameId(socketId) {
    const info = this.socketRegistry.get(socketId);
    return info ? info.gameId : null;
  }

  getGameType(socketId) {
    const info = this.socketRegistry.get(socketId);
    return info ? info.gameType : null;
  }

  getGameSockets(gameId, io) {
    const socketIds = this.socketRegistry.getGameSockets(gameId);
    return socketIds
      .map(id => io.sockets.sockets.get(id))
      .filter(Boolean);
  }

  getWaitingCount(gameType) {
    return this.queueManager.getWaitingCount(gameType);
  }

  getPlayersNeeded(gameType) {
    return this.queueManager.getPlayersNeeded(gameType);
  }

  getWaitingPlayersCount() {
    return this.getWaitingCount('two-hands');
  }

  getActiveGamesCount() {
    return this.socketRegistry.getActiveGamesCount();
  }

  getQueueStatus(gameType) {
    return this.queueManager.getQueueStatus(gameType);
  }

  broadcastWaitingUpdate(gameType) {
    return this.queueManager.broadcastWaitingUpdate(gameType);
  }

  isUserInQueue(userId) {
    return this.socketRegistry.isUserInQueue(userId, this.queueManager);
  }

  isUserInGame(userId) {
    return this.socketRegistry.isUserInGame(userId);
  }

  shutdown() {
    this.cleanupScheduler.stop();
  }
}

module.exports = UnifiedMatchmakingService;
