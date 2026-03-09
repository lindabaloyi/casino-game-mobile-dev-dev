/**
 * Build Calculator Utilities
 * 
 * Provides functions to calculate build hints for incomplete stacks.
 * Helps players understand what card is needed to complete a build.
 */

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
  const total = subsetValues.reduce((a, b) => a + b, 0);
  
  if (total <= 10) {
    // Sum build: target = total
    return total;
  } else {
    // Difference build: target = largest card
    const max = Math.max(...subsetValues);
    const otherSum = total - max;
    if (max - otherSum >= 0) {
      return max;
    }
  }
  return null;
}

/**
 * Checks if a complete set of cards can be partitioned into legal builds.
 * 
 * @param {number[]} values - Array of card values
 * @returns {number|null} Build target if complete, null otherwise
 */
function calculateBuildValue(values) {
  const n = values.length;
  if (n < 2) return null;
  
  // For a complete multi-build, we need to find if cards can be partitioned
  // into valid builds. We try all possible partitions using bitmask.
  
  // First, check if the entire set forms a valid build
  const total = values.reduce((a, b) => a + b, 0);
  
  // If total <= 10, it could be a single sum build
  if (total <= 10) {
    return total;
  }
  
  // Try to partition into multiple builds
  // For simplicity, we check if we can partition into exactly 2 builds
  const maxMask = 1 << n;
  
  for (let mask = 1; mask < maxMask; mask++) {
    const size1 = bitCount(mask);
    if (size1 < 1 || size1 >= n) continue;
    
    // Get values for first subset
    const subset1 = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subset1.push(values[i]);
      }
    }
    
    // Get values for second subset (complement)
    const subset2 = [];
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) {
        subset2.push(values[i]);
      }
    }
    
    const target1 = getBuildTargetForSubset(subset1);
    const target2 = getBuildTargetForSubset(subset2);
    
    // Both subsets must form valid builds with the same target
    if (target1 !== null && target2 !== null && target1 === target2) {
      return target1;
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
  const completeTarget = calculateBuildValue(values);
  if (completeTarget !== null) {
    return { value: completeTarget, need: 0 };
  }

  // Search for a subset (size >= 2) that forms a legal build and leaves exactly one card
  // Iterate subsets in increasing order of size to get a deterministic "first"
  for (let size = 2; size <= n; size++) {
    for (let mask = 0; mask < (1 << n); mask++) {
      if (bitCount(mask) !== size) continue;

      // Collect indices and values of the subset
      const subsetIndices = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) subsetIndices.push(i);
      }
      const subsetValues = subsetIndices.map(i => values[i]);
      const target = getBuildTargetForSubset(subsetValues);
      if (target === null) continue;

      // Check complement - should leave exactly one card
      const remainingIndices = Array.from({ length: n }, (_, i) => i).filter(i => !(mask & (1 << i)));
      if (remainingIndices.length === 1) {
        const remainingValue = values[remainingIndices[0]];
        const need = target - remainingValue;
        if (need >= 1 && need <= 10) { // need must be a valid card value
          return { value: target, need };
        }
      }
    }
  }

  return null; // no hint found
}

export default getBuildHint;
