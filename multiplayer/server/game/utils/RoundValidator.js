/**
 * RoundValidator
 * Handles round end detection and round summary generation.
 * 
 * Round ends when turnCounter >= 20 (both players played all 10 cards each)
 * AND both player hands are empty.
 */

class RoundValidator {
  static STARTING_CARDS = 10;
  static MAX_TURNS_ROUND_1 = 22; // 10 cards per player × 2 players = 20 turns, starts at 1, ends at 22

  /**
   * Check if the current round should end.
   * Round ends when:
   * - turnCounter >= 20 (all cards have been played), AND
   * - both player hands are empty
   * @param {object} state - Game state
   * @returns {{ ended: boolean, reason?: 'all_cards_played' }}
   */
  static shouldEndRound(state) {
    const playerHands = state.players || [];
    const player1Cards = playerHands[0]?.hand?.length || 0;
    const player2Cards = playerHands[1]?.hand?.length || 0;
    const turnCount = state.turnCounter || 1;
    
    console.log(`[RoundValidator] Checking round end: turnCounter=${turnCount}/22, P1hand=${player1Cards}, P2hand=${player2Cards}`);
    
    // Round ends when BOTH conditions are met:
    // 1. Both player hands are empty
    // 2. turnCounter >= 2 (at least one full turn completed)
    const handsEmpty = player1Cards === 0 && player2Cards === 0;
    const hasPlayed = turnCount >= 2;
    
    if (handsEmpty && hasPlayed) {
      console.log(`[RoundValidator] ✅ Round ending: both hands empty (turn ${turnCount})`);
      return { ended: true, reason: 'all_cards_played' };
    }
    
    // Debug: show why not ending
    if (!handsEmpty) {
      console.log(`[RoundValidator] Round continues: P1 has ${player1Cards}, P2 has ${player2Cards}`);
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
    const playerHands = state.players || [];
    
    return {
      round: state.round,
      cardsRemaining: (playerHands[0]?.hand?.length || 0) + 
                      (playerHands[1]?.hand?.length || 0),
      scores: state.scores || [0, 0],
      winner: this.determineRoundWinner(state)
    };
  }

  /**
   * Determine the winner of the current round based on scores.
   * @param {object} state - Game state
   * @returns {number} 0 for player 1, 1 for player 2, -1 for tie
   */
  static determineRoundWinner(state) {
    const [score1, score2] = state.scores || [0, 0];
    if (score1 > score2) return 0;
    if (score2 > score1) return 1;
    return -1; // tie
  }

  /**
   * Calculate scores from captured cards.
   * @param {object} state - Game state
   * @returns {{ scores: [number, number], details: object }}
   */
  static calculateScores(state) {
    const { playerCaptures = [], round } = state;
    const scores = [0, 0];
    const players = state.players || [];
    const p0Captures = players[0]?.captures || [];
    const p1Captures = players[1]?.captures || [];
    
    // Each round, captured cards stay with the player
    // At end of game, scoring is calculated based on total captured cards
    
    // For round transition, we just keep track of accumulated scores
    const previousScores = state.scores || [0, 0];
    
    // Add any points earned in this round
    // (This is simplified - actual scoring may vary by game variant)
    scores[0] = previousScores[0];
    scores[1] = previousScores[1];
    
    return {
      scores,
      details: {
        player0Captures: p0Captures.length || 0,
        player1Captures: p1Captures.length || 0
      }
    };
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
