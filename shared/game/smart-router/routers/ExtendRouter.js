/**
 * ExtendRouter
 * Handles build extension logic.
 * 
 * Now uses unified extendBuild action which handles both:
 * - Starting a new pending extension
 * - Adding to an existing pending extension
 */

const StackHelper = require('../helpers/StackHelper');

class ExtendRouter {
  /**
   * Route extendBuild action
   * The unified extendBuild action handles all cases internally:
   * - If no pending extension → starts one
   * - If has pending extension → adds to it
   */
  route(payload, state, playerIndex) {
    const { stackId, card, cardSource } = payload;
    const stack = StackHelper.findStack(state, stackId);
    
    if (!stack) {
      throw new Error(`Build "${stackId}" not found`);
    }
    
    // Unified action handles both cases
    return { 
      type: 'extendBuild', 
      payload: { stackId, card, cardSource } 
    };
  }
}

module.exports = ExtendRouter;
