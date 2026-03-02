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

const { cloneState, nextTurn, generateStackId } = require('../GameState');

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
  
  // Validate stack has cards
  if (!stack.cards || !Array.isArray(stack.cards)) {
    throw new Error(`acceptTemp: stack "${stackId}" has no cards`);
  }
  
  // Validate ownership
  if (stack.owner !== playerIndex) {
    throw new Error(`acceptTemp: player ${playerIndex} does not own stack "${stackId}"`);
  }

  console.log(`[acceptTemp] Accepting stack:`, stack.cards?.map ? stack.cards.map(c => `${c.rank}${c.suit}`) : 'NO_CARDS');
  console.log(`[acceptTemp] Original build value: ${stack.value}, selected: ${buildValue || stack.value}`);

  // Use selected buildValue if provided (for pairs), otherwise use stack's value
  const finalValue = buildValue || stack.value;
  stack.value = finalValue;

  // Convert temp_stack to build_stack
  stack.type = 'build_stack';
  
  // hasBase is true only for DIFF builds where need === 0 (base build like 7,5,2)
  // In a diff build, if other cards sum to the base (need=0), it's a base build
  const isBaseBuild = stack.buildType === 'diff' && stack.need === 0;
  stack.hasBase = isBaseBuild;
  
  // Convert stackId from tempP1_01 to buildP1_01 (keep same number)
  if (stack.stackId && stack.stackId.startsWith('temp')) {
    stack.stackId = stack.stackId.replace('temp', 'build');
  } else {
    // Fallback for legacy IDs - generate new build ID
    stack.stackId = generateStackId(newState, 'build', stack.owner);
  }

  console.log(`[acceptTemp] Converted to build_stack with value ${finalValue}, turn advances`);

  // Turn advances to opponent
  return nextTurn(newState);
}

module.exports = acceptTemp;
