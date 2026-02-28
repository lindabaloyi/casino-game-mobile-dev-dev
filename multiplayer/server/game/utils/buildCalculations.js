/**
 * buildCalculations.js
 * Utility functions for build value calculations and capture/extension validation.
 * 
 * Used by:
 *   - ActionRouter for validating capture and build actions
 *   - Build handlers for calculating valid build values
 *   - Frontend preview (via shared logic if needed)
 * 
 * Key algorithms:
 *   - Subset sum (dynamic programming) for finding optimal card combinations
 *   - Build value = largest card in stack (base)
 *   - Valid build = sum of other cards equals the base
 */

 /**
 * Calculate the total value of a card combination.
 * For builds: value = largest card (base), other cards must sum to it.
 * 
 * @param {Array<{value: number}>} cards - Array of card objects with value property
 * @returns {number} Total value (sum of all card values)
 */
function calculateBuildValue(cards) {
  if (!cards || cards.length === 0) return 0;
  return cards.reduce((sum, card) => sum + card.value, 0);
}

/**
 * Find the maximum sum from a subset of cards that doesn't exceed target.
 * Uses dynamic programming for efficiency.
 * 
 * @param {Array<{value: number}>} cards - Array of card objects with value property
 * @param {number} target - Target sum to achieve
 * @returns {number} Maximum sum achievable without exceeding target
 */
function findMaxSubsetSum(cards, target) {
  if (!cards || cards.length === 0) return 0;
  
  // Handle invalid target
  if (target <= 0) return 0;
  
  // DP[i] = maximum sum achievable using first i cards
  const dp = new Array(target + 1).fill(0);
  
  for (const card of cards) {
    // Traverse backwards to avoid using same card twice
    for (let s = target; s >= card.value; s--) {
      dp[s] = Math.max(dp[s], dp[s - card.value] + card.value);
    }
  }
  
  return dp[target];
}

/**
 * Find the subset of cards that sums exactly to target (if possible).
 * Returns null if no exact match exists.
 * 
 * @param {Array<{value: number}>} cards - Array of card objects
 * @param {number} target - Target sum to achieve
 * @returns {Array<{value: number}>|null} Subset that sums to target, or null
 */
function findExactSubset(cards, target) {
  if (!cards || cards.length === 0 || target <= 0) return null;
  
  // For small targets, use simple approach
  if (cards.length <= 10) {
    return findExactSubsetRecursive(cards, target, 0, [], new Set());
  }
  
  // For larger sets, use DP to find if exact sum is possible
  const dp = Array(target + 1).fill(false);
  dp[0] = true;
  
  // Track which values can be achieved
  const achievable = new Set([0]);
  
  for (const card of cards) {
    const newAchievable = new Set(achievable);
    for (const sum of achievable) {
      const newSum = sum + card.value;
      if (newSum === target) {
        // Found exact match - reconstruct
        return reconstructSubset(cards, target);
      }
      if (newSum < target) {
        newAchievable.add(newSum);
      }
    }
    achievable = newAchievable;
  }
  
  return null;
}

/**
 * Recursive helper for finding exact subset (for smaller card sets).
 */
function findExactSubsetRecursive(cards, target, index, current, usedIndices) {
  if (target === 0) return current;
  if (target < 0 || index >= cards.length) return null;
  
  // Try including current card
  if (!usedIndices.has(index)) {
    const withCard = findExactSubsetRecursive(
      cards, 
      target - cards[index].value, 
      index + 1, 
      [...current, cards[index]],
      new Set([...usedIndices, index])
    );
    if (withCard) return withCard;
  }
  
  // Try skipping current card
  return findExactSubsetRecursive(cards, target, index + 1, current, usedIndices);
}

/**
 * Reconstruct the subset that sums to target using DP.
 */
function reconstructSubset(cards, target) {
  const n = cards.length;
  const dp = Array(n + 1).fill(null).map(() => Array(target + 1).fill(false));
  
  // Build DP table
  for (let i = 0; i <= n; i++) {
    dp[i][0] = true;
  }
  
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= target; j++) {
      dp[i][j] = dp[i-1][j];
      if (cards[i-1].value <= j) {
        dp[i][j] = dp[i][j] || dp[i-1][j - cards[i-1].value];
      }
    }
  }
  
  if (!dp[n][target]) return null;
  
  // Backtrack to find the subset
  const result = [];
  let i = n, j = target;
  while (i > 0 && j > 0) {
    if (dp[i-1][j]) {
      i--;
    } else {
      result.push(cards[i-1]);
      j -= cards[i-1].value;
      i--;
    }
  }
  
  return result;
}

/**
 * Calculate all valid capture values for a build stack.
 * Returns cards from hand that can capture the given build.
 * 
 * @param {Object} buildStack - Build stack object with {value, cards}
 * @param {Array<{rank: string, suit: string, value: number}>} handCards - Player's hand
 * @returns {Array<{rank: string, suit: string, value: number}>} Cards that can capture
 */
function calculateValidCaptureValues(buildStack, handCards) {
  if (!buildStack?.value || !handCards || handCards.length === 0) {
    return [];
  }
  
  const buildValue = buildStack.value;
  return handCards.filter(card => card.value === buildValue);
}

/**
 * Find all valid build options when creating a new build from hand cards.
 * Uses subset sum to find combinations that form valid builds.
 * 
 * @param {Array<{rank: string, suit: string, value: number}>} handCards - Cards to combine
 * @returns {Array<Object>} Array of valid build options
 */
function findValidBuildOptions(handCards) {
  if (!handCards || handCards.length < 2) return [];
  
  const options = [];
  
  // Try all subsets of size 2 or more
  for (let size = 2; size <= handCards.length; size++) {
    const subsets = getAllSubsets(handCards, size);
    
    for (const subset of subsets) {
      // Find largest card as base
      const sorted = [...subset].sort((a, b) => b.value - a.value);
      const base = sorted[0].value;
      const otherCards = sorted.slice(1);
      
      // Check if other cards sum exactly to base
      const otherSum = calculateBuildValue(otherCards);
      
      if (otherSum === base) {
        options.push({
          cards: subset,
          base: base,
          isValid: true,
          description: `Build ${base}: ${subset.map(c => c.rank + c.suit).join(' + ')}`
        });
      }
    }
  }
  
  return options;
}

/**
 * Get all subsets of a given size.
 */
function getAllSubsets(cards, size) {
  const result = [];
  const indices = [];
  
  // Initialize first 'size' indices
  for (let i = 0; i < size; i++) {
    indices.push(i);
  }
  
  while (indices[0] < cards.length - size + 1) {
    // Add current subset
    result.push(indices.map(i => cards[i]));
    
    // Move indices
    let i = size - 1;
    while (i >= 0 && indices[i] === cards.length - size + i) {
      i--;
    }
    
    if (i >= 0) {
      indices[i]++;
      for (let j = i + 1; j < size; j++) {
        indices[j] = indices[j - 1] + 1;
      }
    } else {
      break;
    }
  }
  
  return result;
}

/**
 * Determine the best build value using the game's rules:
 * - Largest card becomes the base
 * - Other cards should sum as close to base as possible (without exceeding)
 * 
 * @param {Array<{value: number}>} cards - Cards to evaluate
 * @returns {{base: number, subsetSum: number, diff: number, isValid: boolean}}
 */
function calculateOptimalBuildValue(cards) {
  if (!cards || cards.length === 0) {
    return { base: 0, subsetSum: 0, diff: 0, isValid: false };
  }
  
  if (cards.length === 1) {
    return {
      base: cards[0].value,
      subsetSum: 0,
      diff: cards[0].value,
      isValid: false
    };
  }
  
  // Sort by value descending - largest is base
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const base = sorted[0].value;
  const otherCards = sorted.slice(1);
  
  // Find best subset sum
  const subsetSum = findMaxSubsetSum(otherCards, base);
  const diff = base - subsetSum;
  
  return {
    base: base,
    subsetSum: subsetSum,
    diff: diff,
    isValid: diff === 0
  };
}

module.exports = {
  calculateBuildValue,
  findMaxSubsetSum,
  findExactSubset,
  calculateValidCaptureValues,
  findValidBuildOptions,
  calculateOptimalBuildValue
};
