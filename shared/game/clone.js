/**
 * Clone Utility
 * Wrapper for deep cloning game state
 */

const { cloneDeep } = require('../utils/cloneDeep');

/**
 * Deep clone game state for pure function updates
 */
function cloneState(state) {
  return cloneDeep(state);
}

module.exports = {
  cloneState,
};
