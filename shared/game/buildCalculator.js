/**
 * Shared Build Calculator Utilities
 * 
 * Provides functions to calculate build values for multi-card stacks.
 * Used by both server (for validation) and client (for UI hints).
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
  if (!subsetValues || subsetValues.length === 0) return null;
  
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
 * Calculates the build value for a complete set of cards.
 * Checks if the cards can be partitioned into valid multi-card builds.
 * 
 * @param {number[]} values - Array of card values
 * @returns {{ value: number, need: number, buildType: string }|null} Build info if valid, null otherwise
 */
function calculateMultiBuildValue(values) {
  const n = values.length;
  if (n < 2) return null;
  
  // First, check if the entire set forms a valid single build
  const total = values.reduce((a, b) => a + b, 0);
  
  // If total <= 10, it could be a single sum build
  if (total <= 10) {
    return { value: total, need: 0, buildType: 'sum' };
  }
  
  // Try to partition into multiple builds
  // For n cards, we try partitions into 2, 3, ..., n-1 builds
  const maxMask = 1 << n;
  
  // Try all possible partitions
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
      return { value: target1, need: 0, buildType: 'multi' };
    }
  }
  
  return null;
}

/**
 * Calculates the build value for a set of cards (including incomplete stacks).
 * This is the main function used by the server to calculate stack values.
 * 
 * @param {number[]} values - Array of card values
 * @returns {{ value: number, need: number, buildType: string }} Build info
 */
function calculateBuildValue(values) {
  const n = values.length;
  if (n < 1) {
    return { value: 0, need: 0, buildType: 'none' };
  }
  
  if (n === 1) {
    return { value: values[0], need: 0, buildType: 'single' };
  }
  
  // Calculate total sum of all cards
  const total = values.reduce((a, b) => a + b, 0);
  
  // First try multi-build partition for value
  const multiBuild = calculateMultiBuildValue(values);
  if (multiBuild !== null) {
    // Found valid multi-build, compute need as remainder to next full build
    const targetValue = multiBuild.value;
    const remaining = total % targetValue;
    const need = remaining === 0 ? 0 : targetValue - remaining;
    return { value: targetValue, need, buildType: multiBuild.buildType };
  }
  
  // Fall back to simple 2-card logic for incomplete stacks
  if (total <= 10) {
    return { value: total, need: 0, buildType: 'sum' };
  }
  
  // Difference build - use largest card as target value
  const sorted = [...values].sort((a, b) => b - a);
  const base = sorted[0];
  
  // Compute need: what's needed to reach next multiple of base value
  const remaining = total % base;
  const need = remaining === 0 ? 0 : base - remaining;
  
  return { 
    value: base, 
    need, 
    buildType: 'diff' 
  };
}

/**
 * Gets all possible capture values for a build (for validation).
 * Returns values that can capture this build.
 * 
 * @param {number[]} values - Array of card values in the build
 * @returns {number[]} Array of possible capture values
 */
function getPossibleCaptureValues(values) {
  const buildInfo = calculateBuildValue(values);
  if (!buildInfo) return [];
  
  const { value, need } = buildInfo;
  const possibleValues = [value];
  
  // If there's a need, the card that satisfies need can also capture
  if (need > 0) {
    possibleValues.push(need);
  }
  
  // For multi-builds, also consider the need for each partition
  if (buildInfo.buildType === 'multi') {
    // For a multi-build like [5,2,4,3] = 7+7, you can capture with 7
    // Also check if there's a need based on subsets
    const n = values.length;
    const maxMask = 1 << n;
    
    for (let mask = 1; mask < maxMask; mask++) {
      const size = bitCount(mask);
      if (size < 2 || size >= n) continue;
      
      const subset = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          subset.push(values[i]);
        }
      }
      
      const target = getBuildTargetForSubset(subset);
      if (target !== null) {
        possibleValues.push(target);
      }
    }
  }
  
  return [...new Set(possibleValues)].sort((a, b) => a - b);
}

/**
 * Checks if a card can capture a build.
 * 
 * @param {number} cardValue - Value of the playing card
 * @param {number[]} buildValues - Values of cards in the build
 * @returns {boolean} True if the card can capture
 */
function canCaptureBuild(cardValue, buildValues) {
  const possibleValues = getPossibleCaptureValues(buildValues);
  return possibleValues.includes(cardValue);
}

/**
 * Check if the array of values can be split into consecutive segments,
 * each summing to the target, AND each segment is in non-increasing order.
 * This respects the player's stacking order (larger cards come first).
 * 
 * @param {number[]} values - Array of card values
 * @param {number} target - Target sum for each group
 * @returns {boolean} True if valid partition exists
 */
function canPartitionConsecutively(values, target) {
  let sum = 0;
  let group = [];
  
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    sum += v;
    group.push(v);
    
    if (sum === target) {
      // Verify the group is non-increasing (descending or equal)
      for (let j = 1; j < group.length; j++) {
        if (group[j] > group[j - 1]) {
          return false; // group is not in descending order
        }
      }
      // Reset for next group
      sum = 0;
      group = [];
    } else if (sum > target) {
      return false; // can't form target sum
    }
  }
  
  // After processing all cards, sum must be 0 (all groups consumed)
  return sum === 0;
}

/**
 * Returns the consecutive partition groups for values that sum to target.
 * Each group is an array of values that sum to target.
 * This assumes the input values are already ordered correctly (non-increasing within groups).
 *
 * @param {number[]} values - Array of card values
 * @param {number} target - Target sum for each group
 * @returns {number[][]} Array of groups, each group sums to target.
 *                        Returns empty array if invalid partition.
 */
function getConsecutivePartition(values, target) {
  const groups = [];
  let sum = 0;
  let currentGroup = [];

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    sum += v;
    currentGroup.push(v);

    if (sum === target) {
      groups.push([...currentGroup]);
      sum = 0;
      currentGroup = [];
    } else if (sum > target) {
      return []; // Invalid partition (should not happen if already validated)
    }
  }

  return sum === 0 ? groups : [];
}

module.exports = {
  calculateBuildValue,
  calculateMultiBuildValue,
  getBuildTargetForSubset,
  getPossibleCaptureValues,
  canCaptureBuild,
  canPartitionConsecutively,
  getConsecutivePartition,
};
