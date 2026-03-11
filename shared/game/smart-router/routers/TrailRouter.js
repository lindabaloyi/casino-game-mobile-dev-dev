/**
 * TrailRouter
 * Handles trail validation.
 * 
 * In PARTY mode: allow trailing anytime - no restrictions
 * In DUEL mode: prevent trailing if player has active build (original rule)
 * 
 * Also validates that:
 * - No loose card with same rank exists on table
 * - No build stack with same value exists on table
 */

const StackHelper = require('../helpers/StackHelper');

class TrailRouter {
  /**
   * Route trail action
   * Validates that player doesn't have an active build (duel mode only)
   * Also validates no matching loose card or build on table
   */
  route(payload, state, playerIndex) {
    const isPartyMode = state.playerCount === 4;
    const { card } = payload;
    
    // Validate card in payload
    if (!card || !card.value) {
      throw new Error('TrailRouter: invalid card payload - missing card or value');
    }
    
    // --- Check for loose cards with same rank on table ---
    const looseCards = state.tableCards.filter(tc => !tc.type);
    const existingLooseCardOfSameRank = looseCards.some(
      looseCard => looseCard.rank === card.rank
    );
    
    if (existingLooseCardOfSameRank) {
      throw new Error(
        `trail: Cannot play ${card.rank}${card.suit} - ` +
        `there's already a ${card.rank} on the table as a loose card`
      );
    }
    
    // --- Check for build stacks with same value on table ---
    const buildStacks = state.tableCards.filter(tc => tc.type === 'build_stack');
    const existingBuildOfSameValue = buildStacks.some(
      build => build.value === card.value
    );
    
    if (existingBuildOfSameValue) {
      throw new Error(
        `trail: Cannot play ${card.rank}${card.suit} - ` +
        `there's already a build with value ${card.value} on the table`
      );
    }
    
    // In PARTY mode: allow trailing without restrictions (after above validations)
    if (isPartyMode) {
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
