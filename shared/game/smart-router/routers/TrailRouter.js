/**
 * TrailRouter
 * Handles trail validation.
 * 
 * In PARTY mode: allow trailing anytime - no restrictions
 * In DUEL mode: prevent trailing if player has active build (original rule)
 */

const StackHelper = require('../helpers/StackHelper');

class TrailRouter {
  /**
   * Route trail action
   * Validates that player doesn't have an active build (duel mode only)
   */
  route(payload, state, playerIndex) {
    const isPartyMode = state.playerCount === 4;
    
    console.log(`[TrailRouter] isPartyMode: ${isPartyMode}, playerIndex: ${playerIndex}`);
    
    // In PARTY mode: allow trailing without restrictions
    if (isPartyMode) {
      console.log(`[TrailRouter] Party mode - allowing trail without restrictions`);
      return { type: 'trail', payload };
    }
    
    // In DUEL mode: prevent trailing if player has active build (original rule)
    if (StackHelper.playerHasActiveBuild(state, playerIndex)) {
      throw new Error(
        'You cannot trail - you have an active build. Extend or capture your build before trailing.'
      );
    }
    
    // Allow trail in duel mode when no active build
    return { type: 'trail', payload };
  }
}

module.exports = TrailRouter;
