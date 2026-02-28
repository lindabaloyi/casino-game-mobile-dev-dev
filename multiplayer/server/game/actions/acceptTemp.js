/**
 * acceptTemp
 * Player accepts their pending temp stack — the stack stays on the table
 * and the turn advances to the opponent.
 *
 * Rules:
 *  - Player must own an active temp stack
 *  - It must be that player's turn
 *  - Player must have a card in hand matching the stack's build target value
 *  - After acceptance, checks for capture/extend options and returns them
 *  - Turn advances after acceptance (stack converted to build)
 */

const { cloneState, nextTurn } = require('../GameState');
const { 
  calculateOptimalBuildValue, 
  calculateValidCaptureValues 
} = require('../utils/buildCalculations');

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
  
  // Calculate the build target value using shared buildCalculations
  const buildResult = calculateOptimalBuildValue(stack.cards);
  const targetValue = buildResult.base; // Use the base (largest card) as target
  
  console.log(`[acceptTemp] Stack cards:`, stack.cards.map(c => `${c.rank}${c.suit}`));
  console.log(`[acceptTemp] Build result:`, buildResult);
  console.log(`[acceptTemp] Target value: ${targetValue}`);

  // Check if player has a card matching the build target
  if (!playerHand.some(card => card.value === targetValue)) {
    throw new Error(
      `acceptTemp: Player does not have a card with value ${targetValue} in hand`
    );
  }

  // Update stack value to match the calculated target
  stack.value = targetValue;

  // Convert temp_stack to build_stack with hasBase: false
  stack.type = 'build_stack';
  stack.hasBase = false;

  // Calculate capture options for the new build
  const validCaptures = calculateValidCaptureValues(
    { value: targetValue, cards: stack.cards },
    playerHand
  );
  
  // Log capture options for debugging
  if (validCaptures.length > 0) {
    console.log(`[acceptTemp] Valid capture options:`, validCaptures.map(c => `${c.rank}${c.suit}`));
  }

  // Turn advances to opponent
  return nextTurn(newState);
}

module.exports = acceptTemp;
