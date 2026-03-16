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
