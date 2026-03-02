/**
 * declineBuildExtension
 * Player declines/cancels their build extension, returning loose card to table.
 * 
 * Payload:
 * - stackId: required - the build stack ID
 * 
 * Rules:
 * - Player must own the build
 * - Build must have pending extension with loose card
 * - Returns loose card back to table
 * - Does NOT advance turn
 * 
 * Contract: (state, payload, playerIndex) => newState (pure)
 */

const { cloneState } = require('../GameState');

/**
 * @param {object} state
 * @param {{ stackId: string }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function declineBuildExtension(state, payload, playerIndex) {
  const { stackId } = payload;

  if (!stackId) {
    throw new Error('declineBuildExtension: missing stackId');
  }

  const newState = cloneState(state);

  // Find the build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`declineBuildExtension: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  // Validate ownership
  if (buildStack.owner !== playerIndex) {
    throw new Error('declineBuildExtension: only owner can decline their build extension');
  }

  // Validate pending extension exists
  if (!buildStack.pendingExtension?.looseCard) {
    throw new Error('declineBuildExtension: no pending extension to decline');
  }

  const looseCard = buildStack.pendingExtension.looseCard;

  // Return loose card to table
  newState.tableCards.push({
    rank: looseCard.rank,
    suit: looseCard.suit,
    value: looseCard.value,
  });

  // Clear pending extension
  buildStack.pendingExtension = null;

  console.log(`[declineBuildExtension] Player ${playerIndex} declined extension for build ${stackId}`);
  console.log(`[declineBuildExtension] Returned loose card to table: ${looseCard.rank}${looseCard.suit}`);

  // Turn does NOT advance - player can continue with other actions
  return newState;
}

module.exports = declineBuildExtension;
