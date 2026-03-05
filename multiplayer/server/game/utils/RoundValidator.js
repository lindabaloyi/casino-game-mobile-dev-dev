/**
 * RoundValidator
 * Handles round end detection and round summary generation.
 * 
 * 2-player: Round ends when turnCounter >= 22 (10 cards × 2 players + 2)
 * 4-player: Round ends when turnCounter >= 42 (10 cards × 4 players + 2)
 */

class RoundValidator {
  static STARTING_CARDS = 10;
  
  static getMaxTurns(playerCount) {
    // 10 cards per player + 2 buffer for turn logic
    return (playerCount * 10) + 2;
  }

  /**
   * Check if the current round should end.
   * Round ends when:
   * - All player hands are empty
   * - turnCounter >= max turns for player count
   * @param {object} state - Game state
   * @returns {{ ended: boolean, reason?: 'all_cards_played' }}
   */
  static shouldEndRound(state) {
    const playerCount = state.playerCount || state.players?.length || 2;
    const maxTurns = this.getMaxTurns(playerCount);
    const playerHands = state.players || [];
    
    // Check ALL players' hands (works for 2 or 4 players)
    let allHandsEmpty = true;
    let totalCardsInHands = 0;
    for (let i = 0; i < playerCount; i++) {
      const cards = playerHands[i]?.hand?.length || 0;
      totalCardsInHands += cards;
      if (cards > 0) {
        allHandsEmpty = false;
      }
    }
    
    const turnCount = state.turnCounter || 1;
    const hasPlayed = turnCount >= 2;
    
    console.log(`[RoundValidator] Checking round end (${playerCount} players): turnCounter=${turnCount}/${maxTurns}, totalCardsInHands=${totalCardsInHands}`);
    
    if (allHandsEmpty && hasPlayed) {
      console.log(`[RoundValidator] ✅ Round ending: all ${playerCount} hands empty (turn ${turnCount})`);
      return { ended: true, reason: 'all_cards_played' };
    }
    
    // Debug: show why not ending
    if (!allHandsEmpty) {
      console.log(`[RoundValidator] Round continues: total ${totalCardsInHands} cards remaining in all hands`);
    } else if (!hasPlayed) {
      console.log(`[RoundValidator] Round continues: only ${turnCount} turns played, need at least 2`);
    }
    
    return { ended: false };
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
   * Prepare state for next round.
   * @param {object} state - Current game state
   * @returns {object} Updated game state for next round
   */
  static prepareNextRound(state) {
    const nextRound = state.round + 1;
    
    // Reset for next round
    const newState = {
      ...state,
      round: nextRound,
      moveCount: 0,
      turnCounter: 1,
      currentPlayer: 0,
      tableCards: [],
      // Keep scores accumulated
      scores: state.scores,
      // Keep player hands (if any remaining from previous round logic)
      // In a real game, you might deal new cards here
    };
    
    // If moving to round 2, deal new hands if needed
    if (nextRound === 2) {
      // For now, we'll let the existing cards stay in hand
      // In a full implementation, you might:
      // 1. Keep captured cards separate
      // 2. Shuffle and deal new hands
      // 3. Or use the remaining cards in hand
    }
    
    return newState;
  }

  /**
   * Check if the entire game is over.
   * @param {object} state - Game state
   * @returns {{ gameOver: boolean, winner?: number, finalScores: [number, number] }}
   */
  static checkGameOver(state) {
    // Game ends after round 2 (or configurable number of rounds)
    const MAX_ROUNDS = 2;
    
    if (state.round >= MAX_ROUNDS) {
      const winner = this.determineRoundWinner(state);
      return {
        gameOver: true,
        winner,
        finalScores: state.scores || [0, 0]
      };
    }
    
    return { gameOver: false };
  }
}

module.exports = RoundValidator;
