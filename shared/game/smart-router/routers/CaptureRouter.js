/**
 * CaptureRouter
 * Handles capture/steal logic for builds.
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
      return this.routeOwnBuild(payload, stack);
    } else {
      return this.routeOpponentBuild(payload, stack, playerIndex);
    }
  }

  /**
   * Route capture of own build
   */
  routeOwnBuild(payload, stack) {
    // Can addToTemp if card value doesn't match build value
    if (payload.card.value !== stack.value) {
      return { 
        type: 'addToTemp', 
        payload: { card: payload.card, stackId: payload.targetStackId } 
      };
    }
    // Value matches = capture own build
    return { type: 'captureOwn', payload };
  }

  /**
   * Route capture of opponent's build
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
