/**
 * UnifiedMatchmakingService
 * Centralized matchmaking service that handles all game types
 * Uses QueueManager for queue operations and SocketRegistry for socket mappings
 */

const QueueManager = require("./QueueManager");
const SocketRegistry = require("./SocketRegistry");
const CleanupScheduler = require("./CleanupScheduler");
const GameFactory = require("./GameFactory");

class UnifiedMatchmakingService {
  constructor(gameManager, io = null) {
    this.gameManager = gameManager;
    this.io = io;

    this.queueManager = new QueueManager(gameManager);
    this.socketRegistry = new SocketRegistry();
    this.gameFactory = new GameFactory(gameManager);
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
    console.log('[Matchmaking] addToQueue called, gameType:', gameType, 'userId:', userId);
    if (this.socketRegistry.get(socket.id)) {
      console.log('[Matchmaking] Socket', socket.id, 'already in queue/game, skipping');
      return null;
    }

    this.socketRegistry.set(socket.id, null, gameType, userId);
    const playerEntries = this.queueManager.addToQueue(socket, gameType, userId);
    console.log('[Matchmaking] queueManager.addToQueue returned, playerEntries:', playerEntries?.length);

    if (!playerEntries) {
      console.log('[Matchmaking] playerEntries is null, returning null');
      return null;
    }

    console.log('[Matchmaking] calling _createGame with', playerEntries.length, 'players');
    return this._createGame(gameType, playerEntries);
  }

  _createGame(gameType, playerEntries) {
    console.log('[Matchmaking] _createGame called, gameType:', gameType, 'players:', playerEntries?.length);
    const result = this.gameFactory.createGame(gameType, playerEntries);
    if (!result) {
      console.log('[Matchmaking] gameFactory.createGame returned null');
      return null;
    }
    console.log('[Matchmaking] game created, gameId:', result.gameId);

    const { gameId, gameState, players } = result;

    const socketIds = [];
    for (let i = 0; i < players.length; i++) {
      const { socket, userId } = players[i];
      this.socketRegistry.set(socket.id, gameId, gameType, userId);
      socket.join(gameId);
      socketIds.push(socket.id);
      console.log(`[UnifiedMatchmaking] Socket ${socket.id.substr(0,8)} joined game room ${gameId}`);
    }
    this.socketRegistry.setGameSockets(gameId, socketIds);

    console.log(`[UnifiedMatchmaking] socketGameMap updated for ${gameType} game ${gameId}:`,
      players.map(p => `${p.socket.id.substr(0,8)}→{gameId:${gameId}, gameType:${gameType}}`).join(', '));

    return { gameId, gameState, players };
  }

  _createGameFromEntries(gameType, playerEntries) {
    console.log(`[UnifiedMatchmaking] _createGameFromEntries called for ${gameType} with ${playerEntries.length} players`);
    return this._createGame(gameType, playerEntries);
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
