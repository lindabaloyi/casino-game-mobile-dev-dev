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
 *
 * Payload can include:
 *  - stackId: required
 *  - targetValue: optional - if provided, use this as the build target
 *    (used when player selects from modal with multiple options)
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
 * Calculate all possible targets from a temp stack
 * Includes:
 * - Single card values (for same-value stacks like 4,4)
 * - Combined sum (for normal builds like 3+7=10)
 */
function calculateAllPossibleTargets(cards) {
  if (!cards || cards.length === 0) return [];
  
  const targets = [];
  
  // Get card values and counts for same-value detection
  const valueCounts = new Map();
  for (const card of cards) {
    valueCounts.set(card.value, (valueCounts.get(card.value) || 0) + 1);
  }
  
  // Add single card values (for same-value stacks like 4,4)
  for (const [value, count] of valueCounts) {
    // For duplicate cards 1-5, can make value OR value*2
    if (count >= 2 && value <= 5) {
      targets.push(value);      // e.g., 4
      targets.push(value * 2);  // e.g., 8
    } else {
      targets.push(value);
    }
  }
  
  // Add combined sum for ALL normal builds (not same-value stacks)
  // Get all unique card values from stack
  const cardValues = [...new Set(cards.map(c => c.value))];
  
  // Calculate sum of all cards
  const totalSum = cards.reduce((sum, c) => sum + c.value, 0);
  
  // Add the combined sum as a target (this is what players build!)
  // Only add if it's not already in targets
  if (!targets.includes(totalSum)) {
    targets.push(totalSum);
  }
  
  return [...new Set(targets)].sort((a, b) => a - b);
}

/**
 * Check if player has spare card for target (not used in stack)
 */
function hasSpareCardForTarget(hand, stackCards, targetValue) {
  const handCount = hand.filter(c => c.value === targetValue).length;
  const stackCount = stackCards.filter(c => c.value === targetValue).length;
  return handCount > stackCount;
}

/**
 * @param {object} state
 * @param {{ stackId: string, targetValue?: number }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function acceptTemp(state, payload, playerIndex) {
  const { stackId, targetValue: requestedTarget } = payload;

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
  
  // Calculate all possible targets
  const allTargets = calculateAllPossibleTargets(stack.cards);
  console.log(`[acceptTemp] All possible targets:`, allTargets);
  
  // Find available capture options (targets player has spare card for)
  const availableOptions = allTargets.filter(t => 
    hasSpareCardForTarget(playerHand, stack.cards, t)
  );
  console.log(`[acceptTemp] Available capture options:`, availableOptions);

  // Determine which target to use
  let targetValue;
  
  if (requestedTarget !== undefined) {
    // Player selected from modal - use their selection
    targetValue = requestedTarget;
    console.log(`[acceptTemp] Using player-selected target: ${targetValue}`);
  } else if (availableOptions.length === 1) {
    // Only one option - use it
    targetValue = availableOptions[0];
    console.log(`[acceptTemp] Single option, using: ${targetValue}`);
  } else if (availableOptions.length > 1) {
    // Multiple options - throw error with options info
    throw new Error(`MULTIPLE_OPTIONS:${JSON.stringify(availableOptions)}`);
  } else {
    // No capture options - try default calculation
    targetValue = calculateBuildTarget(stack.cards);
    console.log(`[acceptTemp] No capture options, using calculated target: ${targetValue}`);
  }
  
  console.log(`[acceptTemp] Stack cards:`, stack.cards.map(c => `${c.rank}${c.suit}`));
  console.log(`[acceptTemp] Final target value: ${targetValue}`);

  // Check if player has a card matching the target in hand
  const playerHasCard = hasCardWithValue(playerHand, targetValue);
  
  // Check if any card in stack equals targetValue (base card exists in stack)
  const baseInStack = stack.cards.some(c => c.value === targetValue);
  
  // Allow build if player has card in hand OR if base exists in stack
  if (!playerHasCard && !baseInStack) {
    throw new Error(
      `acceptTemp: Player does not have a card with value ${targetValue} in hand`
    );
  }

  // Update stack value to match the selected target
  stack.value = targetValue;

  // Convert temp_stack to build_stack
  // hasBase is true if base card exists in stack (from table), false if player provides card
  stack.type = 'build_stack';
  stack.hasBase = baseInStack;
  
  console.log(`[acceptTemp] Build accepted, hasBase: ${stack.hasBase}`);

  // Turn advances to opponent
  return nextTurn(newState);
}

module.exports = acceptTemp;
