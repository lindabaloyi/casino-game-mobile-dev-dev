/**
 * acceptTemp
 * Player accepts their pending temp stack.
 */

const { cloneState, nextTurn, generateStackId } = require('../');

function acceptTemp(state, payload, playerIndex) {
  const { stackId, buildValue, originalOwner } = payload;

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
  
  // --- VALIDATION: Check for duplicate build on table ---
  // Compare full build composition (cards) to prevent identical builds
  const newBuildCards = stack.cards.map(c => `${c.rank}${c.suit}`).sort().join(',');
  
  const existingBuilds = newState.tableCards.filter(
    tc => tc.type === 'build_stack' && tc.stackId !== stackId
  );
  
  for (const existingBuild of existingBuilds) {
    // Check for identical card composition
    const existingCards = existingBuild.cards.map(c => `${c.rank}${c.suit}`).sort().join(',');
    if (existingCards === newBuildCards) {
      throw new Error(
        `acceptTemp: Duplicate build already exists on table with identical cards`
      );
    }
    
    // Check for same value (e.g., two builds of 9, regardless of card composition)
    if (existingBuild.value === finalValue) {
      throw new Error(
        `acceptTemp: Cannot accept build with value ${finalValue} - a build with this value already exists on table`
      );
    }
  }
  
  stack.value = finalValue;
  stack.type = 'build_stack';
  
  // Debug: Log before and after hasBase assignment
  const beforeHasBase = stack.hasBase;
  console.log(`[acceptTemp] BEFORE: stack.buildType: ${stack.buildType}, hasBase: ${beforeHasBase}`);
  
  stack.hasBase = (stack.buildType === 'diff');
  
  console.log(`[acceptTemp] AFTER: stack.buildType: ${stack.buildType}, hasBase: ${stack.hasBase} (buildType === 'diff' is ${stack.hasBase})`);
  
  // For cooperative rebuild: transfer ownership to original owner (the victim)
  if (originalOwner !== undefined && originalOwner !== null) {
    console.log(`[acceptTemp] Cooperative rebuild - setting owner to originalOwner: ${originalOwner}`);
    stack.owner = originalOwner;
    stack.previousOwner = playerIndex;  // Track who rebuilt it
  }
  
  if (stack.stackId && stack.stackId.startsWith('temp')) {
    stack.stackId = stack.stackId.replace('temp', 'build');
  } else {
    stack.stackId = generateStackId(newState, 'build', stack.owner);
  }

  return nextTurn(newState);
}

module.exports = acceptTemp;
