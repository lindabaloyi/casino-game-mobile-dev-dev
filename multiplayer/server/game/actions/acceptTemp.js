/**
 * acceptTemp
 * Player accepts their pending temp stack.
 * 
 * Payload:
 * - stackId: required
 * - buildValue: optional - selected build value (for pairs, e.g., 4 or 8)
 * 
 * Flow:
 * - Converts temp_stack to build_stack with selected value
 * - Advances turn to opponent
 */

const { cloneState, nextTurn } = require('../GameState');

/**
 * @param {object} state
 * @param {{ stackId: string, buildValue?: number }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function acceptTemp(state, payload, playerIndex) {
  const { stackId, buildValue } = payload;

  if (!stackId) throw new Error('acceptTemp: missing stackId');

  const newState = cloneState(state);

  // Find the temp stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );

  if (stackIdx === -1) {
    throw new Error(`acceptTemp: temp stack "${stackId}" not found`);
  }

  const stack = newState.tableCards[stackIdx];
  
  // Validate ownership
  if (stack.owner !== playerIndex) {
    throw new Error(`acceptTemp: player ${playerIndex} does not own stack "${stackId}"`);
  }

  console.log(`[acceptTemp] Accepting stack:`, stack.cards.map(c => `${c.rank}${c.suit}`));
  console.log(`[acceptTemp] Original build value: ${stack.value}, selected: ${buildValue || stack.value}`);

  // Use selected buildValue if provided (for pairs), otherwise use stack's value
  const finalValue = buildValue || stack.value;
  stack.value = finalValue;

  // Convert temp_stack to build_stack
  stack.type = 'build_stack';
  stack.hasBase = true;

  console.log(`[acceptTemp] Converted to build_stack with value ${finalValue}, turn advances`);

  // Turn advances to opponent
  return nextTurn(newState);
}

module.exports = acceptTemp;
