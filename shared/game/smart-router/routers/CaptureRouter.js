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
    const { targetType, targetStackId, card } = payload;
    
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
      return this.routeOpponentBuild(payload, stack, playerIndex);
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
          type: 'startBuildExtension', 
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
        // Value doesn't match – maybe they're trying to add to the sum build?
        return { 
          type: 'addToTemp', 
          payload: { card, stackId: payload.targetStackId } 
        };
      }
    }
  }

  /**
   * Route capture of opponent's build (unchanged)
   */
  routeOpponentBuild(payload, stack, playerIndex) {
    // Card value matches build value = capture (not steal)
    if (payload.card.value === stack.value) {
      return { type: 'captureOpponent', payload };
    }
    
    // Validate steal attempt
    if (!StealValidator.isValid(stack, payload.card)) {
      throw new Error(StealValidator.getErrorMessage(stack, payload.card));
    }
    
    return { 
      type: 'stealBuild', 
      payload: { card: payload.card, stackId: payload.targetStackId } 
    };
  }
}

module.exports = CaptureRouter;
