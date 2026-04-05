/**
 * TournamentSocketManager
 * Handles socket lifecycle for tournament mode
 * - Validates client-ready from non-eliminated players
 * - Manages socket-to-player mapping
 * - Cleans up eliminated sockets
 */

class TournamentSocketManager {
  /**
   * Check if a socket's player is eliminated
   * @param {string} socketId - Socket ID
   * @param {object} gameState - Game state
   * @param {object} gameManager - GameManager instance for socketMap lookup
   * @returns {boolean} True if player is eliminated
   */
  static isEliminated(socketId, gameState, gameManager) {
    if (!gameState || !gameState.tournamentMode) {
      return false;
    }
    
    const gameId = gameState.gameId;
    const socketMap = gameManager?.socketPlayerMap?.get(gameId);
    const playerIndex = socketMap?.get(socketId);
    
    // Socket not in map - not yet registered or already cleaned up
    // Don't treat as eliminated, just return false
    if (playerIndex === undefined || playerIndex === null) {
      console.log(`[TournamentSocketManager] isEliminated: socket ${socketId?.substr(0,8)} not in map - treating as NOT eliminated`);
      return false;
    }
    
    const playerId = `player_${playerIndex}`;
    const status = gameState.playerStatuses?.[playerId];
    const isEliminated = status === 'ELIMINATED';
    
    console.log(`[TournamentSocketManager] isEliminated: socket ${socketId?.substr(0,8)} -> player ${playerIndex} (${playerId}): ${status}`);
    
    return isEliminated;
  }

  /**
   * Get player index for a socket
   * @param {string} socketId - Socket ID
   * @param {number} gameId - Game ID
   * @param {object} gameManager - GameManager instance
   * @returns {number|null} Player index or null if not found
   */
  static getPlayerIndex(socketId, gameId, gameManager) {
    const socketMap = gameManager?.socketPlayerMap?.get(gameId);
    return socketMap?.get(socketId) ?? null;
  }

  /**
   * Get player ID string for a socket
   * @param {string} socketId - Socket ID
   * @param {number} gameId - Game ID
   * @param {object} gameManager - GameManager instance
   * @returns {string|null} Player ID string (e.g., 'player_0') or null
   */
  static getPlayerId(socketId, gameId, gameManager) {
    const playerIndex = this.getPlayerIndex(socketId, gameId, gameManager);
    if (playerIndex === null || playerIndex === undefined) {
      return null;
    }
    return `player_${playerIndex}`;
  }

  /**
   * Remove eliminated sockets from the map
   * Note: We no longer remove sockets - they stay mapped but marked as eliminated
   * This is handled by playerStatuses instead
   * @param {number} gameId - Game ID
   * @param {string[]} qualifiedPlayers - Array of qualified player IDs
   * @param {object} gameManager - GameManager instance
   */
  static removeEliminatedSockets(gameId, qualifiedPlayers, gameManager) {
    // FIXED: We no longer remove sockets - keep them for debugging
    // The playerStatuses determines if a player is eliminated, not socket removal
    const socketMap = gameManager?.socketPlayerMap?.get(gameId);
    if (!socketMap) {
      console.log(`[TournamentSocketManager] removeEliminatedSockets: no socket map for game ${gameId}`);
      return;
    }
    
    console.log(`[TournamentSocketManager] Socket map for game ${gameId}:`);
    for (const [sid, idx] of socketMap.entries()) {
      console.log(`  ${sid.substr(0,8)} -> P${idx}`);
    }
    console.log(`[TournamentSocketManager] Qualified players: ${JSON.stringify(qualifiedPlayers)}`);
    console.log(`[TournamentSocketManager] NOTE: Sockets kept in map - elimination handled via playerStatuses`);
  }

  /**
   * Get debug info for tournament socket state
   * @param {number} gameId - Game ID
   * @param {object} gameState - Game state
   * @param {object} gameManager - GameManager instance
   * @returns {string} Debug string
   */
  static getDebugInfo(gameId, gameState, gameManager) {
    const socketMap = gameManager?.socketPlayerMap?.get(gameId);
    const playerStatuses = gameState?.playerStatuses || {};
    const qualifiedPlayers = gameState?.qualifiedPlayers || [];
    
    let info = `[TournamentSocketManager] Debug for game ${gameId}:\n`;
    info += `  tournamentPhase: ${gameState?.tournamentPhase}\n`;
    info += `  playerCount: ${gameState?.playerCount}\n`;
    info += `  qualifiedPlayers: ${JSON.stringify(qualifiedPlayers)}\n`;
    info += `  Socket map:\n`;
    
    if (socketMap) {
      for (const [sid, idx] of socketMap.entries()) {
        const playerId = `player_${idx}`;
        const status = playerStatuses[playerId] || 'N/A';
        info += `    ${sid.substr(0,8)} -> P${idx} (${playerId}): ${status}\n`;
      }
    } else {
      info += `    (no map)\n`;
    }
    
    return info;
  }

  /**
   * Check if all qualified players have sent client-ready
   * @param {number} gameId - Game ID
   * @param {object} gameState - Game state
   * @param {object} gameManager - GameManager instance
   * @returns {object} { allReady: boolean, readyCount: number, expectedCount: number }
   */
  static checkAllReady(gameId, gameState, gameManager) {
    const readySet = gameManager?.clientReadyMap?.get(gameId);
    const qualifiedPlayers = gameState?.qualifiedPlayers || [];
    const socketMap = gameManager?.socketPlayerMap?.get(gameId);
    
    const readyCount = readySet?.size || 0;
    
    // Count only qualified players that are still connected
    let expectedCount = 0;
    for (const playerId of qualifiedPlayers) {
      const match = playerId.match(/^player_(\d+)$/);
      if (match) {
        const playerIndex = parseInt(match[1], 10);
        // Check if socket is still connected
        let isConnected = false;
        if (socketMap) {
          for (const [sid, idx] of socketMap.entries()) {
            if (idx === playerIndex) {
              isConnected = true;
              break;
            }
          }
        }
        if (isConnected) {
          expectedCount++;
        }
      }
    }
    
    const allReady = readyCount >= expectedCount;
    
    console.log(`[TournamentSocketManager] checkAllReady: ${readyCount}/${expectedCount} ready`);
    
    return { allReady, readyCount, expectedCount };
  }

  /**
   * Get the playerNumber to send to a client
   * Returns original index for active players, null for eliminated
   * @param {string} socketId - Socket ID
   * @param {number} gameId - Game ID
   * @param {object} gameState - Game state
   * @param {object} gameManager - GameManager instance
   * @returns {number|null} playerNumber to send
   */
  static getPlayerNumberForClient(socketId, gameId, gameState, gameManager) {
    if (!gameState?.tournamentMode) {
      const socketMap = gameManager?.socketPlayerMap?.get(gameId);
      return socketMap?.get(socketId) ?? null;
    }
    
    const playerIndex = this.getPlayerIndex(socketId, gameId, gameManager);
    if (playerIndex === null || playerIndex === undefined) {
      return null;
    }
    
    const playerId = `player_${playerIndex}`;
    const status = gameState.playerStatuses?.[playerId];
    
    // Return null for eliminated players
    if (status === 'ELIMINATED') {
      console.log(`[TournamentSocketManager] getPlayerNumberForClient: socket ${socketId.substr(0,8)} -> null (eliminated)`);
      return null;
    }
    
    console.log(`[TournamentSocketManager] getPlayerNumberForClient: socket ${socketId.substr(0,8)} -> ${playerIndex} (active)`);
    return playerIndex;
  }
}

module.exports = TournamentSocketManager;
