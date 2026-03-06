/**
 * Stack ID Generation
 * Generates unique IDs for temp and build stacks
 * 
 * NOTE: This function mutates the state by incrementing stack counters.
 */

/**
 * Generate a sequential stack ID.
 * @param {object} state - Game state
 * @param {string} type - Stack type ('temp' or 'build')
 * @param {number} playerIndex - Player index (0-3)
 * @returns {string} Generated stack ID
 */
function generateStackId(state, type, playerIndex) {
  const playerLabel = `P${playerIndex + 1}`;
  const counterKey = `${type}${playerLabel}`;
  if (!state.stackCounters) {
    state.stackCounters = { tempP1: 0, tempP2: 0, tempP3: 0, tempP4: 0, buildP1: 0, buildP2: 0, buildP3: 0, buildP4: 0 };
  }
  state.stackCounters[counterKey] = (state.stackCounters[counterKey] || 0) + 1;
  const num = state.stackCounters[counterKey];
  const numStr = num.toString().padStart(2, '0');
  return `${type}${playerLabel}_${numStr}`;
}

module.exports = {
  generateStackId,
};
