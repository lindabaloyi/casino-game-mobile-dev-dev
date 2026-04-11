/**
 * acceptTemp
 * Player accepts their pending temp stack.
 */

const { cloneState, nextTurn, generateStackId } = require('../');
const { canPartitionConsecutively, getConsecutivePartition } = require('../buildCalculator');

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

  // --- VALIDATION: At least ONE card must be from player's hand ---
  const hasHandCard = stack.cards.some(c => c.source === 'hand');
  if (!hasHandCard) {
    throw new Error('Cannot accept build - must contain at least one card from your hand');
  }

  const finalValue = buildValue || stack.value;
  
  // --- VALIDATION: Check if build value is valid with non-increasing order enforcement ---
  const stackValues = stack.cards.map(c => c.value);
  if (!canPartitionConsecutively(stackValues, finalValue)) {
    console.log(`[acceptTemp] Rejecting build ${finalValue} for stack ${JSON.stringify(stackValues)} - invalid partition or order`);
    throw new Error(`Cannot build ${finalValue} - cards must be in non-increasing order within each group`);
  }
  
  // --- Determine hasBase from partition ---
  const groups = getConsecutivePartition(stackValues, finalValue);
  const hasBase = groups.length > 1;
  console.log('[acceptTemp] Partition groups:', groups);
  console.log('[acceptTemp] Has base (multiple groups):', hasBase);
  
  // --- Merge pendingExtension cards for dual builds ---
  if (stack.baseFixed && stack.pendingExtension && stack.pendingExtension.cards) {
    console.log('[acceptTemp] Merging pendingExtension cards...');
    const pendingCards = stack.pendingExtension.cards.map(p => p.card);
    console.log('[acceptTemp] Pending cards to merge:', pendingCards.map(c => `${c.rank}${c.suit}`).join(', '));
    
    // Merge pending cards into main cards array
    stack.cards = [...stack.cards, ...pendingCards];
    console.log('[acceptTemp] Merged cards:', stack.cards.map(c => `${c.rank}${c.suit}`).join(', '));
    
    // Clear pending extension
    stack.pendingExtension = null;
  }
  
  // --- VALIDATION: For team builds - trust the teamCapturedBuilds list ---
  // No additional validation needed - list management handles validity
  if (originalOwner !== undefined && originalOwner !== null) {
    console.log(`[acceptTemp] Team build - trusting list for Player ${originalOwner}`);
  }
  
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
  stack.need = finalValue;  // Fix: ensure need matches value for proper capture validation
  stack.type = 'build_stack';
  
  // Use dynamically derived hasBase from partition
  stack.hasBase = hasBase;
  
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
