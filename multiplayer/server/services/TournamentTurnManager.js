/**
 * TournamentTurnManager
 * Handles turn order for tournament mode - skips eliminated players
 * 
 * This module provides tournament-specific turn logic that doesn't modify
 * the generic nextTurn in shared/game/turn.js
 */

class TournamentTurnManager {
  /**
   * Get the next active player, skipping eliminated players
   * @param {object} state - Game state
   * @param {number} currentPlayer - Current player index
   * @returns {number} Next active player index
   */
  static getNextPlayer(state, currentPlayer) {
    const total = state.playerCount || state.players?.length || 2;
    let next = (currentPlayer + 1) % total;
    const start = next;
    
    // Keep looking until we find an active player
    do {
      const playerId = `player_${next}`;
      if (state.playerStatuses?.[playerId] !== 'ELIMINATED') {
        console.log(`[TournamentTurnManager] getNextPlayer: ${currentPlayer} -> ${next} (active)`);
        return next;
      }
      console.log(`[TournamentTurnManager] getNextPlayer: skipping eliminated player ${next}`);
      next = (next + 1) % total;
    } while (next !== start);
    
    // No other active players, return current
    console.log(`[TournamentTurnManager] getNextPlayer: no other active players, staying at ${currentPlayer}`);
    return currentPlayer;
  }

  /**
   * Check if a player can act (not eliminated and it's their turn)
   * @param {object} state - Game state
   * @param {number} playerIndex - Player index trying to act
   * @returns {object} { canAct: boolean, reason?: string }
   */
  static canAct(state, playerIndex) {
    const playerId = `player_${playerIndex}`;
    
    // Check if eliminated
    if (state.playerStatuses?.[playerId] === 'ELIMINATED') {
      return { 
        canAct: false, 
        reason: `Player ${playerIndex} is ELIMINATED and cannot act` 
      };
    }
    
    // Check if it's their turn (for non out-of-turn actions)
    // Note: Qualification review actions can be out-of-turn
    const isQualificationReview = state.tournamentPhase === 'QUALIFICATION_REVIEW';
    if (!isQualificationReview && state.currentPlayer !== playerIndex) {
      return { 
        canAct: false, 
        reason: `Not your turn (current: ${state.currentPlayer}, your: ${playerIndex})` 
      };
    }
    
    return { canAct: true };
  }

  /**
   * Check if turn should be skipped for a player (eliminated)
   * @param {object} state - Game state
   * @param {number} playerIndex - Player index to check
   * @returns {boolean} True if turn should be skipped
   */
  static shouldSkipTurn(state, playerIndex) {
    const playerId = `player_${playerIndex}`;
    return state.playerStatuses?.[playerId] === 'ELIMINATED';
  }

  /**
   * Get the first active player for game start
   * @param {object} state - Game state
   * @returns {number} First active player index
   */
  static getFirstActivePlayer(state) {
    const playerCount = state.playerCount || state.players?.length || 2;
    
    for (let i = 0; i < playerCount; i++) {
      const playerId = `player_${i}`;
      if (state.playerStatuses?.[playerId] !== 'ELIMINATED') {
        console.log(`[TournamentTurnManager] getFirstActivePlayer: found ${i}`);
        return i;
      }
    }
    
    // Fallback to 0 if no active players found
    console.log(`[TournamentTurnManager] getFirstActivePlayer: no active found, using 0`);
    return 0;
  }

  /**
   * Check if all active players have ended their turns
   * @param {object} state - Game state
   * @returns {boolean} True if all active players have ended turns
   */
  static allActivePlayersTurnEnded(state) {
    if (!state.roundPlayers) {
      return false;
    }
    
    const playerCount = state.playerCount || state.players?.length || 2;
    
    for (let i = 0; i < playerCount; i++) {
      const playerId = `player_${i}`;
      
      // Skip eliminated players
      if (state.playerStatuses?.[playerId] === 'ELIMINATED') {
        continue;
      }
      
      // Check if turn ended
      if (!state.roundPlayers[i]?.turnEnded) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get list of active player indices (non-eliminated)
   * @param {object} state - Game state
   * @returns {number[]} Array of active player indices
   */
  static getActivePlayers(state) {
    const activePlayers = [];
    const playerCount = state.playerCount || state.players?.length || 2;
    
    for (let i = 0; i < playerCount; i++) {
      const playerId = `player_${i}`;
      if (state.playerStatuses?.[playerId] !== 'ELIMINATED') {
        activePlayers.push(i);
      }
    }
    
    return activePlayers;
  }

  /**
   * Get debug info for tournament turn state
   * @param {object} state - Game state
   * @returns {string} Debug string
   */
  static getDebugInfo(state) {
    const activePlayers = this.getActivePlayers(state);
    const playerCount = state.playerCount || state.players?.length || 2;
    
    let info = `[TournamentTurnManager] Debug:\n`;
    info += `  currentPlayer: ${state.currentPlayer}\n`;
    info += `  playerCount: ${playerCount}\n`;
    info += `  activePlayers: [${activePlayers.join(', ')}]\n`;
    info += `  playerStatuses: ${JSON.stringify(state.playerStatuses || {})}\n`;
    
    return info;
  }
}

module.exports = TournamentTurnManager;
