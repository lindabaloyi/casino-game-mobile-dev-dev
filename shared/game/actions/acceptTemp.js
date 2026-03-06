/**
 * acceptTemp
 * Player accepts their pending temp stack.
 */

const { cloneState, nextTurn, generateStackId } = require('../');

function acceptTemp(state, payload, playerIndex) {
  const { stackId, buildValue } = payload;

  if (!stackId) throw new Error('acceptTemp: missing stackId');

  const newState = cloneState(state);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );

  if (stackIdx === -1) {
    throw new Error(`acceptTemp: temp stack "${stackId}" not found`);
  }

  const stack = newState.tableCards[stackIdx];
  
  if (!stack.cards || !Array.isArray(stack.cards)) {
    throw new Error(`acceptTemp: stack "${stackId}" has no cards`);
  }
  
  if (stack.owner !== playerIndex) {
    throw new Error(`acceptTemp: player ${playerIndex} does not own stack "${stackId}"`);
  }

  const finalValue = buildValue || stack.value;
  stack.value = finalValue;
  stack.type = 'build_stack';
  
  // Debug: Log before and after hasBase assignment
  const beforeHasBase = stack.hasBase;
  console.log(`[acceptTemp] BEFORE: stack.buildType: ${stack.buildType}, hasBase: ${beforeHasBase}`);
  
  stack.hasBase = (stack.buildType === 'diff');
  
  console.log(`[acceptTemp] AFTER: stack.buildType: ${stack.buildType}, hasBase: ${stack.hasBase} (buildType === 'diff' is ${stack.hasBase})`);
  
  if (stack.stackId && stack.stackId.startsWith('temp')) {
    stack.stackId = stack.stackId.replace('temp', 'build');
  } else {
    stack.stackId = generateStackId(newState, 'build', stack.owner);
  }

  return nextTurn(newState);
}

module.exports = acceptTemp;
