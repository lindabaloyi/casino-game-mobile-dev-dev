/**
 * ActionLogger - Minimal logging for production performance
 * Only logs critical errors to maintain game stability monitoring
 */

class ActionLogger {
  constructor(gameId, playerId, requestId = null) {
    this.gameId = gameId;
    this.playerId = playerId;
    this.requestId = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.actionStartTime = Date.now();
  }

  /**
   * Log action start - minimal logging for production
   */
  logActionStart(actionType, context) {
    // Removed expensive JSON.stringify and detailed context logging
    // Keep silent for production performance
  }

  /**
   * Log decision points - minimal logging for production
   */
  logDecision(phase, decision, details) {
    // Removed expensive JSON.stringify logging
    // Keep silent for production performance
  }

  /**
   * Log state transitions - minimal logging for production
   */
  logStateTransition(changes) {
    // Removed expensive JSON.stringify logging
    // Keep silent for production performance
  }

  /**
   * Log errors - minimal logging for production
   */
  logError(phase, error, recovery = null) {
    console.error(`[ERROR:${phase}] ${error.message} (Game:${this.gameId})`);
  }



  /**
   * Get the request ID for correlation
   */
  getRequestId() {
    return this.requestId;
  }
}

module.exports = { ActionLogger };
