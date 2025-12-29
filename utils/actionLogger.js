/**
 * ActionLogger - Context-rich logging for game actions
 * Provides structured, debuggable logs with full game state context
 */

class ActionLogger {
  constructor(gameId, playerId, requestId = null) {
    this.gameId = gameId;
    this.playerId = playerId;
    this.requestId = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.actionStartTime = Date.now();
  }

  /**
   * Log action start with full context
   */
  logActionStart(actionType, context) {
    console.log(`[ACTION_START:${actionType.toUpperCase()}]`, JSON.stringify({
      gameId: this.gameId,
      playerId: this.playerId,
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      action: actionType,
      context: {
        ...context,
        // Include relevant game state summaries
        handSize: context.hand?.length || 0,
        tableState: this.summarizeTable(context.table || []),
        playerSituation: this.getPlayerSituation(context.player || {})
      }
    }, null, 2));
  }

  /**
   * Log decision points in action execution
   */
  logDecision(phase, decision, details) {
    console.log(`[DECISION:${phase.toUpperCase()}]`, JSON.stringify({
      requestId: this.requestId,
      phase,
      decision,
      timestamp: new Date().toISOString(),
      details
    }));
  }

  /**
   * Log state transitions with before/after changes
   */
  logStateTransition(changes) {
    console.log(`[STATE_TRANSITION]`, JSON.stringify({
      requestId: this.requestId,
      actionDuration: Date.now() - this.actionStartTime,
      timestamp: new Date().toISOString(),
      changes
    }));
  }

  /**
   * Log errors with full context
   */
  logError(phase, error, recovery = null) {
    console.error(`[ACTION_ERROR:${phase.toUpperCase()}]`, JSON.stringify({
      requestId: this.requestId,
      gameId: this.gameId,
      playerId: this.playerId,
      phase,
      error: error.message,
      stack: error.stack,
      recoveryAttempted: recovery,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Summarize table state for logging
   */
  summarizeTable(tableCards) {
    const stacks = tableCards.filter(card => card.type === 'temporary_stack');
    const looseCards = tableCards.filter(card => !card.type || card.type === 'loose');
    const builds = tableCards.filter(card => card.type === 'build');

    return {
      totalCards: tableCards.length,
      stacks: stacks.length,
      looseCards: looseCards.length,
      builds: builds.length,
      stackSummaries: stacks.map(stack => ({
        id: stack.stackId,
        cards: stack.cards.length,
        owner: stack.owner,
        value: stack.value
      })),
      buildSummaries: builds.map(build => ({
        id: build.buildId,
        cards: build.cards.length,
        owner: build.owner,
        value: build.value,
        extendable: build.isExtendable
      }))
    };
  }

  /**
   * Get player situation summary
   */
  getPlayerSituation(player) {
    return {
      handSize: player.handSize || player.hand?.length || 0,
      captures: player.captures || 0,
      score: player.score || 0
    };
  }

  /**
   * Get the request ID for correlation
   */
  getRequestId() {
    return this.requestId;
  }
}

module.exports = { ActionLogger };
