/**
 * CleanupScheduler
 * Periodic cleanup service for matchmaking queues and socket registry
 */

const QUEUE_TIMEOUT_MS = 10 * 60 * 1000;
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;

class CleanupScheduler {
  constructor(queueManager, socketRegistry, intervalMs = 10000) {
    this.queueManager = queueManager;
    this.socketRegistry = socketRegistry;
    this.intervalMs = intervalMs;
    this.intervalHandle = null;
    this.isRunning = false;
  }

  _isSocketValid(socket, entry) {
    if (!socket.connected) {
      return false;
    }

    if (entry.joinedAt && (Date.now() - entry.joinedAt > QUEUE_TIMEOUT_MS)) {
      return false;
    }

    if (entry.lastActivity && (Date.now() - entry.lastActivity > INACTIVITY_TIMEOUT_MS)) {
      return false;
    }

    return true;
  }

  start() {
    if (this.isRunning) {
      console.log('[CleanupScheduler] Already running');
      return;
    }

    console.log(`[CleanupScheduler] Starting with interval ${this.intervalMs}ms`);
    this.isRunning = true;
    this.intervalHandle = setInterval(() => this.runCleanup(), this.intervalMs);
  }

  stop() {
    if (!this.isRunning) {
      console.log('[CleanupScheduler] Not running');
      return;
    }

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.isRunning = false;
    console.log('[CleanupScheduler] Stopped');
  }

  runCleanup() {
    if (!this.isRunning) {
      return;
    }

    try {
      const results = { queues: {}, socketRegistry: 0 };

      const gameTypes = ['two-hands', 'three-hands', 'four-hands', 'party', 'freeforall'];
      for (const gameType of gameTypes) {
        results.queues[gameType] = this.queueManager.cleanup(gameType, this._isSocketValid.bind(this));
      }

      results.socketRegistry = this.socketRegistry.cleanupEmptyGames();

      
    } catch (error) {
      console.error('[CleanupScheduler] Error during cleanup:', error);
    }
  }
}

module.exports = CleanupScheduler;
