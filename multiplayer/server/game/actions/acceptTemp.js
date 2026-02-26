/**
 * acceptTemp
 * Player accepts their pending temp stack — the stack stays on the table
 * and the turn advances to the opponent.
 *
 * Rules:
 *  - Player must own an active temp stack
 *  - It must be that player's turn
 *  - Player must have a card in hand matching the stack's total value
 *  - Turn advances after acceptance (stack converted to build)
 */

const { cloneState, nextTurn } = require('../GameState');

/**
 * Helper to check if player has a card with a specific value in hand
 */
function hasCardWithValue(hand, targetValue) {
  return hand.some(card => card.value === targetValue);
}

/**
 * @param {object} state
 * @param {{ stackId: string }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function acceptTemp(state, payload, playerIndex) {
  const { stackId } = payload;

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

  // Get player's hand
  const playerHand = newState.playerHands[playerIndex];
  
  // Check if player has a card matching the stack's total value
  const targetValue = stack.value;
  if (!hasCardWithValue(playerHand, targetValue)) {
    throw new Error(
      `acceptTemp: Player does not have a card with value ${targetValue} in hand`
    );
  }

  // Convert temp_stack to build_stack with hasBase: false
  stack.type = 'build_stack';
  stack.hasBase = false;

  // Turn advances to opponent
  return nextTurn(newState);
}

module.exports = acceptTemp;
