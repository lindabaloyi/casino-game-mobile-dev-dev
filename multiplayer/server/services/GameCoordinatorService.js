/**
 * GameCoordinatorService
 * Receives socket events, validates them, delegates to ActionRouter,
 * then broadcasts the resulting state via BroadcasterService.
 *
 * For Milestone 1 this is intentionally minimal — actions are added
 * one by one in later milestones.
 */

class GameCoordinatorService {
  constructor(gameManager, actionRouter, matchmaking, broadcaster) {
    this.gameManager  = gameManager;
    this.actionRouter = actionRouter;
    this.matchmaking  = matchmaking;
    this.broadcaster  = broadcaster;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Resolve which game + player this socket belongs to, or send error. */
  _resolvePlayer(socket) {
    const gameId = this.matchmaking.getGameId(socket.id);
    if (!gameId) {
      this.broadcaster.sendError(socket, 'Not in an active game');
      return null;
    }
    const playerIndex = this.gameManager.getPlayerIndex(gameId, socket.id);
    if (playerIndex === null) {
      this.broadcaster.sendError(socket, 'Player not found in game');
      return null;
    }
    return { gameId, playerIndex };
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  /**
   * Handle a game-action event from the client.
   * Expected payload: { type: string, payload: object }
   */
  handleGameAction(socket, data) {
    if (!data?.type) {
      this.broadcaster.sendError(socket, 'Invalid action: missing type');
      return;
    }

    const ctx = this._resolvePlayer(socket);
    if (!ctx) return;

    const { gameId, playerIndex } = ctx;

    try {
      const newState = this.actionRouter.executeAction(gameId, playerIndex, data);
      this.broadcaster.broadcastGameUpdate(gameId, newState);
    } catch (err) {
      console.error(`[Coordinator] game-action failed: ${err.message}`);
      
      // Check for special MULTIPLE_OPTIONS error
      if (err.message && err.message.startsWith('MULTIPLE_OPTIONS:')) {
        // Parse the options from the error message
        try {
          const options = JSON.parse(err.message.replace('MULTIPLE_OPTIONS:', ''));
          console.log(`[Coordinator] Multiple options detected:`, options);
          
          // Send a special event to the client instead of error
          socket.emit('game-action-response', {
            type: 'MULTIPLE_OPTIONS',
            options: options,
            action: data.type,
          });
          return;
        } catch (parseErr) {
          console.error(`[Coordinator] Failed to parse options:`, parseErr);
        }
      }
      
      this.broadcaster.sendError(socket, err.message);
    }
  }

}

module.exports = GameCoordinatorService;
