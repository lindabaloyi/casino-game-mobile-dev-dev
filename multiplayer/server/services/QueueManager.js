/**
 * QueueManager
 * Handles player queues for matchmaking
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;
const QUEUE_TIMEOUT_MS = 10 * 60 * 1000;
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;
const HEARTBEAT_TIMEOUT_MS = 15000;

const GAME_TYPES = {
  'two-hands': { minPlayers: 2, maxPlayers: 2 },
  'three-hands': { minPlayers: 3, maxPlayers: 3 },
  'four-hands': { minPlayers: 4, maxPlayers: 4 },
  'party': { minPlayers: 4, maxPlayers: 4 },
  'tournament': { minPlayers: 4, maxPlayers: 4 }
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
    }
    return this.queueRoomCodes[gameType];
  }

  clearQueueRoomCode(gameType) {
    this.queueRoomCodes[gameType] = null;
  }

  _isSocketAlive(socket, entry) {
    if (!socket || !socket.connected) {
      return false;
    }

    const lastHeartbeat = socket._lastHeartbeat || 0;
    const timeSinceHeartbeat = Date.now() - lastHeartbeat;
    if (lastHeartbeat && timeSinceHeartbeat > HEARTBEAT_TIMEOUT_MS) {
      console.warn(`[Queue] ${entry.id} heartbeat stale: ${timeSinceHeartbeat}ms > ${HEARTBEAT_TIMEOUT_MS}ms`);
      return false;
    }

    if (entry.joinedAt && (Date.now() - entry.joinedAt > QUEUE_TIMEOUT_MS)) {
      console.warn(`[Queue] ${entry.id} queue timeout: ${Date.now() - entry.joinedAt}ms > ${QUEUE_TIMEOUT_MS}ms`);
      return false;
    }

    if (entry.lastActivity && (Date.now() - entry.lastActivity > INACTIVITY_TIMEOUT_MS)) {
      console.warn(`[Queue] ${entry.id} inactivity timeout: ${Date.now() - entry.lastActivity}ms > ${INACTIVITY_TIMEOUT_MS}ms`);
      return false;
    }

    return true;
  }

  addToQueue(socket, gameType, userId = null) {
    const now = Date.now();
    const socketEntry = {
      id: socket.id,
      socket: socket,
      userId: userId,
      joinedAt: now,
      lastActivity: now
    };

    this.waitingQueues[gameType].push(socketEntry);
    const config = GAME_TYPES[gameType];
    console.log(`[Queue] ${userId || socket.id} joined ${gameType} queue (now: ${this.waitingQueues[gameType].length}/${config.minPlayers})`);
    
    return this._tryCreateGame(gameType);
  }

  _tryCreateGame(gameType) {
    const config = GAME_TYPES[gameType];
    const queue = this.waitingQueues[gameType];

    if (queue.length < config.minPlayers) {
      return null;
    }

    if (queue.length !== config.minPlayers) {
      return null;
    }

    const candidates = queue.slice(0, config.minPlayers);
    const staleIndices = [];

    for (let i = 0; i < candidates.length; i++) {
      const entry = candidates[i];
      if (!entry?.socket || !this._isSocketAlive(entry.socket, entry)) {
        console.warn(`[Queue] Stale socket ${entry?.id} in ${gameType} queue — evicting`);
        staleIndices.push(i);
      }
    }

    if (staleIndices.length > 0) {
      staleIndices.reverse().forEach(i => queue.splice(i, 1));
      console.log(`[Queue] Evicted ${staleIndices.length} stale player(s) from ${gameType} queue`);
      return null;
    }

    const playerEntries = queue.splice(0, config.minPlayers);

    for (const entry of playerEntries) {
      if (!entry || !entry.socket || !entry.socket.id) {
        console.error(`[Queue] Invalid socket in ${gameType} queue`);
        return null;
      }
    }

    console.log(`[Queue] Creating ${gameType} game with players: ${playerEntries.map(e => e.userId || e.id).join(', ')}`);
    return playerEntries;
  }

  removeFromQueue(socketId) {
    for (const gameType of Object.keys(this.waitingQueues)) {
      const entry = this.waitingQueues[gameType].find(e => e.id === socketId);
      if (entry) {
        console.log(`[Queue] ${entry.userId || socketId} left ${gameType} queue (now: ${this.waitingQueues[gameType].length - 1})`);
      }
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
          console.log(`[Queue] Removing stale socket ${entry.id} from ${gameType} queue`);
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
        return false;
      }
      return true;
    });

    const removed = beforeCount - this.waitingQueues[gameType].length;
    if (removed > 0) {
      console.log(`[Queue] Cleanup ${gameType}: removed ${removed} stale player(s)`);
    }
    return removed;
  }

  cleanupAll(isSocketValid) {
    let totalRemoved = 0;
    for (const gameType of Object.keys(this.waitingQueues)) {
      totalRemoved += this.cleanup(gameType, isSocketValid);
    }
    this._logQueueStatus();
    return totalRemoved;
  }

  _logQueueStatus() {
    const status = [];
    for (const [gameType, queue] of Object.entries(this.waitingQueues)) {
      if (queue.length > 0) {
        const config = GAME_TYPES[gameType];
        const players = queue.map(e => e.userId || e.id).join(', ');
        status.push(`${gameType}: ${queue.length}/${config.minPlayers} [${players}]`);
      }
    }
    if (status.length > 0) {
      console.log(`[Queue] Status: ${status.join(' | ')}`);
    } else {
      console.log(`[Queue] Status: (empty)`);
    }
  }

  getQueueDiagnostics() {
    const queues = {};
    for (const [gameType, queue] of Object.entries(this.waitingQueues)) {
      const config = GAME_TYPES[gameType];
      queues[gameType] = {
        count: queue.length,
        minPlayers: config.minPlayers,
        players: queue.map(entry => ({
          socketId: entry.id,
          userId: entry.userId,
          joinedAt: entry.joinedAt,
          lastActivity: entry.lastActivity,
          lastHeartbeat: entry.socket?._lastHeartbeat || null,
          isConnected: entry.socket?.connected || false
        }))
      };
    }
    return {
      queues,
      lastUpdate: Date.now()
    };
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
