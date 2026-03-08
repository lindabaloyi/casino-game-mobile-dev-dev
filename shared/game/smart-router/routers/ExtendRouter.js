/**
 * ExtendRouter
 * Handles build extension logic - start vs addToPending.
 */

const StackHelper = require('../helpers/StackHelper');

class ExtendRouter {
  /**
   * Route extendBuild action
   * - If player Shiya'd this build → route to capture (allows Shiya player to capture)
   * - Has pending extension → addToPendingExtension
   * - No pending extension → startBuildExtension
   */
  route(payload, state, playerIndex) {
    const { stackId, card, cardSource } = payload;
    const stack = StackHelper.findStack(state, stackId);
    
    if (!stack) {
      throw new Error(`Build "${stackId}" not found`);
    }
    
    // Check if THIS player has Shiya'd this build
    // If so, route to capture instead of extend
    if (stack.shiyaActive && stack.shiyaPlayer === playerIndex) {
      console.log(`[ExtendRouter] Player ${playerIndex} has Shiya on this build → routing to capture`);
      return { 
        type: 'capture', 
        payload: { 
          card, 
          targetType: 'build', 
          targetStackId: stackId,
          cardSource 
        } 
      };
    }
    
    if (stack.pendingExtension) {
      // Has pending = add to it
      return { 
        type: 'addToPendingExtension', 
        payload: { stackId, card, cardSource } 
      };
    }
    
    // No pending = start new extension
    return { 
      type: 'startBuildExtension', 
      payload: { stackId, card, cardSource } 
    };
  }
}

module.exports = ExtendRouter;
