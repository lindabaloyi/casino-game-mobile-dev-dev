/**
 * Temp Stack Build Calculator
 * Implements real-time consecutive segment validation for temp stacks
 */

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
  // For simplicity, check if any single card equals baseValue, or if cards can be combined
  // More complex validation would check all possible combinations
  const canFormSegments = remainingCards.some(card => card === baseValue) ||
                         remainingCards.length >= 2 && remainingCards.reduce((a,b) => a + b, 0) === baseValue * expectedSegments;

  if (!canFormSegments) return { isValid: false };

  return {
    isValid: true,
    buildValue: baseValue,
    type: 'base_build',
    segmentCount: expectedSegments + 1, // +1 for the base segment
    segmentEnd: 1 // Base builds: first segment is just the base card
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
    return [{
      isValid: true,
      buildValue: totalSum,
      type: 'normal_build',
      segmentCount: 1,
      segmentEnd: values.length,
      segments: [values] // Single segment with all cards
    }];
  }

  // COMPLEX CASE: Sum > 10, use segment-based logic
  const combinations = [];

  // Find all possible first segments
  for (let start = 0; start < values.length - 1; start++) {
    for (let end = values.length; end >= start + 2; end--) {
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
            type: 'normal_build',
            segmentCount,
            segmentEnd,
            segments: extractSegments(values, buildValue, segmentEnd)
          });
        }
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
  return combinations.filter(combo => {
    const key = `${combo.buildValue}-${JSON.stringify(combo.segments)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * PRIORITIZED Build Detection: ≤10 rule first, then base builds
 * @param {number[]} values - Card values in placement order
 * @returns {object} Build detection result
 */
function detectBuildType(values) {
  if (!values || values.length < 2) return { isValid: false };

  const totalSum = values.reduce((a, b) => a + b, 0);

  // PRIMARY RULE: ≤10 sum rule (most common and default)
  if (totalSum <= 10) {
    return {
      isValid: true,
      buildValue: totalSum,
      type: 'sum_build',
      segmentCount: 1,
      segmentEnd: values.length
    };
  }

  // SECONDARY RULE: Base builds for sum > 10
  const sortedValues = [...values].sort((a, b) => b - a);
  for (const potentialBase of sortedValues) {
    if (potentialBase >= 1 && potentialBase <= 10) {
      const baseIndex = values.indexOf(potentialBase);
      const reorderedValues = [potentialBase, ...values.slice(0, baseIndex), ...values.slice(baseIndex + 1)];
      const baseResult = detectBaseBuild(reorderedValues);
      if (baseResult.isValid) return baseResult;
    }
  }

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
  const result = detectBuildType(values);
  return result.isValid ? result : null;
}

/**
 * Real-time build calculator for temp stacks
 * Updates build state as cards are added
 * @param {object} tempStack - Current temp stack state
 * @param {number} newCardValue - Value of newly added card
 * @returns {object} Updated temp stack with new build state
 */
function updateBuildCalculator(tempStack, newCardValue) {
  console.log('[BUILD_CALCULATOR] 📊 Input parameters:', {
    stackId: tempStack.stackId,
    newCardValue: newCardValue,
    currentBuildValue: tempStack.buildValue,
    currentRunningSum: tempStack.runningSum,
    currentSegmentCount: tempStack.segmentCount,
    currentDisplayValue: tempStack.displayValue,
    currentCards: tempStack.cards?.map(c => `${c.rank}${c.suit}(${c.value})`) || []
  });

  const B = tempStack.buildValue;
  const S = tempStack.runningSum || 0;
  const C = tempStack.segmentCount || 0;

  const cards = tempStack.cards.map(c => c.value);
  const cardsSum = cards.reduce((sum, card) => sum + card, 0);
  const cardAlreadyIncluded = cards.includes(newCardValue);
  const totalSum = cardAlreadyIncluded ? cardsSum : cardsSum + newCardValue;
  console.log('[BUILD_CALCULATOR] 🔍 Corrected sum calculation:', {
    cardsSum: cardsSum,
    newCardValue: newCardValue,
    cardAlreadyIncluded: cardAlreadyIncluded,
    totalSum: totalSum,
    calculation: cardAlreadyIncluded ? `${cardsSum} (no addition)` : `${cardsSum} + ${newCardValue} = ${totalSum}`
  });

  const isSpecialCase = totalSum <= 10;
  // Add new card to running sum
  const newS = S + newCardValue;
  if (!B) {
    // No build discovered yet - check if this completes first segment
    // IMPORTANT: Use the current cards array (new card already added to tempStack.cards)
    const segmentValue = checkFirstCompleteSegment(cards);
    if (segmentValue) {
      tempStack.buildValue = segmentValue;
      tempStack.runningSum = 0;
      tempStack.segmentCount = 1;

      // For special case builds, show total sum instead of build value immediately
      tempStack.displayValue = isSpecialCase ? totalSum : segmentValue;
      tempStack.isValid = true;
      tempStack.isBuilding = false;

      console.log('[BUILD_CALCULATOR] 🔄 First segment state set:', {
        buildValue: tempStack.buildValue,
        runningSum: tempStack.runningSum,
        segmentCount: tempStack.segmentCount,
        displayValue: tempStack.displayValue,
        displayLogic: isSpecialCase ? `Special case: showing totalSum (${totalSum})` : `Regular: showing segmentValue (${segmentValue})`,
        isValid: tempStack.isValid,
        isBuilding: tempStack.isBuilding
      });
    } else {
      // Still building first segment
      tempStack.displayValue = cards.reduce((sum, c) => sum + c, 0) + newCardValue;
      tempStack.isValid = true;
      tempStack.isBuilding = true;

      console.log('[BUILD_CALCULATOR] 📊 Building first segment display:', {
        cardSum: cards.reduce((sum, c) => sum + c, 0),
        plusNewCard: newCardValue,
        displayValue: tempStack.displayValue,
        isValid: tempStack.isValid,
        isBuilding: tempStack.isBuilding
      });
    }
  } else {
    console.log(`[BUILD_CALCULATOR] ✅ BUILD VALUE EXISTS (${B}) - processing with known build rules`);

    // Build value known - check for overflow first
    const hasOverflow = newS > B && !isSpecialCase;
    console.log('[BUILD_CALCULATOR] 🚨 Overflow check:', {
      newRunningSum: newS,
      buildValue: B,
      isSpecialCase: isSpecialCase,
      overflowCondition: `newS (${newS}) > B (${B}) && !isSpecialCase (${!isSpecialCase})`,
      hasOverflow: hasOverflow
    });

    if (hasOverflow) {
      // OVERFLOW: Invalid - breaks consecutive rule (only for non-special cases)
      tempStack.displayValue = 'INVALID';
      tempStack.isValid = false;
      tempStack.isBuilding = false;
      return tempStack;
    }

    // Update running sum and calculate display
    tempStack.runningSum = newS;
    const segmentComplete = newS === B;
    const useSpecialCase = isSpecialCase;
    console.log('[BUILD_CALCULATOR] 📋 Completion check:', {
      segmentComplete: segmentComplete,
      useSpecialCase: useSpecialCase,
      segmentCompleteCondition: `newS (${newS}) === B (${B})`,
      specialCaseCondition: `isSpecialCase (${isSpecialCase})`
    });

    if (segmentComplete || useSpecialCase) {
      // SEGMENT COMPLETE or SPECIAL CASE: show total sum for special cases
      tempStack.displayValue = isSpecialCase ? totalSum : B;
      tempStack.runningSum = 0;
      tempStack.segmentCount = C + 1;
      tempStack.isValid = true;
      tempStack.isBuilding = false;

      console.log('[BUILD_CALCULATOR] 🔄 Segment completion state:', {
        displayValue: tempStack.displayValue,
        displayLogic: isSpecialCase ? `Special case: totalSum (${totalSum})` : `Regular: buildValue (${B})`,
        runningSum: tempStack.runningSum,
        segmentCount: tempStack.segmentCount,
        isValid: tempStack.isValid,
        isBuilding: tempStack.isBuilding
      });
    } else {
      // BUILDING TOWARD SEGMENT (only for complex builds)
      tempStack.displayValue = newS - B; // Negative deficit
      tempStack.isValid = true;
      tempStack.isBuilding = true;

      console.log('[BUILD_CALCULATOR] 📊 Building toward segment:', {
        runningSum: newS,
        buildValue: B,
        displayValue: tempStack.displayValue,
        displayLogic: `${newS} - ${B} = ${tempStack.displayValue} (negative deficit)`,
        isValid: tempStack.isValid,
        isBuilding: tempStack.isBuilding
      });
    }
  }

  console.log('[BUILD_CALCULATOR] 🎯 UPDATE_BUILD_CALCULATOR complete. Final result:', {
    stackId: tempStack.stackId,
    buildValue: tempStack.buildValue,
    displayValue: tempStack.displayValue,
    runningSum: tempStack.runningSum,
    segmentCount: tempStack.segmentCount,
    isValid: tempStack.isValid,
    isBuilding: tempStack.isBuilding,
    finalCards: tempStack.cards?.map(c => `${c.rank}${c.suit}(${c.value})`) || []
  });

  return tempStack;
}

/**
 * Initialize temp stack with build calculator fields and analyze existing cards
 * @param {object} stagingStack - Basic temp stack object
 * @returns {object} Enhanced temp stack with build calculator fields
 */
function initializeBuildCalculator(stagingStack) {
  console.log('[BUILD_CALCULATOR] 📊 Input staging stack:', {
    stackId: stagingStack.stackId,
    cards: stagingStack.cards?.map(c => `${c.rank}${c.suit}(${c.value})`) || [],
    value: stagingStack.value,
    combinedValue: stagingStack.combinedValue,
    isSameValueStack: stagingStack.isSameValueStack
  });

  const enhancedStack = {
    ...stagingStack,
    buildValue: null,
    runningSum: 0,
    segmentCount: 0,
    displayValue: stagingStack.value, // Start with sum as fallback
    isValid: true,
    isBuilding: true
  };
  // Analyze existing cards to see if they form a build
  const cardValues = enhancedStack.cards.map(c => c.value);
  const buildResult = detectBuildWithSegmentInfo(cardValues);
  if (buildResult) {
    // Found a build! Set up the calculator state
    enhancedStack.buildValue = buildResult.buildValue;
    enhancedStack.segmentCount = 1;
    enhancedStack.displayValue = buildResult.buildValue;
    enhancedStack.isBuilding = false;
    // Calculate remaining cards to see current state using proper segmentEnd
    const remainingCards = cardValues.slice(buildResult.segmentEnd);
    let currentSum = 0;
    let segmentsFound = 1;

    for (let i = 0; i < remainingCards.length; i++) {
      const value = remainingCards[i];
      currentSum += value;
      if (currentSum === buildResult.buildValue) {
        // Complete segment
        segmentsFound++;
        currentSum = 0;
      } else if (currentSum > buildResult.buildValue) {
        // Invalid - overflow
        console.log(`[BUILD_CALCULATOR] ❌ OVERFLOW DETECTED! currentSum (${currentSum}) > buildValue (${buildResult.buildValue})`);
        enhancedStack.isValid = false;
        enhancedStack.displayValue = 'INVALID';
        break;
      }
    }

    enhancedStack.segmentCount = segmentsFound;
    enhancedStack.runningSum = currentSum;
    // Set display value based on current state
    if (!enhancedStack.isValid) {
      enhancedStack.displayValue = 'INVALID';
    } else if (currentSum === 0) {
      enhancedStack.displayValue = buildResult.buildValue; // Last segment complete
      console.log(`[BUILD_CALCULATOR] ✅ Display value set to buildValue (${buildResult.buildValue}) - all segments complete`);
    } else {
      enhancedStack.displayValue = currentSum - buildResult.buildValue; // Building toward next
    }
  } else {
  }

  console.log('[BUILD_CALCULATOR] 🎯 INITIALIZE_BUILD_CALCULATOR complete. Final result:', {
    stackId: enhancedStack.stackId,
    buildValue: enhancedStack.buildValue,
    displayValue: enhancedStack.displayValue,
    segmentCount: enhancedStack.segmentCount,
    runningSum: enhancedStack.runningSum,
    isValid: enhancedStack.isValid,
    isBuilding: enhancedStack.isBuilding,
    finalCards: enhancedStack.cards?.map(c => `${c.rank}${c.suit}(${c.value})`) || []
  });

  return enhancedStack;
}

module.exports = {
  checkFirstCompleteSegment,
  detectNormalBuildCombinations,
  updateBuildCalculator,
  initializeBuildCalculator,
  detectNormalBuild
};
