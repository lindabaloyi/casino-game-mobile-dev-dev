/**
 * PlayerContextService
 * Resolves player context (gameId, playerIndex, gameType) using public APIs only.
 * No direct access to internal maps - maintains proper separation of concerns.
 */

class PlayerContextService {
  constructor(unifiedMatchmaking, gameManager) {
    this.unifiedMatchmaking = unifiedMatchmaking;
    this.gameManager = gameManager;
  }

  /**
   * Resolve player context for a socket
   * @param {string} socketId - Socket ID
   * @returns {Object|null} - { gameId, playerIndex, gameType, isPartyGame } or null
   */
  resolvePlayer(socketId) {
    const gameId = this.unifiedMatchmaking.getGameId(socketId);
    const gameType = this.unifiedMatchmaking.getGameType(socketId);

    if (!gameId) {
      // No game found - fail fast, don't try to repair state
      return null;
    }

    // Find player index in game state
    const gameState = this.gameManager.getGameState(gameId);
    if (!gameState?.players) {
      console.warn(`[PlayerContextService] Game ${gameId} has no players array`);
      return null;
    }

    const playerIndex = gameState.players.findIndex(player =>
      player.socketId === socketId
    );

    if (playerIndex === -1) {
      console.warn(`[PlayerContextService] Socket ${socketId} not found in game ${gameId} players`);
      return null;
    }

    return {
      gameId,
      playerIndex,
      gameType,
      isPartyGame: gameType === 'party'
    };
  }
}

module.exports = PlayerContextService;