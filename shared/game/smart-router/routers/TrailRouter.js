/**
 * TrailRouter
 * Handles trail validation.
 * 
 * In PARTY mode: allow trailing anytime - no restrictions
 * In DUEL mode: 
 *   - Round 1: prevent trailing if player has active build
 *   - Round 2: allow trailing even with active build
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
    // Determine party mode: check if any player has a team property
    // In party mode, players have team: 'A' or 'B'. In freeforall, they have no team.
    const isPartyMode = state.playerCount === 4 && state.players.some(p => p.team);
    const { card } = payload;
    
    // Validate card in payload
    if (!card || !card.value) {
      throw new Error('TrailRouter: invalid card payload - missing card or value');
    }
    
    // --- Check for loose cards with same rank on table ---
    // NOTE: This rule does NOT apply in free-for-all mode
    if (isPartyMode) {
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
    }
    
    // In PARTY mode: allow trailing without restrictions (after above validations)
    // In FREE-FOR-ALL mode: also allow trailing without restrictions (no team restrictions)
    // In THREE-HANDS mode: allow trailing without restrictions (no active build check)
    if (isPartyMode || state.playerCount === 4 || state.playerCount === 3) {
      return { type: 'trail', payload };
    }
    
    // In DUEL mode: check round number for active build restriction
    const currentRound = state.round || 1;
    const isRound2 = currentRound >= 2;
    
    // Round 2: allow trailing regardless of active build
    if (isRound2) {
      return { type: 'trail', payload };
    }
    
    // Round 1: prevent trailing if player has active build (original rule)
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
