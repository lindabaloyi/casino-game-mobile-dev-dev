/**
 * QueueManager - Manages matchmaking queues with atomic operations
 * Handles adding, removing, and cleaning up players in waiting queues
 */
class QueueManager {
  constructor() {
    this.queues = {}; // gameType -> [socketEntry]
    this.QUEUE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
    this.INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
  }

  /**
   * Add a player to a specific game type queue
   * @param {string} gameType - Type of game (e.g., 'three-hands', 'party')
   * @param {Object} socketEntry - { id, socket, userId, joinedAt }
   */
  add(gameType, socketEntry) {
    if (!this.queues[gameType]) {
      this.queues[gameType] = [];
    }
    this.queues[gameType].push(socketEntry);
  }

  /**
   * Remove a specific socket from a game type queue
   * @param {string} gameType - Type of game
   * @param {string} socketId - Socket ID to remove
   * @returns {boolean} - True if socket was found and removed
   */
  remove(gameType, socketId) {
    if (!this.queues[gameType]) return false;

    const originalLength = this.queues[gameType].length;
    this.queues[gameType] = this.queues[gameType].filter(entry => entry.id !== socketId);

    return this.queues[gameType].length < originalLength;
  }

  /**
   * Atomically pop N players from a queue
   * @param {string} gameType - Type of game
   * @param {number} count - Number of players to pop
   * @returns {Array} - Array of socketEntry objects
   */
  pop(gameType, count) {
    if (!this.queues[gameType] || this.queues[gameType].length < count) {
      return [];
    }
    return this.queues[gameType].splice(0, count);
  }

  /**
   * Get current queue size for a game type
   * @param {string} gameType - Type of game
   * @returns {number} - Number of players waiting
   */
  getSize(gameType) {
    return this.queues[gameType]?.length || 0;
  }

  /**
   * Clean up stale sockets from a specific queue
   * @param {string} gameType - Type of game
   * @param {Function} isSocketValid - Validation function
   * @returns {number} - Number of sockets cleaned
   */
  cleanup(gameType, isSocketValid) {
    if (!this.queues[gameType]) return 0;

    const originalLength = this.queues[gameType].length;
    this.queues[gameType] = this.queues[gameType].filter(entry => {
      if (isSocketValid(entry)) return true;

      console.log(`[QueueManager] Cleaned stale socket ${entry.id} from ${gameType} queue`);
      return false;
    });

    const cleaned = originalLength - this.queues[gameType].length;
    if (cleaned > 0) {
      console.log(`[QueueManager] Cleaned ${cleaned} stale entries from ${gameType} queue`);
    }
    return cleaned;
  }

  /**
   * Get all game types with active queues
   * @returns {Array<string>} - Array of game types
   */
  getActiveGameTypes() {
    return Object.keys(this.queues).filter(type => this.queues[type].length > 0);
  }

  /**
   * Get queue entries for a specific game type
   * @param {string} gameType - Type of game
   * @returns {Array} - Array of socketEntry objects in the queue
   */
  getQueue(gameType) {
    return this.queues[gameType] || [];
  }

  /**
   * Socket validation function
   * @param {Object} socketEntry - Socket entry to validate
   * @returns {boolean} - True if socket is valid
   */
  isSocketValid(socketEntry) {
    if (!socketEntry || !socketEntry.socket) return false;

    const isConnected = socketEntry.socket.connected === true;
    const isDisconnected = socketEntry.socket.disconnected === true;
    const connectionValid = isConnected && !isDisconnected;

    // Check queue timeout
    const timeInQueue = Date.now() - (socketEntry.joinedAt || 0);
    const withinTimeout = timeInQueue < this.QUEUE_TIMEOUT_MS;

    // Check activity timeout
    const lastActivity = socketEntry.socket.lastActivity || socketEntry.joinedAt || 0;
    const recentlyActive = (Date.now() - lastActivity) < this.INACTIVITY_TIMEOUT_MS;

    const isValid = connectionValid && withinTimeout && recentlyActive;

    if (!isValid) {
      const reasons = [];
      if (!connectionValid) reasons.push('disconnected');
      if (!withinTimeout) reasons.push('queue_timeout');
      if (!recentlyActive) reasons.push('inactive');

      console.log(`[QueueManager] Socket ${socketEntry.id} invalid: ${reasons.join(', ')}`);
    }

    return isValid;
  }
}

module.exports = QueueManager;