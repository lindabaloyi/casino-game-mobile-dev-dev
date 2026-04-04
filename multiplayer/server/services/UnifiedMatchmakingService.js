/**
 * UnifiedMatchmakingService - Refactored Orchestrator
 *
 * Thin coordinator that delegates to specialized components:
 * - QueueManager: queue storage and management
 * - SocketRegistry: socket ↔ game mappings and room management
 * - CleanupScheduler: periodic cleanup coordination
 * - GameFactory: game creation per type
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;

const QueueManager = require('./QueueManager');
const SocketRegistry = require('./SocketRegistry');
const CleanupScheduler = require('./CleanupScheduler');
const GameFactory = require('./GameFactory');
const GAME_TYPES = require('../config/gameTypes');

// Game configurations are now registered with GameFactory in constructor

class UnifiedMatchmakingService {
  constructor(gameManager, io) {
    this.gameManager = gameManager;
    this.io = io;

    // Initialize separated components
    this.queueManager = new QueueManager();
    this.socketRegistry = new SocketRegistry(io);
    this.cleanupScheduler = new CleanupScheduler(this.queueManager, this.socketRegistry, io);
    this.gameFactory = new GameFactory();

    // Register game types with factory
    Object.entries(GAME_TYPES).forEach(([type, config]) => {
      this.gameFactory.register(type, config);
    });

    // Prevent concurrent game creation per type
    this.creatingGame = new Set();

    // Start the cleanup scheduler
    this.cleanupScheduler.start();
  }



  // Add player to specific game type queue
  addToQueue(socket, gameType, userId = null) {
    this._log('INFO', 'Adding player to queue', {
      socketId: socket.id,
      userId,
      gameType,
      socketConnected: socket.connected,
      socketDisconnected: socket.disconnected
    });

    // Check if socket is already registered
    if (this.socketRegistry.get(socket.id)) {
      this._log('WARN', 'Socket already in queue/game, rejecting', {
        socketId: socket.id,
        userId,
        existingInfo: this.socketRegistry.get(socket.id)
      });
      return null;
    }

    // Create socket entry for queue
    const socketEntry = {
      id: socket.id,
      socket: socket,
      userId: userId,
      joinedAt: Date.now()
    };

    // Mark socket as recently active
    socket.lastActivity = Date.now();

    // Add to queue and register socket
    this.queueManager.add(gameType, socketEntry);
    this.socketRegistry.set(socket.id, null, gameType, userId);

    this._log('INFO', 'Successfully added to queue', {
      socketId: socket.id,
      userId,
      gameType,
      newQueueSize: this.queueManager.getSize(gameType)
    });

    return this._tryCreateGame(gameType);
  }

  // Try to create game for specific type when enough players
  _tryCreateGame(gameType) {
    // Prevent concurrent game creation for same type
    if (this.creatingGame.has(gameType)) {
      console.log(`[UnifiedMatchmaking] Already creating game for ${gameType}, skipping`);
      return null;
    }
    this.creatingGame.add(gameType);

    try {
      // Clean up stale sockets first
      this.queueManager.cleanup(gameType, (entry) => this.queueManager.isSocketValid(entry));

      const queueSize = this.queueManager.getSize(gameType);
      const gameConfig = this.gameFactory.getConfig(gameType);

      console.log(`[UnifiedMatchmaking] _tryCreateGame for ${gameType}: queueSize=${queueSize}, minPlayers=${gameConfig?.minPlayers}`);

      if (!gameConfig || queueSize < gameConfig.minPlayers) {
        console.log(`[UnifiedMatchmaking] Not enough players for ${gameType}, need ${gameConfig?.minPlayers}, have ${queueSize}`);
        return null;
      }

      // Atomic pop of required players
      const playerEntries = this.queueManager.pop(gameType, gameConfig.minPlayers);
      if (playerEntries.length !== gameConfig.minPlayers) {
        console.error(`[UnifiedMatchmaking] Failed to pop ${gameConfig.minPlayers} players from ${gameType} queue`);
        return null;
      }

      console.log(`[UnifiedMatchmaking] Extracted ${playerEntries.length} players from ${gameType} queue`);

      // Validate player entries
      for (const entry of playerEntries) {
        if (!entry || !entry.socket || !entry.socket.id) {
          console.error(`[UnifiedMatchmaking] Invalid socket in ${gameType} queue`);
          // Rollback - put players back
          playerEntries.forEach(entry => this.queueManager.add(gameType, entry));
          return null;
        }
        console.log(`[UnifiedMatchmaking] Player entry: socket.id=${entry.socket.id}, userId=${entry.userId}`);
      }

      // Check for existing game registrations
      for (const entry of playerEntries) {
        const existing = this.socketRegistry.get(entry.id);
        if (existing && existing.gameId !== null) {
          console.error(`[UnifiedMatchmaking] Socket ${entry.id} is already in active game ${existing.gameId}, cannot reuse for ${gameType}!`);
          // Rollback - put players back
          playerEntries.forEach(entry => this.queueManager.add(gameType, entry));
          return null;
        }
      }

      // Create the game using the factory
      const gameResult = this.gameFactory.createAndRegister(gameType, playerEntries, this.gameManager, this.socketRegistry);
      if (!gameResult) {
        console.error(`[UnifiedMatchmaking] Game creation failed for ${gameType}`);
        // Rollback - put players back
        playerEntries.forEach(entry => this.queueManager.add(gameType, entry));
        return null;
      }

      this._log('INFO', 'Successfully created game', {
        gameId: gameResult.gameId,
        gameType,
        playerCount: gameResult.players.length,
        userIds: gameResult.players.map(p => p.userId),
        socketIds: gameResult.players.map(p => p.socket.id)
      });

      return gameResult;
    } finally {
      this.creatingGame.delete(gameType);
    }
  }

  // Handle disconnection for any game type
  handleDisconnection(socket) {
    this._log('INFO', 'Handling socket disconnection', {
      socketId: socket.id,
      userId: socket.userId,
      socketConnected: socket.connected,
      socketDisconnected: socket.disconnected
    });

    // Delegate to socket registry
    const result = this.socketRegistry.handleDisconnection(socket, (gameId) => {
      this.gameManager.endGame(gameId);
    });

    if (result) {
      this._log('INFO', 'Player disconnected from active game', {
        socketId: socket.id,
        gameId: result.gameId,
        gameType: result.gameType,
        userId: result.userId,
        remainingSockets: result.remainingSockets
      });
    } else {
      // Check if socket was in a queue and remove it
      const gameType = this.getQueueType(socket.id);
      if (gameType) {
        const queueBefore = this.queueManager.getSize(gameType);
        const removed = this.queueManager.remove(gameType, socket.id);
        const queueAfter = this.queueManager.getSize(gameType);

        if (removed) {
          this.socketRegistry.delete(socket.id);
          this._log('INFO', 'Removed disconnected socket from queue', {
            socketId: socket.id,
            userId: socket.userId,
            gameType,
            queueBefore,
            queueAfter
          });
        }
      } else {
        this._log('INFO', 'Socket disconnected from queue/lobby', {
          socketId: socket.id,
          userId: socket.userId
        });
      }
    }

    return result;
  }

  // Allow clients to explicitly leave the queue
  leaveQueue(socket, gameType) {
    this._log('INFO', 'Player explicitly leaving queue', {
      socketId: socket.id,
      userId: socket.userId,
      gameType,
      currentQueueSize: this.queueManager.getSize(gameType),
      socketIdsInQueue: [] // Could add getter if needed
    });

    if (!gameType) {
      this._log('ERROR', 'Invalid game type for leave queue', {
        socketId: socket.id,
        userId: socket.userId,
        requestedGameType: gameType,
        availableTypes: this.queueManager.getActiveGameTypes()
      });
      return;
    }

    const queueBefore = this.queueManager.getSize(gameType);
    const removed = this.queueManager.remove(gameType, socket.id);
    const queueAfter = this.queueManager.getSize(gameType);

    if (removed) {
      this.socketRegistry.delete(socket.id);
    }

    this._log('INFO', 'Player left queue result', {
      socketId: socket.id,
      userId: socket.userId,
      gameType,
      queueBefore,
      queueAfter,
      removed: removed ? 1 : 0,
      socketFoundInQueue: removed
    });
  }

  // Clean up mappings when a game ends normally
  onGameEnd(gameId) {
    this._log('INFO', 'Starting cleanup for ended game', { gameId });

    // Delegate to socket registry
    this.socketRegistry.cleanupGame(gameId);

    // Clean up any queue entries that might reference the ended game
    let totalQueueCleaned = 0;
    const activeTypes = this.queueManager.getActiveGameTypes();

    for (const gameType of activeTypes) {
      const cleaned = this.queueManager.cleanup(gameType, (entry) => {
        // Check if socket is still registered with this game
        const socketInfo = this.socketRegistry.get(entry.id);
        return !socketInfo || socketInfo.gameId !== gameId;
      });

      if (cleaned > 0) {
        totalQueueCleaned += cleaned;
        this._log('WARN', 'Removed stale queue entries during game cleanup', {
          gameId,
          gameType,
          cleaned
        });
      }
    }

    this._log('INFO', 'Completed cleanup for ended game', {
      gameId,
      queueEntriesCleaned: totalQueueCleaned
    });
  }

  // Lookup methods
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
    return this.queueManager.getSize(gameType);
  }

  getWaitingQueue(gameType) {
    return this.queueManager.getQueue(gameType);
  }

  getQueueRoomCode(gameType) {
    // Room codes are no longer used in the refactored implementation
    // Return null for backward compatibility
    return null;
  }

  getPlayersNeeded(gameType) {
    const config = this.gameFactory.getConfig(gameType);
    const waiting = this.getWaitingCount(gameType);
    return Math.max(0, (config?.minPlayers || 0) - waiting);
  }

  // Convenience methods for backward compatibility
  getWaitingPlayersCount() {
    return this.getWaitingCount('two-hands');
  }

  getActiveGamesCount() {
    return this.socketRegistry.getActiveGames().length;
  }

  // Centralized socket removal from all queues and mappings
  removeSocketFromAllQueues(socketId) {
    const activeTypes = this.queueManager.getActiveGameTypes();
    for (const gameType of activeTypes) {
      this.queueManager.remove(gameType, socketId);
    }
    this.socketRegistry.delete(socketId);
  }

  // Update userId for a socket that's already in a queue
  updateQueuedSocketUserId(socketId, newUserId) {
    const socketInfo = this.socketRegistry.get(socketId);
    if (!socketInfo || socketInfo.gameId !== null) {
      // Not in queue or already in game
      return false;
    }

    const gameType = socketInfo.gameType;

    // Update the queue entry
    const queue = this.queueManager.getQueue(gameType);
    const entry = queue.find(e => e.id === socketId);
    if (entry) {
      entry.userId = newUserId;
      this._log('INFO', 'Updated userId for queued socket', {
        socketId,
        oldUserId: socketInfo.userId,
        newUserId
      });
    }

    // Update the registry
    this.socketRegistry.set(socketId, null, gameType, newUserId);

    return true;
  }

  // Check if socket is waiting in any queue
  isInQueue(socketId) {
    const info = this.socketRegistry.get(socketId);
    return info !== null && info.gameId === null;
  }

  // Get queue type for socket (null if not in queue)
  getQueueType(socketId) {
    const info = this.socketRegistry.get(socketId);
    return info?.gameType || null;
  }

  // Logging utility method
  _log(level, message, data = {}) {
    console.log(`[UnifiedMatchmaking] ${level}: ${message}`, data);
  }
}

module.exports = UnifiedMatchmakingService;