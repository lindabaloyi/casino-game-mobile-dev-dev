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

  // Validate pending extension exists (supports both old single-card and new array format)
  if (!buildStack.pendingExtension?.looseCard && !buildStack.pendingExtension?.cards) {
    throw new Error('declineBuildExtension: no pending extension to decline');
  }

  // Get pending cards (supports both formats for backward compatibility)
  let pendingCards = [];
  if (buildStack.pendingExtension.cards) {
    // New array format
    pendingCards = buildStack.pendingExtension.cards;
  } else {
    // Old single-card format
    pendingCards = [{ card: buildStack.pendingExtension.looseCard, source: buildStack.pendingExtension.looseCard.source }];
  }

  // Return each pending card to its original source
  for (const pending of pendingCards) {
    const { card, source } = pending;
    
    if (source === 'hand') {
      // Return to player's hand
      newState.playerHands[playerIndex].push({ ...card });
    } else if (source === 'table' || source === undefined) {
      // Return to table as loose card
      newState.tableCards.push({
        rank: card.rank,
        suit: card.suit,
        value: card.value,
      });
    } else if (source === 'captured') {
      // Return to player's captured cards
      newState.playerCaptures[playerIndex].push({ ...card });
    }
  }

  // Clear pending extension
  buildStack.pendingExtension = null;

  console.log(`[declineBuildExtension] Player ${playerIndex} declined extension for build ${stackId}`);
  console.log(`[declineBuildExtension] Returned ${pendingCards.length} card(s) to their sources`);

  // Turn does NOT advance - player can continue with other actions
  return newState;
}

module.exports = declineBuildExtension;
