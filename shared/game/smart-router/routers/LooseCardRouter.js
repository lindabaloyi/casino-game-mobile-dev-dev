/**
 * LooseCardRouter
 * Handles loose card drop decisions - capture vs createTemp.
 * 
 * Rules:
 * - If player has an active build → force capture (if card from hand).
 * - Otherwise:
 *   - For Low Ranks (A-4): Always create temp stack (no auto-capture)
 *   - For High Ranks (5-K):
 *     - If player has another card of same rank (spare) → create temp stack
 *     - If only that one card → capture
 */

class LooseCardRouter {
  /**
   * Check if the player currently has an active build on the table.
   * @param {object} state - Game state
   * @param {number} playerIndex - Index of the player
   * @returns {boolean} - True if there is at least one temp stack owned by the player
   */
  hasActiveBuild(state, playerIndex) {
    return state.tableCards.some(tc => 
      tc.type === 'temp_stack' && tc.owner === playerIndex
    );
  }

  /**
   * Route createTemp with a target card
   * @param {object} payload - Contains card, targetCard, and source ('hand'|'table')
   * @param {object} state - Game state
   * @param {number} playerIndex - Index of the player
   * @returns {object} - Action object { type, payload }
   */
  routeCreateTemp(payload, state, playerIndex) {
    const { card, targetCard, source } = payload;

    // No target card – just create a temporary stack
    if (!targetCard) {
      return { type: 'createTemp', payload: { card } };
    }

    // Card from table cannot be used to capture
    if (source !== 'hand') {
      // Include source in payload so createTemp knows where the card is from
      return { type: 'createTemp', payload: { card, targetCard, source } };
    }

    // Ranks must match for capture
    if (card.rank !== targetCard.rank) {
      return { type: 'createTemp', payload: { card, targetCard, source } };
    }

    // If player has an active build, force capture (ignore low-rank/spare checks)
    if (this.hasActiveBuild(state, playerIndex)) {
      return {
        type: 'captureOwn',
        payload: {
          card,
          targetType: 'loose',
          targetRank: targetCard.rank,
          targetSuit: targetCard.suit
        }
      };
    }

    // Get player's hand for spare-card check
    const playerHand = state.players?.[playerIndex]?.hand || [];
    const cardValue = card.value || 0;

    // Cards 1-4 (A-4): Always stack (create temp) - no auto-capture
    // Cards 5+ (5-K): Keep existing capture behavior
    const isLowRank = cardValue <= 4;

    // Count how many cards of this rank the player has in hand (including the one being played)
    const sameRankCards = playerHand.filter(c => c.rank === card.rank);
    const hasSpare = sameRankCards.length > 1;

    if (isLowRank) {
      // LOW RANKS (A-4): Always create temp - no auto-capture
      // Player can decide later what to do with the stack
      return { type: 'createTemp', payload: { card, targetCard, source } };
    } else {
      // HIGH RANKS (5-K): Keep existing behavior
      // If player has a spare card of this rank → create temp stack
      // Otherwise → capture
      if (hasSpare) {
        return { type: 'createTemp', payload: { card, targetCard, source } };
      } else {
        return {
          type: 'captureOwn',
          payload: {
            card,
            targetType: 'loose',
            targetRank: targetCard.rank,
            targetSuit: targetCard.suit
          }
        };
      }
    }
  }
}

module.exports = LooseCardRouter;
