/**
 * ExtendRouter
 * Handles build extension logic - start vs accept.
 */

const StackHelper = require('../helpers/StackHelper');

class ExtendRouter {
  /**
   * Route extendBuild action
   * - Has pending extension → acceptBuildExtension
   * - No pending extension → startBuildExtension
   */
  route(payload, state) {
    const { stackId, card, cardSource } = payload;
    const stack = StackHelper.findStack(state, stackId);
    
    if (!stack) {
      throw new Error(`Build "${stackId}" not found`);
    }
    
    if (stack.pendingExtension?.looseCard) {
      // Has pending = accept the extension
      return { 
        type: 'acceptBuildExtension', 
        payload: { 
          stackId, 
          card, 
          cardSource: cardSource || 'hand' 
        } 
      };
    }
    
    // No pending = start new extension
    return { 
      type: 'startBuildExtension', 
      payload: { 
        stackId, 
        card, 
        cardSource: cardSource || 'hand' 
      } 
    };
  }
}

module.exports = ExtendRouter;
