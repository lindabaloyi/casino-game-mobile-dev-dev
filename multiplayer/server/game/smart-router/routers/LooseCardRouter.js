/**
 * LooseCardRouter
 * Handles loose card drop decisions - capture vs createTemp.
 * 
 * Analyzes player's hand to decide:
 * - Single card of rank → capture (no spare)
 * - Multiple cards of rank → createTemp (spare exists)
 */

class LooseCardRouter {
  /**
   * Route createTemp with a target card
   * Smart decision: capture vs createTemp based on player's hand
   */
  routeCreateTemp(payload, state, playerIndex) {
    const { card, targetCard } = payload;
    
    // No target card - just create temp
    if (!targetCard) {
      return { type: 'createTemp', payload };
    }
    
    // Ranks must match for capture
    if (card.rank !== targetCard.rank) {
      console.log(`[LooseCardRouter] Ranks don't match (${card.rank} vs ${targetCard.rank}) - creating temp`);
      return { type: 'createTemp', payload };
    }
    
    // Check for spare cards of same rank in player's hand
    const playerHand = state.playerHands?.[playerIndex] || [];
    const sameRankCards = playerHand.filter(c => c.rank === card.rank);
    
    if (sameRankCards.length === 1) {
      // Only one card of this rank - capture the loose card
      console.log(`[LooseCardRouter] Single ${card.rank} in hand - routing to captureOwn`);
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
    
    // Has spare - create temp
    console.log(`[LooseCardRouter] Multiple ${card.rank} in hand (${sameRankCards.length}) - creating temp`);
    return { type: 'createTemp', payload };
  }
}

module.exports = LooseCardRouter;
