/**
 * LooseCardRouter
 * Handles loose card drop decisions - capture vs createTemp.
 * 
 * Rules:
 * - Dropped card must be from hand to capture.
 * - Ranks must match for capture.
 * - For High Ranks (6-10, J, Q, K):
 *   - If player has another card of same rank (spare) → create temp stack
 *   - If only that one card → capture
 * - For Low Ranks (A-5):
 *   - Check for double card value first (e.g., 4 → 8)
 *     - If has double → create temp stack (sum build)
 *   - Else check for spare (same rank)
 *     - If has spare → create temp stack
 *   - Else → capture
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
      // Include source in payload so createTemp knows where the card is from
      return { type: 'createTemp', payload: { card, targetCard, source } };
    }

    // Ranks must match for capture
    if (card.rank !== targetCard.rank) {
      return { type: 'createTemp', payload: { card, targetCard, source } };
    }

    // Get player's hand
    const playerHand = state.players?.[playerIndex]?.hand || [];
    const cardValue = card.value || 0;
    
    // Determine if this is a high rank (6-10, J, Q, K) or low rank (A-5)
    const isHighRank = cardValue > 5;
    
    // Count how many cards of this rank the player has in hand (including the one being played)
    const sameRankCards = playerHand.filter(c => c.rank === card.rank);
    const hasSpare = sameRankCards.length > 1;
    
    if (isHighRank) {
      // HIGH RANKS (6-10, J, Q, K): Only same-rank stacks allowed
      // If player has a spare card of this rank → create temp stack
      // Otherwise → capture
      if (hasSpare) {
        console.log(`[LooseCardRouter] High rank ${card.rank}: has spare, creating temp stack`);
        return { type: 'createTemp', payload: { card, targetCard, source } };
      } else {
        console.log(`[LooseCardRouter] High rank ${card.rank}: no spare, capturing`);
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
    } else {
      // LOW RANKS (A-5): Can be same-rank OR sum builds
      // First, check if player has a card with exactly double the value (for sum build)
      const doubleValue = cardValue * 2;
      const hasDouble = playerHand.some(c => c.value === doubleValue);
      
      if (hasDouble) {
        // Has the double card → create sum build temp stack
        console.log(`[LooseCardRouter] Low rank ${card.rank}: has double (${doubleValue}), creating sum build`);
        return { type: 'createTemp', payload: { card, targetCard, source } };
      } else if (hasSpare) {
        // No double, but has spare → create same-rank build
        console.log(`[LooseCardRouter] Low rank ${card.rank}: no double, has spare, creating same-rank build`);
        return { type: 'createTemp', payload: { card, targetCard, source } };
      } else {
        // No double, no spare → capture
        console.log(`[LooseCardRouter] Low rank ${card.rank}: no double, no spare, capturing`);
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
