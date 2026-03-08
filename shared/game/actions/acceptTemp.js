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
  
  // --- VALIDATION: Check if opponent already has a build with the same value ---
  // In party mode: check ALL opponents; in duel mode: check single opponent
  let opponentHasSameValue = false;
  
  if (state.isPartyMode) {
    // Party mode: check both opponents
    const opponentIndices = playerIndex < 2 ? [2, 3] : [0, 1];
    for (const oIdx of opponentIndices) {
      const opponentBuilds = newState.tableCards.filter(
        tc => tc.type === 'build_stack' && tc.owner === oIdx
      );
      if (opponentBuilds.some(build => build.value === finalValue)) {
        opponentHasSameValue = true;
        break;
      }
    }
  } else {
    // Duel mode: check single opponent
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponentBuilds = newState.tableCards.filter(
      tc => tc.type === 'build_stack' && tc.owner === opponentIndex
    );
    opponentHasSameValue = opponentBuilds.some(build => build.value === finalValue);
  }
  
  if (opponentHasSameValue) {
    throw new Error(
      `acceptTemp: Cannot accept build with value ${finalValue} - opponent already has a build with this value`
    );
  }

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
