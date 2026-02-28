/**
 * dropToCapture
 * Player drops a temp stack onto their own capture pile.
 * 
 * Rules:
 *  - Can drop temp stacks from the table to own capture pile
 *  - Removes the stack from the table
 *  - Adds all cards in the stack to player's captures
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState, nextTurn } = require('../GameState');

/**
 * @param {object} state
 * @param {{
 *   stackId: string,       // The temp stack being dropped
 * }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function dropToCapture(state, payload, playerIndex) {
  const { stackId } = payload;

  console.log('[dropToCapture] Player dropped stack to capture pile:', {
    playerIndex,
    stackId,
  });

  if (!stackId) {
    throw new Error('dropToCapture: missing stackId');
  }

  // Clone state for mutation
  const newState = cloneState(state);

  // Find the temp stack on the table
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );

  if (stackIdx === -1) {
    throw new Error(`dropToCapture: temp stack "${stackId}" not found`);
  }

  const stack = newState.tableCards[stackIdx];

  // Validate: can only drop own temp stacks
  if (stack.owner !== playerIndex) {
    throw new Error(`dropToCapture: player ${playerIndex} does not own stack "${stackId}"`);
  }

  console.log('[dropToCapture] Stack cards:', stack.cards.map(c => `${c.rank}${c.suit}`));

  // Remove the stack from the table
  newState.tableCards.splice(stackIdx, 1);

  // Add all cards from the stack to player's captures
  const capturedCards = [...stack.cards];
  newState.playerCaptures[playerIndex].push(...capturedCards);

  console.log(`[dropToCapture] Player ${playerIndex} captured ${capturedCards.length} cards`);

  // Advance turn to opponent
  return nextTurn(newState);
}

module.exports = dropToCapture;
