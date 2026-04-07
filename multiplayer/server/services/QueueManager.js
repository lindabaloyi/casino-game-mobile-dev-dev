/**
 * QueueManager
 * Handles player queues for matchmaking
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;
const QUEUE_TIMEOUT_MS = 10 * 60 * 1000;
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;

const GAME_TYPES = {
  'two-hands': { minPlayers: 2, maxPlayers: 2 },
  'three-hands': { minPlayers: 3, maxPlayers: 3 },
  'four-hands': { minPlayers: 4, maxPlayers: 4 },
  'party': { minPlayers: 4, maxPlayers: 4 },
  'freeforall': { minPlayers: 4, maxPlayers: 4 }
};

class QueueManager {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.waitingQueues = {};
    this.queueRoomCodes = {};

    Object.keys(GAME_TYPES).forEach(type => {
      this.waitingQueues[type] = [];
      this.queueRoomCodes[type] = null;
    });
  }

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
    return Object.values(this.queueRoomCodes).includes(code);
  }

  getQueueRoomCode(gameType) {
    if (!this.queueRoomCodes[gameType]) {
      this.queueRoomCodes[gameType] = this._generateQueueRoomCode();
      console.log(`[QueueManager] Generated room code ${this.queueRoomCodes[gameType]} for ${gameType} queue`);
    }
    return this.queueRoomCodes[gameType];
  }

  clearQueueRoomCode(gameType) {
    this.queueRoomCodes[gameType] = null;
  }

  addToQueue(socket, gameType, userId = null) {
    console.log(`[DEBUG] [QueueManager] addToQueue: socket=${socket.id}, userId=${userId}, gameType=${gameType}`);

    const now = Date.now();
    const socketEntry = {
      id: socket.id,
      socket: socket,
      userId: userId,
      joinedAt: now,
      lastActivity: now
    };

    console.log(`[DEBUG] [QueueManager] Adding to ${gameType} queue:`, socketEntry);
    this.waitingQueues[gameType].push(socketEntry);

    console.log(`[DEBUG] [QueueManager] ${gameType} queue now has ${this.waitingQueues[gameType].length} players`);
    const result = this._tryCreateGame(gameType);
    console.log(`[DEBUG] [QueueManager] _tryCreateGame returned:`, result ? `array with ${result.length} items` : 'null');
    return result;
  }

  _tryCreateGame(gameType) {
    const config = GAME_TYPES[gameType];
    const queue = this.waitingQueues[gameType];

    console.log(`[DEBUG] [QueueManager] _tryCreateGame: gameType=${gameType}, queue.length=${queue.length}, minPlayers=${config.minPlayers}`);

    if (queue.length < config.minPlayers) {
      console.log(`[DEBUG] [QueueManager] Not enough players, need ${config.minPlayers}, have ${queue.length}`);
      return null;
    }

    if (queue.length !== config.minPlayers) {
      console.log(`[DEBUG] [QueueManager] Unexpected count, expected ${config.minPlayers}, have ${queue.length}`);
      return null;
    }

    const playerEntries = queue.splice(0, config.minPlayers);
    console.log(`[DEBUG] [QueueManager] Extracted ${playerEntries.length} players from ${gameType} queue`);

    for (const entry of playerEntries) {
      if (!entry || !entry.socket || !entry.socket.id) {
        console.error(`[DEBUG] [QueueManager] Invalid socket in ${gameType} queue`);
        return null;
      }
      console.log(`[DEBUG] [QueueManager] Player entry: socket.id=${entry.socket.id}, userId=${entry.userId}`);
    }

    return playerEntries;
  }

  removeFromQueue(socketId) {
    for (const gameType of Object.keys(this.waitingQueues)) {
      this.waitingQueues[gameType] = this.waitingQueues[gameType].filter(entry => entry.id !== socketId);
    }
  }

  getQueueStatus(gameType) {
    const waiting = this.getWaitingCount(gameType);
    const needed = this.getPlayersNeeded(gameType);
    return { waiting, needed };
  }

  getWaitingCount(gameType) {
    return this.waitingQueues[gameType]?.length || 0;
  }

  getPlayersNeeded(gameType) {
    const config = GAME_TYPES[gameType];
    const waiting = this.getWaitingCount(gameType);
    return Math.max(0, config.minPlayers - waiting);
  }

  cleanupStaleQueues() {
    for (const gameType of Object.keys(this.waitingQueues)) {
      this.waitingQueues[gameType] = this.waitingQueues[gameType].filter(entry => {
        if (!entry.socket || !entry.socket.connected) {
          console.log(`[QueueManager] Removing stale socket ${entry.id} from ${gameType} queue`);
          return false;
        }
        return true;
      });
    }
  }

  cleanup(gameType, isSocketValid) {
    if (!this.waitingQueues[gameType]) {
      return 0;
    }

    const beforeCount = this.waitingQueues[gameType].length;
    this.waitingQueues[gameType] = this.waitingQueues[gameType].filter(entry => {
      if (!entry.socket || !isSocketValid(entry.socket, entry)) {
        console.log(`[QueueManager] Removing stale socket ${entry.id} from ${gameType} queue (cleanup)`);
        return false;
      }
      return true;
    });

    const removed = beforeCount - this.waitingQueues[gameType].length;
    if (removed > 0) {
      console.log(`[QueueManager] Cleaned ${removed} stale entries from ${gameType} queue`);
    }
    return removed;
  }

  cleanupAll(isSocketValid) {
    let totalRemoved = 0;
    for (const gameType of Object.keys(this.waitingQueues)) {
      totalRemoved += this.cleanup(gameType, isSocketValid);
    }
    return totalRemoved;
  }

  broadcastWaitingUpdate(gameType) {
    const queue = this.waitingQueues[gameType] || [];
    const waitingCount = queue.length;
    const neededCount = this.getPlayersNeeded(gameType);

    queue.forEach(entry => {
      entry.socket.emit('queue-update', {
        gameType,
        waitingCount,
        neededCount
      });
    });
  }

  getAllQueues() {
    return this.waitingQueues;
  }

  isInQueue(socketId) {
    for (const gameType of Object.keys(this.waitingQueues)) {
      if (this.waitingQueues[gameType].some(entry => entry.id === socketId)) {
        return { gameType, entry: this.waitingQueues[gameType].find(entry => entry.id === socketId) };
      }
    }
    return null;
  }

  removeFromQueueByGameType(socketId, gameType) {
    if (this.waitingQueues[gameType]) {
      this.waitingQueues[gameType] = this.waitingQueues[gameType].filter(entry => entry.id !== socketId);
    }
  }
}

module.exports = QueueManager;
