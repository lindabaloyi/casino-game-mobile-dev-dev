/**
 * tempStackHelpers
 * Helper functions for working with temp stacks in the game.
 * 
 * These functions provide a centralized way to check for active temp stacks
 * on the table and are used by the temp stack guardrails implementation.
 */

/**
 * Get all active temp stacks on the table.
 * A temp stack is active if it has type 'temp_stack'.
 * 
 * @param {object} state - Game state
 * @returns {Array} - Array of temp stack objects
 */
function getActiveTempStacks(state) {
  if (!state || !state.tableCards) {
    return [];
  }
  
  return state.tableCards.filter(tc => tc.type === 'temp_stack');
}

/**
 * Check if ANY player has an active temp stack on the table.
 * This is used to enforce guardrails that prevent certain actions
 * when a temp stack exists.
 * 
 * @param {object} state - Game state
 * @returns {boolean} - True if any player has a temp stack
 */
function hasAnyActiveTempStack(state) {
  const activeTempStacks = getActiveTempStacks(state);
  return activeTempStacks.length > 0;
}

/**
 * Get the active temp stack owned by a specific player.
 * 
 * @param {object} state - Game state
 * @param {number} playerIndex - Player index
 * @returns {object|null} - Temp stack object or null if none owned by this player
 */
function getPlayerTempStack(state, playerIndex) {
  if (!state || !state.tableCards || playerIndex === undefined || playerIndex === null) {
    return null;
  }
  
  const activeTempStacks = getActiveTempStacks(state);
  return activeTempStacks.find(ts => ts.owner === playerIndex) || null;
}

/**
 * Get the count of active temp stacks on the table.
 * 
 * @param {object} state - Game state
 * @returns {number} - Number of temp stacks
 */
function getTempStackCount(state) {
  return getActiveTempStacks(state).length;
}

/**
 * Check if a specific stack ID is an active temp stack on the table.
 * 
 * @param {object} state - Game state
 * @param {string} stackId - Stack ID to check
 * @returns {boolean} - True if the stack exists and is a temp stack
 */
function isTempStack(state, stackId) {
  if (!state || !state.tableCards || !stackId) {
    return false;
  }
  
  return state.tableCards.some(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId
  );
}

/**
 * Get all players who currently have active temp stacks.
 * This returns an array of player indices.
 * 
 * @param {object} state - Game state
 * @returns {Array} - Array of player indices who own temp stacks
 */
function getPlayersWithTempStacks(state) {
  const activeTempStacks = getActiveTempStacks(state);
  const players = [];
  
  for (const ts of activeTempStacks) {
    if (ts.owner !== undefined && ts.owner !== null && !players.includes(ts.owner)) {
      players.push(ts.owner);
    }
  }
  
  return players;
}

module.exports = {
  getActiveTempStacks,
  hasAnyActiveTempStack,
  getPlayerTempStack,
  getTempStackCount,
  isTempStack,
  getPlayersWithTempStacks,
};
