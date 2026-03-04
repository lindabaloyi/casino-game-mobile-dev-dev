/**
 * acceptBuildExtension
 * Player accepts their build extension, adding a card to complete the extension.
 * 
 * Payload:
 * - stackId: required - the build stack ID
 * - card: required - the card to add (from table, hand, or captures)
 * - cardSource: optional - source of the card ('table', 'hand' or 'captured'). Defaults to 'hand'
 * 
 * Rules:
 * - Player must own the build
 * - Build must have pending extension with loose card
 * - Card must be in player's hand, captures, or on table
 * - New build value must be valid (sum/diff logic)
 * - Turn advances on success
 * 
 * Contract: (state, payload, playerIndex) => newState (pure)
 */

const { cloneState, nextTurn } = require('../GameState');

/**
 * Calculate build value using sum/diff logic
 * @param {Array} cards - Array of card objects
 * @returns {{ value: number, base: number, need: number, buildType: string }}
 */
function calculateBuildValue(cards) {
  const totalSum = cards.reduce((sum, c) => sum + c.value, 0);
  
  if (totalSum <= 10) {
    // SUM BUILD: all cards add together
    return {
      value: totalSum,
      base: totalSum,
      need: 0,
      buildType: 'sum',
    };
  } else {
    // DIFF BUILD: largest is base
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    const base = sorted[0].value;
    const otherSum = sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
    const need = base - otherSum;
    
    return {
      value: base,
      base: base,
      need: need,
      buildType: need === 0 ? 'diff' : 'diff-incomplete',
    };
  }
}

/**
 * @param {object} state
 * @param {{ stackId: string, card: object, cardSource?: string }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function acceptBuildExtension(state, payload, playerIndex) {
  const { stackId } = payload;
  // card and cardSource are no longer needed - pending cards are already stored

  if (!stackId) {
    throw new Error('acceptBuildExtension: missing stackId');
  }

  const newState = cloneState(state);

  // Find the build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`acceptBuildExtension: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  // Validate ownership
  if (buildStack.owner !== playerIndex) {
    throw new Error('acceptBuildExtension: only owner can extend their build');
  }

  // Validate pending extension exists (supports both old single-card and new array format)
  if (!buildStack.pendingExtension?.looseCard && !buildStack.pendingExtension?.cards) {
    throw new Error('acceptBuildExtension: no pending extension to accept');
  }

  // Get pending cards (supports both formats for backward compatibility)
  // These cards were already removed from their sources when startBuildExtension was called
  let pendingCards = [];
  if (buildStack.pendingExtension.cards) {
    // New array format
    pendingCards = buildStack.pendingExtension.cards.map(p => p.card);
  } else {
    // Old single-card format
    pendingCards = [buildStack.pendingExtension.looseCard];
  }

  // The pending cards were already removed from their sources during startBuildExtension.
  // We don't need to find/remove them again - just use them directly.
  console.log(`[acceptBuildExtension] Using pending cards:`, pendingCards.map(c => `${c.rank}${c.suit}`).join(', '));

  // Combine all cards: original build + pending cards
  // Note: No additional card needed - the pending cards are already the ones being added
  const allCards = [
    ...buildStack.cards,
    ...pendingCards,
  ];

  // Calculate new build value
  // For accept, the pending cards are being added to the build
  // The build value logic:
  // - If sum of pending cards == original build value → keep the same build value
  // - If sum < original build value → need = buildValue - sum
  const originalValue = buildStack.value;
  const addedPendingValue = pendingCards.reduce((sum, c) => sum + c.value, 0);
  let buildResult;

  if (addedPendingValue === originalValue) {
    // Adding cards equal to original value - keep same value
    buildResult = {
      value: originalValue,
      base: originalValue,
      need: 0,
      buildType: 'extend-same',
    };
    console.log(`[acceptBuildExtension] Added value equals original (${addedPendingValue}), keeping build value: ${originalValue}`);
  } else if (addedPendingValue < originalValue) {
    // Adding cards less than original value - need is what's left
    const need = originalValue - addedPendingValue;
    buildResult = {
      value: originalValue, // Keep original value as target
      base: originalValue,
      need: need,
      buildType: 'extend-need',
    };
    console.log(`[acceptBuildExtension] Added value (${addedPendingValue}) less than original (${originalValue}), need: ${need}`);
  } else {
    // Added value > original value - use sum/diff logic
    buildResult = calculateBuildValue(allCards);
    console.log(`[acceptBuildExtension] Added value (${addedPendingValue}) > original (${originalValue}), using sum/diff logic`);
  }

  // Validate the extension is possible
  // For a valid build: need must be 0 (complete) or we accept incomplete builds
  // The key is that the new value must be achievable
  if (buildResult.buildType === 'diff-incomplete') {
    // Diff build that's not complete - validate can still use this value
    console.log(`[acceptBuildExtension] Build is incomplete, need: ${buildResult.need}`);
  }

  // Update build stack with new cards and value
  buildStack.cards = allCards;
  buildStack.value = buildResult.value;
  buildStack.base = buildResult.base;
  buildStack.need = buildResult.need;
  buildStack.buildType = buildResult.buildType;

  // Clear pending extension
  buildStack.pendingExtension = null;

  const pendingCardsStr = pendingCards.map(c => `${c.rank}${c.suit}`).join(', ');
  console.log(`[acceptBuildExtension] Player ${playerIndex} extended build ${stackId}`);
  console.log(`[acceptBuildExtension] Added pending cards: [${pendingCardsStr}]`);
  console.log(`[acceptBuildExtension] New build value: ${buildResult.value}, type: ${buildResult.buildType}`);
  console.log(`[acceptBuildExtension] Build cards:`, buildStack.cards.map(c => `${c.rank}${c.suit}`).join(', '));

  // Turn advances to opponent
  return nextTurn(newState);
}

module.exports = acceptBuildExtension;
