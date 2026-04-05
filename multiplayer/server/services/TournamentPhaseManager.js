/**
 * TournamentPhaseManager
 * Handles tournament phase transitions
 * - transitionToSemifinal
 * - transitionToFinalShowdown
 * - setCurrentPlayerToFirstActive
 * - clearReadyStatus
 */

const { startSemifinal, startFinalShowdown } = require('../../../shared/game/actions/startQualificationReview');
const TournamentManager = require('./TournamentManager');

class TournamentPhaseManager {
  /**
   * Transition to semifinal phase
   * @param {object} gameState - Current game state
   * @returns {object} New game state after transition
   */
  static transitionToSemifinal(gameState) {
    console.log('[TournamentPhaseManager] transitionToSemifinal called');
    
    // Use existing startSemifinal function
    const newState = startSemifinal(gameState);
    
    console.log('[TournamentPhaseManager] transitionToSemifinal complete');
    console.log(`  playerCount: ${newState.playerCount}`);
    console.log(`  currentPlayer: ${newState.currentPlayer}`);
    console.log(`  players: ${newState.players.map(p => p.id).join(', ')}`);
    
    return newState;
  }

  /**
   * Transition to final showdown phase
   * @param {object} gameState - Current game state
   * @returns {object} New game state after transition
   */
  static transitionToFinalShowdown(gameState) {
    console.log('[TournamentPhaseManager] transitionToFinalShowdown called');
    
    // Use existing startFinalShowdown function
    const newState = startFinalShowdown(gameState);
    
    console.log('[TournamentPhaseManager] transitionToFinalShowdown complete');
    console.log(`  playerCount: ${newState.playerCount}`);
    console.log(`  currentPlayer: ${newState.currentPlayer}`);
    console.log(`  players: ${newState.players.map(p => p.id).join(', ')}`);
    
    return newState;
  }

  /**
   * Set currentPlayer to the first active player in the state
   * @param {object} state - Game state
   * @returns {number} The player index that was set
   */
  static setCurrentPlayerToFirstActive(state) {
    const playerCount = state.playerCount || state.players?.length || 2;
    const playerStatuses = state.playerStatuses || {};
    const players = state.players || [];
    
    // Check players array first (has actual player objects)
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (player && player.id) {
        const status = playerStatuses[player.id];
        if (status !== 'ELIMINATED') {
          state.currentPlayer = i;
          console.log(`[TournamentPhaseManager] setCurrentPlayerToFirstActive: ${i} (from players array)`);
          return i;
        }
      }
    }
    
    // Fallback: check by index
    for (let i = 0; i < playerCount; i++) {
      const playerId = `player_${i}`;
      if (playerStatuses[playerId] !== 'ELIMINATED') {
        state.currentPlayer = i;
        console.log(`[TournamentPhaseManager] setCurrentPlayerToFirstActive: ${i} (from status check)`);
        return i;
      }
    }
    
    // Default to 0
    state.currentPlayer = 0;
    console.log(`[TournamentPhaseManager] setCurrentPlayerToFirstActive: 0 (fallback)`);
    return 0;
  }

  /**
   * Clear client ready status for a game
   * @param {number} gameId - Game ID
   * @param {object} gameManager - GameManager instance
   */
  static clearReadyStatus(gameId, gameManager) {
    if (gameManager?.clearClientReadyStatus) {
      gameManager.clearClientReadyStatus(gameId);
      console.log(`[TournamentPhaseManager] Cleared ready status for game ${gameId}`);
    } else {
      console.warn(`[TournamentPhaseManager] Cannot clear ready status: gameManager not available`);
    }
  }

  /**
   * Get qualified players for next phase
   * @param {object} gameState - Current game state
   * @returns {string[]} Array of qualified player IDs
   */
  static getQualifiedPlayers(gameState) {
    return TournamentManager.getQualifiedPlayers(gameState);
  }

  /**
   * Check if game is in a tournament phase transition
   * @param {object} oldState - State before action
   * @param {object} newState - State after action
   * @returns {boolean} True if transitioning
   */
  static isPhaseTransition(oldState, newState) {
    if (!oldState || !newState) return false;
    
    const oldPhase = oldState.tournamentPhase;
    const newPhase = newState.tournamentPhase;
    
    return oldPhase !== newPhase && 
           oldPhase !== null && 
           newPhase !== null &&
           ['QUALIFICATION_REVIEW', 'SEMI_FINAL', 'FINAL_SHOWDOWN'].includes(newPhase);
  }

  /**
   * Handle tournament phase transition
   * @param {number} gameId - Game ID
   * @param {object} oldState - State before transition
   * @param {object} newState - State after transition
   * @param {object} gameManager - GameManager instance
   * @returns {object} Updated state after handling transition
   */
  static handlePhaseTransition(gameId, oldState, newState, gameManager) {
    // Clear ready status on any tournament phase transition
    if (oldState?.tournamentPhase !== newState?.tournamentPhase && 
        newState?.tournamentMode) {
      this.clearReadyStatus(gameId, gameManager);
    }
    
    // Ensure currentPlayer is active after transition
    if (newState.tournamentPhase === 'SEMI_FINAL' || 
        newState.tournamentPhase === 'FINAL_SHOWDOWN') {
      this.setCurrentPlayerToFirstActive(newState);
    }
    
    return newState;
  }

  /**
   * Get debug info for phase transition
   * @param {object} state - Game state
   * @returns {string} Debug string
   */
  static getDebugInfo(state) {
    const qualifiedPlayers = this.getQualifiedPlayers(state);
    
    let info = `[TournamentPhaseManager] Debug:\n`;
    info += `  tournamentPhase: ${state.tournamentPhase}\n`;
    info += `  tournamentRound: ${state.tournamentRound}\n`;
    info += `  playerCount: ${state.playerCount}\n`;
    info += `  currentPlayer: ${state.currentPlayer}\n`;
    info += `  qualifiedPlayers: ${JSON.stringify(qualifiedPlayers)}\n`;
    info += `  playerStatuses: ${JSON.stringify(state.playerStatuses || {})}\n`;
    
    return info;
  }
}

module.exports = TournamentPhaseManager;
