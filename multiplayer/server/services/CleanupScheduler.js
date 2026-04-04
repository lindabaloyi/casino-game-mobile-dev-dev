/**
 * CleanupScheduler - Handles periodic cleanup of queues and socket mappings
 */
class CleanupScheduler {
  constructor(queueManager, socketRegistry, io) {
    this.queueManager = queueManager;
    this.socketRegistry = socketRegistry;
    this.io = io;
    this.intervalId = null;
    this.intervalMs = 10000; // 10 seconds
  }

  /**
   * Start the periodic cleanup
   */
  start() {
    console.log('[CleanupScheduler] Starting periodic cleanup every', this.intervalMs, 'ms');

    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, this.intervalMs);
  }

  /**
   * Stop the periodic cleanup
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[CleanupScheduler] Stopped periodic cleanup');
    }
  }

  /**
   * Run a single cleanup cycle
   */
  runCleanup() {
    console.log('[CleanupScheduler] Running periodic cleanup');

    const activeTypes = this.queueManager.getActiveGameTypes();
    let totalCleaned = 0;

    // Clean up queues
    activeTypes.forEach(gameType => {
      const cleaned = this.queueManager.cleanup(gameType, (entry) => this.queueManager.isSocketValid(entry));
      totalCleaned += cleaned;
    });

    console.log(`[CleanupScheduler] Cleaned ${totalCleaned} total entries from all queues`);

    // Clean up empty game entries in socket registry
    this.socketRegistry.cleanupEmptyGames();

    // Log statistics
    const queueStats = activeTypes.map(type => `${type}: ${this.queueManager.getSize(type)}`).join(', ');
    const registryStats = this.socketRegistry.getStats();

    console.log(`[CleanupScheduler] Current state - Queues: [${queueStats}], Registry: ${registryStats.totalSockets} sockets, ${registryStats.activeGames} games`);
  }

  /**
   * Set cleanup interval
   * @param {number} intervalMs - Interval in milliseconds
   */
  setInterval(intervalMs) {
    this.intervalMs = intervalMs;
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }
}

module.exports = CleanupScheduler;