/**
 * StackDropRouter
 * Handles all stack drop decisions.
 * - temp_stack → addToTemp
 * - build_stack → check ownership + hand for smart routing
 * - loose card (via createTemp pathway) → check hand for capture vs temp
 */

const StackHelper = require('../helpers/StackHelper');
const CaptureRouter = require('./CaptureRouter');
const ExtendRouter = require('./ExtendRouter');
const LooseCardRouter = require('./LooseCardRouter');

class StackDropRouter {
  constructor() {
    this.captureRouter = new CaptureRouter();
    this.extendRouter = new ExtendRouter();
    this.looseCardRouter = new LooseCardRouter();
  }

  /**
   * Main entry point for stack drop routing
   */
  route(payload, state, playerIndex) {
    const { stackType, stackId, card, targetCard } = payload;
    
    // Temp stack drops
    if (stackType === 'temp_stack') {
      return { 
        type: 'addToTemp', 
        payload: { card, stackId } 
      };
    }
    
    // Build stack drops
    if (stackType === 'build_stack') {
      return this.routeBuildStackDrop(payload, state, playerIndex);
    }
    
    // Loose card drops (no stack) - delegate to LooseCardRouter
    return this.looseCardRouter.routeCreateTemp(payload, state, playerIndex);
  }

  /**
   * Route drop on a build stack
   */
  routeBuildStackDrop(payload, state, playerIndex) {
    const { stackId, card } = payload;
    
    const stack = StackHelper.findStack(state, stackId);
    if (!stack) {
      throw new Error(`Build stack "${stackId}" not found`);
    }
    
    const isOwnBuild = stack.owner === playerIndex;
    
    if (isOwnBuild) {
      return this.routeOwnBuildDrop(payload, stack, state, playerIndex);
    } else {
      return this.routeOpponentBuildDrop(payload, stack, state, playerIndex);
    }
  }

  /**
   * Route drop on own build
   */
  routeOwnBuildDrop(payload, stack, state, playerIndex) {
    const { stackId, card } = payload;
    
    // Check for pending extension first
    if (stack.pendingExtension?.looseCard) {
      return this.extendRouter.route({ stackId, card, cardSource: 'hand' }, state);
    }
    
    // Analyze hand for capture vs extend
    const playerHand = state.playerHands?.[playerIndex] || [];
    const captureCards = playerHand.filter(c => c.value === stack.value);
    
    if (captureCards.length === 1) {
      // Single capture card → capture
      console.log(`[StackDropRouter] Single capture card ${captureCards[0].rank} - routing to captureOwn`);
      return { 
        type: 'captureOwn', 
        payload: { card, targetType: 'build', targetStackId: stackId } 
      };
    }
    
    // Multiple or none → extend
    console.log(`[StackDropRouter] ${captureCards.length} capture cards - routing to extendBuild`);
    return this.extendRouter.route({ stackId, card, cardSource: 'hand' }, state);
  }

  /**
   * Route drop on opponent's build
   */
  routeOpponentBuildDrop(payload, stack, state, playerIndex) {
    // Delegate to CaptureRouter for opponent build logic
    // Pass full state so CaptureRouter can find the stack
    return this.captureRouter.route(
      { card: payload.card, targetType: 'build', targetStackId: payload.stackId },
      state,
      playerIndex
    );
  }
}

module.exports = StackDropRouter;
