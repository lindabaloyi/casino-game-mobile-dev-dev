/**
 * TempRouter
 * Handles temp stack validation (acceptTemp).
 */

const StackHelper = require('../helpers/StackHelper');

class TempRouter {
  /**
   * Route acceptTemp action
   * Validates that player doesn't already have ANOTHER active build
   */
  routeAcceptTemp(payload, state, playerIndex) {
    const { stackId } = payload;
    
    // Find the temp stack being accepted
    const tempStack = StackHelper.findTempStack(state, stackId);
    
    // If temp stack not found, let the handler deal with it
    if (!tempStack) {
      return { type: 'acceptTemp', payload };
    }
    
    // Check if this temp stack is already owned by this player
    const isOwnTemp = tempStack.owner === playerIndex;
    
    // If player doesn't own this temp, they can't accept it
    if (!isOwnTemp) {
      return { type: 'acceptTemp', payload };
    }
    
    // Player is accepting their own temp - check if they already have ANOTHER build
    const existingBuilds = StackHelper.getPlayerBuilds(state, playerIndex);
    
    if (existingBuilds.length > 0) {
      throw new Error(
        'You already have an active build. Complete or capture it before converting this temporary stack to a build.'
      );
    }
    
    // Allow acceptTemp
    return { type: 'acceptTemp', payload };
  }
}

module.exports = TempRouter;
