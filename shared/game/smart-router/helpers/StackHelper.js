/**
 * StackHelper
 * Shared utilities for finding and checking stacks in game state.
 */

class StackHelper {
  /**
   * Find a stack (build or temp) by ID
   */
  static findStack(state, stackId) {
    return state.tableCards.find(
      tc => (tc.type === 'build_stack' || tc.type === 'temp_stack') && 
            tc.stackId === stackId
    );
  }

  /**
   * Find a temp stack by ID
   */
  static findTempStack(state, stackId) {
    return state.tableCards.find(
      tc => tc.type === 'temp_stack' && tc.stackId === stackId
    );
  }

  /**
   * Find a build stack by ID
   */
  static findBuildStack(state, stackId) {
    return state.tableCards.find(
      tc => tc.type === 'build_stack' && tc.stackId === stackId
    );
  }

  /**
   * Check if player has an active build
   */
  static playerHasActiveBuild(state, playerIndex) {
    return state.tableCards.some(
      tc => tc.type === 'build_stack' && tc.owner === playerIndex
    );
  }

  /**
   * Get all builds owned by a player
   */
  static getPlayerBuilds(state, playerIndex) {
    return state.tableCards.filter(
      tc => tc.type === 'build_stack' && tc.owner === playerIndex
    );
  }
}

module.exports = StackHelper;
