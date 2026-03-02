/**
 * TrailRouter
 * Handles trail validation.
 */

const StackHelper = require('../helpers/StackHelper');

class TrailRouter {
  /**
   * Route trail action
   * Validates that player doesn't have an active build
   */
  route(payload, state, playerIndex) {
    // Check if player has an active build
    if (StackHelper.playerHasActiveBuild(state, playerIndex)) {
      throw new Error(
        'You cannot trail - you have an active build. Extend or capture your build before trailing.'
      );
    }
    
    // Allow trail
    return { type: 'trail', payload };
  }
}

module.exports = TrailRouter;
