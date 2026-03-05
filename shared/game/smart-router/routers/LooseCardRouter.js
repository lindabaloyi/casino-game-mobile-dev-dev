/**
 * LooseCardRouter
 * Handles loose card drop decisions - capture vs createTemp.
 * 
 * Rules:
 * - Dropped card must be from hand to capture.
 * - Ranks must match for capture.
 * - Capture allowed only if player has exactly one card of that rank in hand.
 * - Otherwise, create a temporary stack.
 */

class LooseCardRouter {
  /**
   * Route createTemp with a target card
   * @param {object} payload - Contains card, targetCard, and source ('hand'|'table')
   */
  routeCreateTemp(payload, state, playerIndex) {
    const { card, targetCard, source } = payload;

    // No target card – just create a temporary stack
    if (!targetCard) {
      return { type: 'createTemp', payload: { card } };
    }

    // Card from table cannot be used to capture
    if (source !== 'hand') {
      return { type: 'createTemp', payload: { card, targetCard } };
    }

    // Ranks must match for capture
    if (card.rank !== targetCard.rank) {
      return { type: 'createTemp', payload: { card, targetCard } };
    }

    // Check for spare cards of the same rank in player's hand
    const playerHand = state.playerHands?.[playerIndex] || [];
    const sameRankCards = playerHand.filter(c => c.rank === card.rank);

    if (sameRankCards.length === 1) {
      // Only one card of this rank (the one being used) – capture the loose card
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

    // Multiple cards of this rank – create temporary stack instead
    return { type: 'createTemp', payload: { card, targetCard } };
  }
}

module.exports = LooseCardRouter;
