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
   * Active builds include:
   * - temp_stack: unaccepted temporary stacks
   * - build_stack: accepted/confirmed builds
   * 
   * @param {object} state - Game state
   * @param {number} playerIndex - Index of the player
   * @returns {boolean} - True if there is at least one temp_stack or build_stack owned by the player
   */
  hasActiveBuild(state, playerIndex) {
    return state.tableCards.some(tc => 
      (tc.type === 'temp_stack' || tc.type === 'build_stack') && 
      tc.owner === playerIndex
    );
  }

  /**
   * Check if there are other loose cards on the table besides the target.
   * Loose cards are table cards without a 'type' property (not temp_stack, build_stack, etc.)
   * 
   * @param {object} state - Game state
   * @param {object} targetCard - The target loose card being considered
   * @returns {boolean} - True if there is at least one other loose card
   */
  hasOtherLooseCards(state, targetCard) {
    const looseCards = state.tableCards.filter(tc => !tc.type);
    // If more than one loose card, there is at least one other besides the target
    return looseCards.length > 1;
  }

  /**
   * Check if the targetCard actually exists on the table as a loose card.
   * This handles the case where a card was dragged but not actually dropped on a target.
   * 
   * @param {object} state - Game state
   * @param {object} targetCard - The target card to validate
   * @returns {boolean} - True if the target exists on the table as a loose card
   */
  isValidTargetOnTable(state, targetCard) {
    if (!targetCard || !targetCard.rank || !targetCard.suit) {
      return false;
    }
    return state.tableCards.some(tc => 
      !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit
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

    // Target card provided but not found on table - user dragged without intent
    // Return no-op instead of throwing an error (graceful handling)
    if (!this.isValidTargetOnTable(state, targetCard)) {
      console.log('[LooseCardRouter] Target card not found on table - no-op');
      return { type: 'noop', payload: {} };
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

    // If player has an active build, force capture (overrides all other rules)
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

    // If there are other loose cards on the table besides the target, force build
    // This enforces the strategic rule: must build if not the only loose card
    if (this.hasOtherLooseCards(state, targetCard)) {
      return { type: 'createTemp', payload: { card, targetCard, source } };
    }

    // Get player's hand for spare-card check
    const playerHand = state.players?.[playerIndex]?.hand || [];
    const cardValue = card.value || 0;

    // Cards 1-5 (A-5): Always stack (create temp) - no auto-capture
    // Cards 6+ (6-K): Keep existing capture behavior
    const isLowRank = cardValue <= 5;

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
