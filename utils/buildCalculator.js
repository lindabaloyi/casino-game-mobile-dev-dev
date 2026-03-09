/**
 * Build Calculator Utilities
 * 
 * Client-side build calculator. This re-exports functions from shared/game/buildCalculator
 * for client-side use in components like TempStackView.
 * 
 * Note: For server-side validation, use shared/game/buildCalculator directly.
 */

// Re-export all functions from shared build calculator
// These are duplicated here for client-side use since we can't easily import
// from the shared folder in React Native components

/**
 * Counts bits in a mask (helper for subset iteration).
 * @param {number} mask - Bitmask to count bits in
 * @returns {number} Number of set bits
 */
function bitCount(mask) {
  let count = 0;
  while (mask) {
    count += mask & 1;
    mask >>= 1;
  }
  return count;
}

/**
 * Returns the build target for a single subset if it forms a legal build.
 * 
 * Legal builds:
 * - Sum build: target = sum of all cards (when sum <= 10)
 * - Difference build: target = largest card, need = largest - (sum - largest)
 * 
 * @param {number[]} subsetValues - Array of card values
 * @returns {number|null} Build target if legal, null otherwise
 */
function getBuildTargetForSubset(subsetValues) {
  if (!subsetValues || subsetValues.length === 0) return null;
  
  const total = subsetValues.reduce((a, b) => a + b, 0);
  
  if (total <= 10) {
    return total;
  } else {
    const max = Math.max(...subsetValues);
    const otherSum = total - max;
    if (max - otherSum >= 0) {
      return max;
    }
  }
  return null;
}

/**
 * Calculates the build value for a complete set of cards.
 * Checks if the cards can be partitioned into valid multi-card builds.
 * 
 * @param {number[]} values - Array of card values
 * @returns {{ value: number, need: number, buildType: string }|null} Build info if valid, null otherwise
 */
function calculateMultiBuildValue(values) {
  const n = values.length;
  if (n < 2) return null;
  
  const total = values.reduce((a, b) => a + b, 0);
  
  if (total <= 10) {
    return { value: total, need: 0, buildType: 'sum' };
  }
  
  const maxMask = 1 << n;
  
  for (let mask = 1; mask < maxMask; mask++) {
    const size1 = bitCount(mask);
    if (size1 < 1 || size1 >= n) continue;
    
    const subset1 = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subset1.push(values[i]);
      }
    }
    
    const subset2 = [];
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) {
        subset2.push(values[i]);
      }
    }
    
    const target1 = getBuildTargetForSubset(subset1);
    const target2 = getBuildTargetForSubset(subset2);
    
    if (target1 !== null && target2 !== null && target1 === target2) {
      return { value: target1, need: 0, buildType: 'multi' };
    }
  }
  
  return null;
}

/**
 * Returns a hint for an incomplete stack:
 * - If the stack is already complete: { value: target, need: 0 }
 * - If there is a legal subset that leaves exactly one card: { value: target, need: target - remaining }
 * - Otherwise: null
 * 
 * @param {number[]} values - Array of card values
 * @returns {{ value: number, need: number }|null} Hint object or null
 */
export function getBuildHint(values) {
  const n = values.length;
  if (n < 2) return null;

  // First check if the whole set is already a valid multi-build
  const completeTarget = calculateMultiBuildValue(values);
  if (completeTarget !== null) {
    return { value: completeTarget.value, need: 0 };
  }

  // Search for a subset (size >= 2) that forms a legal build and leaves exactly one card
  for (let size = 2; size <= n; size++) {
    for (let mask = 0; mask < (1 << n); mask++) {
      if (bitCount(mask) !== size) continue;

      const subsetIndices = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) subsetIndices.push(i);
      }
      const subsetValues = subsetIndices.map(i => values[i]);
      const target = getBuildTargetForSubset(subsetValues);
      if (target === null) continue;

      const remainingIndices = Array.from({ length: n }, (_, i) => i).filter(i => !(mask & (1 << i)));
      if (remainingIndices.length === 1) {
        const remainingValue = values[remainingIndices[0]];
        const need = target - remainingValue;
        if (need >= 1 && need <= 10) {
          return { value: target, need };
        }
      }
    }
  }

  return null;
}

export default getBuildHint;
