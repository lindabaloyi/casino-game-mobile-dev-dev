/**
 * Temp Stack Build Calculator
 * Implements real-time consecutive segment validation for temp stacks
 * OPTIMIZED: Includes caching for repeated calculations
 *
 * Debug logging is gated behind the BUILD_CALC_DEBUG environment variable.
 * Set BUILD_CALC_DEBUG=true to enable verbose diagnostic output.
 */

// Verbose logging only when explicitly enabled (avoids noise in production)
const _calcDebug = process.env.BUILD_CALC_DEBUG === 'true'
  ? (...args) => console.log(...args)
  : () => {};

// Simple LRU cache for build calculator results
const buildCache = new Map();
const CACHE_SIZE = 100; // Limit cache size to prevent memory leaks

function getCacheKey(values) {
  return values.join(',');
}

function setCacheResult(key, result) {
  if (buildCache.size >= CACHE_SIZE) {
    // Remove oldest entry (simple FIFO eviction)
    const firstKey = buildCache.keys().next().value;
    buildCache.delete(firstKey);
  }
  buildCache.set(key, result);
}

function getCacheResult(key) {
  return buildCache.get(key);
}

/**
 * Detect base extension builds (Type 2)
 * First card is base, rest must form segments matching base value
 * @param {number[]} values - Card values in placement order
 * @returns {object} Build detection result
 */
function detectBaseBuild(values) {
  if (!values || values.length < 2) return { isValid: false };

  const baseValue = values[0];
  if (baseValue < 1 || baseValue > 10) return { isValid: false };

  // Check if remaining cards can be combined to form segments of baseValue
  const remainingCards = values.slice(1);
  const totalRemaining = remainingCards.reduce((sum, card) => sum + card, 0);

  // Must be able to divide remaining cards into segments of baseValue
  if (totalRemaining % baseValue !== 0) return { isValid: false };

  // Validate that we can actually form the segments
  const expectedSegments = Math.floor(totalRemaining / baseValue);
  if (expectedSegments < 1) return { isValid: false };

  // Check if the remaining cards can be partitioned into segments summing to baseValue
  const canFormSegments = canFormValidSegments(remainingCards, baseValue);

  if (!canFormSegments) return { isValid: false };

  return {
    isValid: true,
    buildValue: baseValue,
    type: "base_build",
    segmentCount: expectedSegments + 1, // +1 for the base segment
    segmentEnd: 1, // Base builds: first segment is just the base card
  };
}

/**
 * Detect all possible normal combination builds (Type 1)
 * Find all consecutive segments that sum to same value
 * @param {number[]} values - Card values in placement order
 * @returns {object[]} Array of all valid build combinations
 */
function detectNormalBuildCombinations(values) {
  if (!values || values.length < 2) return [];

  const totalSum = values.reduce((a, b) => a + b, 0);

  // SPECIAL CASE: If total sum ≤ 10, build value is simply the sum
  if (totalSum <= 10) {
    return [
      {
        isValid: true,
        buildValue: totalSum,
        type: "normal_build",
        segmentCount: 1,
        segmentEnd: values.length,
        segments: [values], // Single segment with all cards
      },
    ];
  }

  // COMPLEX CASE: Sum > 10, use segment-based logic
  const combinations = [];

  // Find all possible first segments (must start from index 0 to cover all cards)
  const start = 0;
  for (let end = values.length; end >= start + 1; end--) {
    const segmentSum = values.slice(start, end).reduce((a, b) => a + b, 0);
    if (segmentSum <= 10) {
      const buildValue = segmentSum;
      const segmentEnd = end;

      // Check if remaining cards form valid segments of buildValue
      const remainingCards = values.slice(segmentEnd);
      if (canFormValidSegments(remainingCards, buildValue)) {
        const segmentCount = 1 + countValidSegments(remainingCards, buildValue);

        combinations.push({
          isValid: true,
          buildValue,
          type: "normal_build",
          segmentCount,
          segmentEnd,
          segments: extractSegments(values, buildValue, segmentEnd),
        });
      }
    }
  }

  // Remove duplicates (same build value and segment structure)
  return removeDuplicateCombinations(combinations);
}

/**
 * Legacy function - detects first valid normal build combination
 * @param {number[]} values - Card values in placement order
 * @returns {object} First valid build detection result
 */
function detectNormalBuild(values) {
  const combinations = detectNormalBuildCombinations(values);
  return combinations.length > 0 ? combinations[0] : { isValid: false };
}

/**
 * Check if remaining cards can form valid segments of given build value
 * @param {number[]} cards - Remaining card values
 * @param {number} buildValue - Target sum for each segment
 * @returns {boolean} Whether cards can form valid segments
 */
function canFormValidSegments(cards, buildValue) {
  if (cards.length === 0) return true; // No cards left is valid

  let currentSum = 0;
  for (const card of cards) {
    currentSum += card;
    if (currentSum === buildValue) {
      currentSum = 0;
    } else if (currentSum > buildValue) {
      return false; // Overflow
    }
  }

  // Must consume all cards
  return currentSum === 0;
}

/**
 * Count how many segments can be formed from cards
 * @param {number[]} cards - Card values
 * @param {number} buildValue - Target sum for each segment
 * @returns {number} Number of valid segments
 */
function countValidSegments(cards, buildValue) {
  if (cards.length === 0) return 0;

  let count = 0;
  let currentSum = 0;

  for (const card of cards) {
    currentSum += card;
    if (currentSum === buildValue) {
      count++;
      currentSum = 0;
    }
  }

  return count;
}

/**
 * Extract segment details from card values
 * @param {number[]} values - All card values
 * @param {number} buildValue - Build value
 * @param {number} firstSegmentEnd - End index of first segment
 * @returns {number[][]} Array of segments
 */
function extractSegments(values, buildValue, firstSegmentEnd) {
  const segments = [];
  let currentSegment = [];
  let currentSum = 0;

  // First segment
  for (let i = 0; i < firstSegmentEnd; i++) {
    currentSegment.push(values[i]);
    currentSum += values[i];
    if (currentSum === buildValue) {
      segments.push([...currentSegment]);
      currentSegment = [];
      currentSum = 0;
    }
  }

  // Remaining segments
  for (let i = firstSegmentEnd; i < values.length; i++) {
    currentSegment.push(values[i]);
    currentSum += values[i];
    if (currentSum === buildValue) {
      segments.push([...currentSegment]);
      currentSegment = [];
      currentSum = 0;
    }
  }

  return segments;
}

/**
 * Remove duplicate combinations (same build value and segments)
 * @param {object[]} combinations - Array of build combinations
 * @returns {object[]} Array with duplicates removed
 */
function removeDuplicateCombinations(combinations) {
  const seen = new Set();
  return combinations.filter((combo) => {
    const key = `${combo.buildValue}-${JSON.stringify(combo.segments)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * PRIORITIZED Build Detection: base value builds, then sum builds, then complex base builds
 * @param {number[]} values - Card values in placement order
 * @returns {object} Build detection result
 */
function detectBuildType(values) {
  if (!values || values.length < 2) return { isValid: false };

  const totalSum = values.reduce((a, b) => a + b, 0);

  // 🎯 PRIMARY RULE: Base value builds (one card at END = sum of others)
  // Only detect base value builds when the base card is at the LAST position
  // This signals player intent: [supporting, supporting, BASE] = base value build
  // vs [BASE, supporting, supporting] = sum build
  const lastIndex = values.length - 1;
  const potentialBase = values[lastIndex];
  const otherSum = totalSum - potentialBase;

  if (potentialBase === otherSum && potentialBase >= 1 && potentialBase <= 10) {
    _calcDebug(
      `[BUILD_DETECT] 🎯 Base value build detected: ${potentialBase} at END = sum of others (${otherSum})`,
    );
    return {
      isValid: true,
      buildValue: potentialBase,
      type: "base_value_build",
      baseCardIndex: lastIndex,
      supportingCards: values.slice(0, lastIndex),
      segmentCount: 1,
      segmentEnd: values.length,
    };
  }

  // SECONDARY RULE: Sum builds (total ≤ 10)
  if (totalSum <= 10) {
    _calcDebug(`[BUILD_DETECT] 📊 Sum build detected: total ${totalSum} ≤ 10`);
    return {
      isValid: true,
      buildValue: totalSum,
      type: "sum_build",
      segmentCount: 1,
      segmentEnd: values.length,
    };
  }

  // TERTIARY RULE: Complex base builds for sum > 10 (base card must be at END)
  _calcDebug(
    `[BUILD_DETECT] 🔍 Checking complex base builds for sum ${totalSum} > 10`,
  );
  // Only check if the last card could be a base for the preceding cards
  const lastCardAsBase = values[values.length - 1];
  if (lastCardAsBase >= 1 && lastCardAsBase <= 10) {
    const supportingCards = values.slice(0, -1);
    const supportingSum = supportingCards.reduce((sum, card) => sum + card, 0);
    if (supportingSum === lastCardAsBase) {
      _calcDebug(
        `[BUILD_DETECT] 🏗️ Complex base build detected: ${supportingCards.join(",")} = ${lastCardAsBase}`,
      );
      return {
        isValid: true,
        buildValue: lastCardAsBase,
        type: "base_value_build",
        baseCardIndex: values.length - 1,
        supportingCards: supportingCards,
        segmentCount: 1,
        segmentEnd: values.length,
      };
    }
  }

  // QUATERNARY RULE: Normal combination builds for sum > 10
  _calcDebug(
    `[BUILD_DETECT] 🔍 Checking normal combination builds for sum ${totalSum} > 10`,
  );
  const normalCombinations = detectNormalBuildCombinations(values);
  if (normalCombinations.length > 0) {
    _calcDebug(
      `[BUILD_DETECT] 📊 Normal combination build detected with value ${normalCombinations[0].buildValue}`,
    );
    return normalCombinations[0];
  }

  _calcDebug(
    `[BUILD_DETECT] ❌ No valid build detected for values: [${values.join(", ")}]`,
  );
  return { isValid: false };
}

/**
 * Legacy function for backward compatibility
 * @param {number[]} values - Card values in placement order
 * @returns {number|null} Build value or null
 */
function checkFirstCompleteSegment(values) {
  const result = detectBuildType(values);
  return result.isValid ? result.buildValue : null;
}

/**
 * Enhanced function that returns segment information
 * @param {number[]} values - Card values in placement order
 * @returns {object|null} Build result with segment end or null
 */
function detectBuildWithSegmentInfo(values) {
  // Check cache first
  const cacheKey = getCacheKey(values);
  const cachedResult = getCacheResult(cacheKey);
  if (cachedResult !== undefined) {
    _calcDebug(`[BUILD_CALCULATOR] 📋 Cache hit for key: ${cacheKey}`);
    return cachedResult;
  }

  _calcDebug(`[BUILD_CALCULATOR] 📋 Cache miss for key: ${cacheKey}, computing...`);
  const result = detectBuildType(values);
  const finalResult = result.isValid ? result : null;

  // Cache the result
  setCacheResult(cacheKey, finalResult);

  return finalResult;
}

/**
 * Real-time build calculator for temp stacks
 * Updates build state as cards are added
 * @param {object} tempStack - Current temp stack state
 * @param {number} newCardValue - Value of newly added card
 * @returns {object} Updated temp stack with new build state
 */
function updateBuildCalculator(tempStack, newCardValue) {
  _calcDebug("[BUILD_CALCULATOR] 🎯 UPDATE_BUILD_CALCULATOR starting");
  _calcDebug("[BUILD_CALCULATOR] 📊 Input parameters:", {
    stackId: tempStack.stackId,
    newCardValue,
    currentBuildValue: tempStack.buildValue,
    currentRunningSum: tempStack.runningSum,
    currentSegmentCount: tempStack.segmentCount,
    currentDisplayValue: tempStack.displayValue,
    currentCards: tempStack.cards?.map((c) => `${c.rank}${c.suit}(${c.value})`) || [],
  });

  const B = tempStack.buildValue;
  const S = tempStack.runningSum || 0;
  const C = tempStack.segmentCount || 0;

  _calcDebug("[BUILD_CALCULATOR] 📈 Current state variables:", { B, S, C });

  const cards = tempStack.cards.map((c) => c.value);

  // Detect if newCardValue is already counted to prevent double-counting
  const cardAlreadyIncluded = cards.includes(newCardValue);
  const cardsSum = cards.reduce((sum, c) => sum + c, 0);
  const totalSum = cardAlreadyIncluded ? cardsSum : cardsSum + newCardValue;
  const isSpecialCase = totalSum <= 10;

  _calcDebug("[BUILD_CALCULATOR] 🔍 Sum analysis:", {
    cards, cardAlreadyIncluded, cardsSum, totalSum, isSpecialCase,
  });

  // Add new card to running sum
  const newS = S + newCardValue;
  _calcDebug("[BUILD_CALCULATOR] ➕ New running sum:", { S, newCardValue, newS });

  // Determine build type for current cards (used for display logic)
  const currentBuildType = detectBuildType(cards);

  if (!B) {
    _calcDebug("[BUILD_CALCULATOR] 🆕 NO BUILD VALUE YET - checking first segment");

    const segmentValue = checkFirstCompleteSegment(cards);
    _calcDebug("[BUILD_CALCULATOR] 📋 checkFirstCompleteSegment result:", segmentValue);

    if (segmentValue) {
      _calcDebug(`[BUILD_CALCULATOR] ✅ FIRST SEGMENT COMPLETE! segmentValue: ${segmentValue}`);

      tempStack.buildValue = segmentValue;
      tempStack.runningSum = 0;
      tempStack.segmentCount = 1;

      if (currentBuildType.type === "base_value_build") {
        tempStack.displayValue = segmentValue;
      } else if (isSpecialCase) {
        tempStack.displayValue = totalSum;
      } else {
        tempStack.displayValue = segmentValue;
      }
      tempStack.isValid = true;
      tempStack.isBuilding = false;

      _calcDebug("[BUILD_CALCULATOR] 🔄 First segment state set:", {
        buildValue: tempStack.buildValue,
        displayValue: tempStack.displayValue,
        segmentCount: tempStack.segmentCount,
      });
    } else {
      _calcDebug("[BUILD_CALCULATOR] 🔄 STILL BUILDING FIRST SEGMENT");

      tempStack.displayValue = cardsSum + (cardAlreadyIncluded ? 0 : newCardValue);
      tempStack.isValid = true;
      tempStack.isBuilding = true;
    }
  } else {
    _calcDebug(`[BUILD_CALCULATOR] ✅ BUILD VALUE EXISTS (${B}) - processing`);

    const hasOverflow = newS > B && !isSpecialCase;
    _calcDebug("[BUILD_CALCULATOR] 🚨 Overflow check:", { newS, B, isSpecialCase, hasOverflow });

    if (hasOverflow) {
      _calcDebug("[BUILD_CALCULATOR] ❌ OVERFLOW DETECTED - marking as invalid");
      tempStack.displayValue = "INVALID";
      tempStack.isValid = false;
      tempStack.isBuilding = false;
      return tempStack;
    }

    tempStack.runningSum = newS;

    const segmentComplete = newS === B;
    if (segmentComplete || isSpecialCase) {
      _calcDebug("[BUILD_CALCULATOR] ✅ SEGMENT COMPLETE or SPECIAL CASE triggered");

      if (currentBuildType.type !== "base_value_build") {
        tempStack.displayValue = isSpecialCase ? totalSum : B;
      }
      tempStack.runningSum = 0;
      tempStack.segmentCount = C + 1;
      tempStack.isValid = true;
      tempStack.isBuilding = false;
    } else {
      _calcDebug("[BUILD_CALCULATOR] 🔄 BUILDING TOWARD NEXT SEGMENT");

      tempStack.displayValue = newS - B; // Negative deficit
      tempStack.isValid = true;
      tempStack.isBuilding = true;
    }
  }

  _calcDebug("[BUILD_CALCULATOR] 🎯 UPDATE complete. Final result:", {
    stackId: tempStack.stackId,
    buildValue: tempStack.buildValue,
    displayValue: tempStack.displayValue,
    runningSum: tempStack.runningSum,
    segmentCount: tempStack.segmentCount,
    isValid: tempStack.isValid,
    isBuilding: tempStack.isBuilding,
  });

  return tempStack;
}

/**
 * Initialize temp stack with build calculator fields and analyze existing cards
 * @param {object} stagingStack - Basic temp stack object
 * @returns {object} Enhanced temp stack with build calculator fields
 */
function initializeBuildCalculator(stagingStack) {
  _calcDebug("[BUILD_CALCULATOR] 🎯 INITIALIZE_BUILD_CALCULATOR starting");
  _calcDebug("[BUILD_CALCULATOR] 📊 Input staging stack:", {
    stackId: stagingStack.stackId,
    cards: stagingStack.cards?.map((c) => `${c.rank}${c.suit}(${c.value})`) || [],
    value: stagingStack.value,
    isSameValueStack: stagingStack.isSameValueStack,
  });

  const enhancedStack = {
    ...stagingStack,
    buildValue: null,
    runningSum: 0,
    segmentCount: 0,
    displayValue: stagingStack.value, // Start with sum as fallback
    isValid: true,
    isBuilding: true,
  };

  const cardValues = enhancedStack.cards.map((c) => c.value);
  _calcDebug("[BUILD_CALCULATOR] 🔍 Analyzing card values:", cardValues);

  const buildResult = detectBuildWithSegmentInfo(cardValues);
  _calcDebug("[BUILD_CALCULATOR] 📋 detectBuildWithSegmentInfo result:", buildResult);

  if (buildResult) {
    _calcDebug("[BUILD_CALCULATOR] ✅ BUILD DETECTED! buildValue:", buildResult.buildValue);

    enhancedStack.buildValue = buildResult.buildValue;
    enhancedStack.segmentCount = 1;
    enhancedStack.displayValue = buildResult.buildValue;
    enhancedStack.isBuilding = false;

    const remainingCards = cardValues.slice(buildResult.segmentEnd);
    _calcDebug("[BUILD_CALCULATOR] 📊 Remaining cards after segmentEnd:", remainingCards);

    let currentSum = 0;
    let segmentsFound = 1;

    for (let i = 0; i < remainingCards.length; i++) {
      const value = remainingCards[i];
      currentSum += value;

      if (currentSum === buildResult.buildValue) {
        segmentsFound++;
        currentSum = 0;
        _calcDebug(`[BUILD_CALCULATOR] ✅ Segment ${segmentsFound} completed`);
      } else if (currentSum > buildResult.buildValue) {
        _calcDebug(`[BUILD_CALCULATOR] ❌ OVERFLOW: currentSum (${currentSum}) > buildValue (${buildResult.buildValue})`);
        enhancedStack.isValid = false;
        enhancedStack.displayValue = "INVALID";
        break;
      }
    }

    enhancedStack.segmentCount = segmentsFound;
    enhancedStack.runningSum = currentSum;

    if (!enhancedStack.isValid) {
      enhancedStack.displayValue = "INVALID";
    } else if (currentSum === 0) {
      enhancedStack.displayValue = buildResult.buildValue;
    } else {
      enhancedStack.displayValue = currentSum - buildResult.buildValue;
    }
  } else {
    _calcDebug("[BUILD_CALCULATOR] ❌ NO BUILD DETECTED - keeping default values");
  }

  _calcDebug("[BUILD_CALCULATOR] 🎯 INITIALIZE complete. Final result:", {
    stackId: enhancedStack.stackId,
    buildValue: enhancedStack.buildValue,
    displayValue: enhancedStack.displayValue,
    segmentCount: enhancedStack.segmentCount,
    runningSum: enhancedStack.runningSum,
    isValid: enhancedStack.isValid,
    isBuilding: enhancedStack.isBuilding,
  });

  return enhancedStack;
}

module.exports = {
  checkFirstCompleteSegment,
  detectNormalBuildCombinations,
  updateBuildCalculator,
  initializeBuildCalculator,
  detectNormalBuild,
  detectBuildType,
};
