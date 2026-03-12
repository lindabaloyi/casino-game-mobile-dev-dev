/**
 * RoundValidator
 * Handles round end detection and round summary generation.
 * 
 * Round ends when BOTH:
 * 1. All players' hands are empty (no cards left to play)
 * 2. All players have turnEnded = true (final trick completed)
 * 
 * This relies on the turn tracking flags system.
 */

const { cloneDeep } = require('../../../../shared/utils/cloneDeep');
const { allPlayersTurnEnded, forceEndTurn, createRoundPlayers, startNextRound } = require('../../../../shared/game');

class RoundValidator {
  static STARTING_CARDS = 10;
  
  /**
   * Check if the current round should end.
   * Round ends when BOTH:
   * 1. All players' hands are empty (all cards played)
   * 2. All players have turnEnded = true (final trick complete)
   * @param {object} state - Game state
   * @returns {{ ended: boolean, reason?: 'all_cards_played' }}
   */
  static shouldEndRound(state) {
    // Check 1: All players' hands empty
    const playerCount = state.playerCount || state.players?.length || 2;
    let allHandsEmpty = true;
    for (let i = 0; i < playerCount; i++) {
      if (state.players[i]?.hand?.length > 0) {
        allHandsEmpty = false;
        break;
      }
    }

    // Check 2: All players have turnEnded = true
    const allTurnsEnded = allPlayersTurnEnded(state);

    // Check 3: No unresolved stacks on table (temp stacks, pending builds)
    const tableCards = state.tableCards || [];
    const tempStacks = tableCards.filter(tc => tc.type === 'temp_stack');
    const pendingExtensions = tableCards.filter(tc => tc.type === 'build_stack' && tc.pendingExtension);
    const hasUnresolved = tempStacks.length > 0 || pendingExtensions.length > 0;
    
    console.log(`[RoundValidator] shouldEndRound: playerCount=${playerCount}, round=${state.round}, allHandsEmpty=${allHandsEmpty}, allTurnsEnded=${allTurnsEnded}, hasUnresolved=${hasUnresolved}, tempStacks=${tempStacks.length}, pendingExt=${pendingExtensions.length}`);
    
    // Round ends when BOTH conditions are true AND no unresolved stacks
    if (allHandsEmpty && allTurnsEnded && !hasUnresolved) {
      console.log(`[RoundValidator] shouldEndRound: Round ${state.round} ENDED!`);
      return { ended: true, reason: 'all_cards_played' };
    }
    
    return { ended: false };
  }

  /**
   * CRITICAL: Validate Round 1 cannot end prematurely.
   * Forces end turns for any player who hasn't acted.
   * @param {object} state - Game state
   * @returns {object} Updated state with forced end turns if needed
   */
  static validateRound1End(state) {
    // Only apply to round 1
    if (state.round !== 1) {
      return state;
    }
    
    const players = state.roundPlayers || {};
    const playerIds = Object.keys(players);
    
    // If no roundPlayers yet, initialize them
    if (playerIds.length === 0) {
      return state;
    }
    
    const incompletePlayers = [];
    
    for (const playerId of playerIds) {
      const playerState = players[playerId];
      if (!playerState.turnEnded) {
        incompletePlayers.push(parseInt(playerId));
      }
    }
    
    if (incompletePlayers.length > 0) {
      // Force end turn for each incomplete player
      let newState = state;
      for (const playerId of incompletePlayers) {
        newState = forceEndTurn(newState, playerId);
      }
      
      return newState;
    }
    
    return state;
  }

  /**
   * Get a summary of the current round.
   * @param {object} state - Game state
   * @returns {{ round, cardsRemaining, scores, winner }}
   */
  static getRoundSummary(state) {
    const playerCount = state.playerCount || state.players?.length || 2;
    const playerHands = state.players || [];
    
    // Sum cards from ALL players
    let cardsRemaining = 0;
    for (let i = 0; i < playerCount; i++) {
      cardsRemaining += playerHands[i]?.hand?.length || 0;
    }
    
    // Get scores for all players
    const scores = state.scores || new Array(playerCount).fill(0);
    
    return {
      round: state.round,
      cardsRemaining,
      scores,
      winner: this.determineRoundWinner(state)
    };
  }

  /**
   * Determine the winner of the current round based on scores.
   * For 4-player: team with higher score wins
   * @param {object} state - Game state
   * @returns {number} 0 for player/team 1, 1 for player/team 2, -1 for tie
   */
  static determineRoundWinner(state) {
    const playerCount = state.playerCount || state.players?.length || 2;
    
    // For 4-player, use team scores
    if (playerCount === 4 && state.teamScores) {
      const [teamAScore, teamBScore] = state.teamScores;
      if (teamAScore > teamBScore) return 0; // Team A wins
      if (teamBScore > teamAScore) return 1; // Team B wins
      return -1; // tie
    }
    
    // For 2-player, use individual scores
    const scores = state.scores || [0, 0];
    const [score1, score2] = scores;
    if (score1 > score2) return 0;
    if (score2 > score1) return 1;
    return -1; // tie
  }

  /**
   * Calculate scores from captured cards.
   * @param {object} state - Game state
   * @returns {{ scores: number[], details: object }}
   */
  static calculateScores(state) {
    const playerCount = state.playerCount || state.players?.length || 2;
    const players = state.players || [];
    
    // Calculate scores for ALL players
    const scores = new Array(playerCount).fill(0);
    const details = {};
    
    for (let i = 0; i < playerCount; i++) {
      const captures = players[i]?.captures || [];
      scores[i] = captures.length;
      details[`player${i}Captures`] = captures.length;
    }
    
    // For 4-player, also calculate team scores
    if (playerCount === 4) {
      const teamAScore = scores[0] + scores[1]; // Players 0 and 1
      const teamBScore = scores[2] + scores[3]; // Players 2 and 3
      details.teamAScore = teamAScore;
      details.teamBScore = teamBScore;
    }
    
    return { scores, details };
  }

  /**
   * Prepare state for next round using the shared startNextRound function.
   * This ensures both local and multiplayer games use the same logic.
   * @param {object} state - Current game state
   * @returns {object|null} Updated game state for next round, or null if no more rounds allowed
   */
  static prepareNextRound(state) {
    const playerCount = state.playerCount || state.players?.length || 2;
    
    // Use the shared startNextRound function from GameState
    const newState = startNextRound(state, playerCount);
    
    if (newState) {
      // Keep scores accumulated
      newState.scores = state.scores;
      newState.teamScores = state.teamScores;
      return newState;
    }
    
    // If null returned, no more rounds allowed
    return null;
  }

  /**
   * Check if the entire game is over.
   * For 2-player mode: game ends after round 2
   * For 4-player party mode: game ends after round 1 (single round game)
   * @param {object} state - Game state
   * @returns {{ gameOver: boolean, winner?: number, finalScores: [number, number] }}
   */
  static checkGameOver(state) {
    const playerCount = state.playerCount || state.players?.length || 2;
    console.log(`[RoundValidator] checkGameOver: playerCount=${playerCount}, round=${state.round}`);
    
    // For 4-player party mode: game ends after round 1
    if (playerCount >= 4) {
      console.log(`[RoundValidator] checkGameOver: 4-player mode detected, ending game after round ${state.round}`);
      const winner = this.determineRoundWinner(state);
      console.log(`[RoundValidator] checkGameOver: winner=${winner}, scores=${JSON.stringify(state.scores)}`);
      return {
        gameOver: true,
        winner,
        finalScores: state.scores || new Array(playerCount).fill(0)
      };
    }
    
    // For 2-player mode: game ends after round 2
    const MAX_ROUNDS = 2;
    
    if (state.round >= MAX_ROUNDS) {
      console.log(`[RoundValidator] checkGameOver: 2-player round ${state.round} >= ${MAX_ROUNDS}, ending game`);
      const winner = this.determineRoundWinner(state);
      console.log(`[RoundValidator] checkGameOver: winner=${winner}, scores=${JSON.stringify(state.scores)}`);
      return {
        gameOver: true,
        winner,
        finalScores: state.scores || [0, 0]
      };
    }
    
    console.log(`[RoundValidator] checkGameOver: game not over, round=${state.round}, maxRounds=${MAX_ROUNDS}`);
    return { gameOver: false };
  }
}

module.exports = RoundValidator;
