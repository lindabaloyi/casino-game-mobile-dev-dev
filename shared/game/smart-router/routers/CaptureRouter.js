/**
 * CaptureRouter
 * Handles capture/steal logic for builds.
 * 
 * Custom rules for own builds:
 * - Same-rank builds: if player has another card of that rank (spare), must extend (addToTemp)
 * - Sum builds: use value comparison
 */

const StackHelper = require('../helpers/StackHelper');
const StealValidator = require('../validators/StealValidator');

class CaptureRouter {
  /**
   * Main capture routing entry point
   */
  route(payload, state, playerIndex) {
    const { targetType, targetStackId } = payload;
    
    // Loose card capture - delegate to captureOwn
    if (targetType !== 'build' || !targetStackId) {
      return { type: 'captureOwn', payload };
    }
    
    const stack = StackHelper.findStack(state, targetStackId);
    if (!stack) {
      return { type: 'captureOwn', payload };
    }
    
    const isOwnBuild = stack.owner === playerIndex;
    
    if (isOwnBuild) {
      // Pass state and playerIndex to check for spare cards
      return this.routeOwnBuild(payload, stack, state, playerIndex);
    } else {
      return this.routeOpponentBuild(payload, stack, state, playerIndex);
    }
  }

  /**
   * Route capture of own build
   * Now handles same-rank builds with spare check.
   */
  routeOwnBuild(payload, stack, state, playerIndex) {
    const { card } = payload;

    // Check if this is a same-rank build (all cards have the same rank)
    const isSameRankBuild = stack.cards.length > 0 && 
                            stack.cards.every(c => c.rank === stack.cards[0].rank);

    if (isSameRankBuild) {
      const buildRank = stack.cards[0].rank;

      // Count how many cards of that rank the player has in hand (including the one being played)
      const hand = state.players[playerIndex].hand;
      const sameRankCount = hand.filter(c => c.rank === buildRank).length;

      // If there is a spare (more than one), the player must extend the build
      if (sameRankCount > 1) {
        return { 
          type: 'extendBuild', 
          payload: { card, stackId: payload.targetStackId, cardSource: 'hand' } 
        };
      } else {
        // No spare → capture the build
        return { type: 'captureOwn', payload };
      }
    } else {
      // Sum build (mixed ranks) – use value comparison
      if (card.value === stack.value) {
        return { type: 'captureOwn', payload };
      } else {
        // Value doesn't match – they're trying to extend the sum build
        // Route to extendBuild (not addToTemp which is only for temp stacks)
        return { 
          type: 'extendBuild', 
          payload: { card, stackId: payload.targetStackId, cardSource: 'hand' } 
        };
      }
    }
  }

  /**
   * Route capture of opponent's build
   * Distinguishes between pure steals and choice scenarios
   */
  routeOpponentBuild(payload, stack, state, playerIndex) {
    const { card, cardSource } = payload;
    
    // Card value matches build value = capture (not steal)
    if (payload.card.value === stack.value) {
      return { type: 'captureOpponent', payload };
    }
    
    // CRITICAL: Steal can ONLY be initiated with a card from player's hand
    const source = cardSource || 'hand';
    if (source !== 'hand') {
      console.log(`[CaptureRouter] Invalid steal attempt - card source is '${source}', only 'hand' allowed for steal`);
      throw new Error(`Cannot steal build - card must be from hand, not from ${source}`);
    }
    
    // Validate steal attempt - throws if invalid
    if (!StealValidator.isValid(stack, payload.card)) {
      throw new Error(StealValidator.getErrorMessage(stack, payload.card));
    }
    
    // Check for CHOICE scenario (CaptureOrSteal modal)
    // ALL conditions must be met:
    // 1. Card value = Build value (capture possible)
    // 2. Build value ≤ 5 (small build)
    // 3. Build has NO base (can extend)
    // 4. Player has extension card (to make new build value)
    const isCapturePossible = payload.card.value === stack.value;
    const isSmallBuild = stack.value <= 5;
    const hasBase = stack.hasBase === true;
    const extendedValue = stack.value + payload.card.value;
    const playerHand = state.players[playerIndex]?.hand || [];
    const hasExtendedCard = playerHand.some(c => c.value === extendedValue);
    
    // Choice scenario: ALL conditions met
    if (isCapturePossible && isSmallBuild && !hasBase && hasExtendedCard) {
      console.log('[CaptureRouter] Choice scenario - show both capture and steal options');
      return { 
        type: 'choice', 
        payload: { 
          card: payload.card, 
          stackId: payload.targetStackId,
          showStealOnly: false,  // Show both options
          options: [
            { 
              action: 'captureOpponent', 
              params: { card: payload.card, targetType: 'build', targetStackId: payload.targetStackId } 
            },
            { 
              action: 'stealBuild', 
              params: { card: payload.card, stackId: payload.targetStackId, cardSource: source } 
            }
          ]
        }
      };
    }
    
    // Pure steal: any other valid steal (showStealOnly: true)
    // This includes:
    // - Card value < Build value
    // - Card value > Build value (as long as Build + Card ≤ 10)
    console.log('[CaptureRouter] Pure steal - show only steal option');
    return { 
      type: 'choice', 
      payload: { 
        card: payload.card, 
        stackId: payload.targetStackId,
        showStealOnly: true,  // Show only steal option
        options: [
          { 
            action: 'stealBuild', 
            params: { card: payload.card, stackId: payload.targetStackId, cardSource: source } 
          }
        ]
      }
    };
  }
}

module.exports = CaptureRouter;
