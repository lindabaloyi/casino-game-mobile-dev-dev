/**
 * TournamentManager
 * Handles tournament-specific logic including round transitions and player remapping.
 * Separated from game coordination to improve maintainability and testability.
 */

const endTournamentRound = require('../../../shared/game/actions/endTournamentRound');
const endFinalShowdown = require('../../../shared/game/actions/endFinalShowdown');

class TournamentManager {
  /**
   * Check if a game state is in tournament mode
   */
  static isTournamentActive(gameState) {
    return gameState?.tournamentMode === 'knockout';
  }

  /**
   * Handle tournament round transition
   * Returns the new game state after the transition
   */
  static handleRoundTransition(gameState, actionType = null) {
    // Check if transitioning to final showdown from qualification review
    if (actionType === 'advanceFromQualificationReview') {
      if (gameState.tournamentPhase === 'FINAL_SHOWDOWN') {
        return endFinalShowdown(gameState);
      } else if (gameState.tournamentPhase === 'SEMI_FINAL') {
        return endTournamentRound(gameState);
      }
    }

    // Check if already in final showdown phase
    if (gameState.tournamentPhase === 'FINAL_SHOWDOWN') {
      return endFinalShowdown(gameState);
    }

    // Handle regular tournament round
    return endTournamentRound(gameState);
  }

  /**
   * Handle tournament round end (called when a round ends in tournament mode)
   */
  static handleRoundEnd(gameState) {
    return endTournamentRound(gameState);
  }

  /**
   * Handle final showdown round end
   */
  static handleFinalShowdownRoundEnd(gameState) {
    return endFinalShowdown(gameState);
  }

  /**
   * Remap socket player indices when tournament transitions to new round
   * This ensures the winner starts first (playerIndex 0)
   * 
   * @param {Map} socketPlayerMap - The game's socket to player index mapping
   * @param {string[]|number[]} qualifiedPlayers - Array of player IDs (playerId strings like 'player_0' or numeric indices)
   */
  static remapPlayerIndices(socketPlayerMap, qualifiedPlayers) {
    if (!socketPlayerMap) {
      console.warn('[TournamentManager] No socket map provided for remapping');
      return;
    }

    console.log(`[TournamentManager] Remapping player indices with qualified: ${JSON.stringify(qualifiedPlayers)}`);
    
    // Handle both string playerId (e.g., 'player_0') and numeric indices
    // Convert to numeric indices for mapping
    const qualifiedIndices = [];
    for (const q of qualifiedPlayers) {
      if (typeof q === 'string') {
        // Extract numeric index from playerId string like 'player_0' -> 0
        const match = q.match(/^player_(\d+)$/);
        if (match) {
          qualifiedIndices.push(parseInt(match[1], 10));
        } else {
          console.warn(`[TournamentManager] Could not parse playerId: ${q}`);
        }
      } else if (typeof q === 'number') {
        qualifiedIndices.push(q);
      }
    }
    
    console.log(`[TournamentManager] Qualified indices (numeric): ${JSON.stringify(qualifiedIndices)}`);
    
    // Create a reverse mapping: old player index -> new player index
    // qualifiedPlayers[0] = winner -> new index 0
    // qualifiedPlayers[1] -> new index 1
    const oldToNewMap = {};
    qualifiedIndices.forEach((oldIndex, newIndex) => {
      oldToNewMap[oldIndex] = newIndex;
    });

    console.log(`[TournamentManager] Old to new mapping:`, oldToNewMap);

    // Update each socket's player index
    socketPlayerMap.forEach((oldPlayerIndex, socketId) => {
      if (oldToNewMap.hasOwnProperty(oldPlayerIndex)) {
        const newPlayerIndex = oldToNewMap[oldPlayerIndex];
        socketPlayerMap.set(socketId, newPlayerIndex);
        console.log(`[TournamentManager] Socket ${socketId}: player ${oldPlayerIndex} -> ${newPlayerIndex}`);
      } else {
        // This socket's player was eliminated - remove from game
        console.log(`[TournamentManager] Socket ${socketId}: player ${oldPlayerIndex} eliminated, removing`);
        socketPlayerMap.delete(socketId);
      }
    });

    console.log(`[TournamentManager] Player remapping complete`);
  }

  /**
   * Compute player index mapping for tournament qualification
   * @param {string[]|number[]} qualifiedPlayers - Array of player IDs or indices
   * @returns {Object} - { oldIndex: newIndex } mapping
   */
  static computeIndexMapping(qualifiedPlayers) {
    console.log(`[TournamentManager] Computing index mapping with qualified: ${JSON.stringify(qualifiedPlayers)}`);

    // Handle both string playerId (e.g., 'player_0') and numeric indices
    const qualifiedIndices = [];
    for (const q of qualifiedPlayers) {
      if (typeof q === 'string') {
        // Extract numeric index from playerId string like 'player_0' -> 0
        const match = q.match(/^player_(\d+)$/);
        if (match) {
          qualifiedIndices.push(parseInt(match[1], 10));
        } else {
          console.warn(`[TournamentManager] Could not parse playerId: ${q}`);
        }
      } else if (typeof q === 'number') {
        qualifiedIndices.push(q);
      }
    }

    console.log(`[TournamentManager] Qualified indices (numeric): ${JSON.stringify(qualifiedIndices)}`);

    // Create mapping: old index -> new index
    const indexMapping = {};
    qualifiedIndices.forEach((oldIndex, newIndex) => {
      indexMapping[oldIndex] = newIndex;
    });

    console.log(`[TournamentManager] Computed index mapping:`, indexMapping);
    return indexMapping;
  }

  /**
   * Check if tournament phase transition requires player remapping
   */
  static needsPlayerRemap(newPhase) {
    return newPhase === 'SEMI_FINAL' || newPhase === 'FINAL_SHOWDOWN';
  }

  /**
   * Get the qualified players from game state
   */
  static getQualifiedPlayers(gameState) {
    return gameState?.qualifiedPlayers || [];
  }
}

module.exports = TournamentManager;
