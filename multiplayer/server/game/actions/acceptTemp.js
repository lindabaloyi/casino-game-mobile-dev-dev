/**
 * acceptTemp
 * Player accepts their pending temp stack — the stack stays on the table
 * and the turn advances to the opponent.
 *
 * Rules:
 *  - Player must own an active temp stack
 *  - It must be that player's turn
 *  - Player must have a card in hand matching the stack's build target value
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
 * Calculate the build target value from a stack of cards.
 * Uses the same logic as the frontend build icon:
 * - Find largest card = base
 * - Find subset of other cards that sums closest to base
 * - If exact match (diff=0), target = base
 * - Otherwise, target = best achievable sum
 */
function calculateBuildTarget(cards) {
  if (!cards || cards.length === 0) return 0;
  
  if (cards.length === 1) {
    return cards[0].value;
  }

  // Sort descending
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const base = sorted[0].value;
  const otherCards = sorted.slice(1);

  // Find best subset sum
  const bestSum = findBestSubsetSum(otherCards, base);
  const diff = base - bestSum;

  if (diff === 0) {
    // Exact match - target is the base value
    return base;
  } else {
    // Incomplete - target is the best achievable sum
    return bestSum;
  }
}

/**
 * Find the maximum sum from subset of cards that doesn't exceed target.
 */
function findBestSubsetSum(cards, target) {
  if (cards.length === 0) return 0;

  const dp = new Array(target + 1).fill(0);

  for (const card of cards) {
    for (let s = target; s >= card.value; s--) {
      dp[s] = Math.max(dp[s], dp[s - card.value] + card.value);
    }
  }

  return dp[target];
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
  
  // Calculate the build target value using same logic as frontend
  const targetValue = calculateBuildTarget(stack.cards);
  
  console.log(`[acceptTemp] Stack cards:`, stack.cards.map(c => `${c.rank}${c.suit}`));
  console.log(`[acceptTemp] Calculated target value: ${targetValue}`);

  // Check if player has a card matching the build target
  if (!hasCardWithValue(playerHand, targetValue)) {
    throw new Error(
      `acceptTemp: Player does not have a card with value ${targetValue} in hand`
    );
  }

  // Update stack value to match the calculated target
  stack.value = targetValue;

  // Convert temp_stack to build_stack with hasBase: false
  stack.type = 'build_stack';
  stack.hasBase = false;

  // Turn advances to opponent
  return nextTurn(newState);
}

module.exports = acceptTemp;
