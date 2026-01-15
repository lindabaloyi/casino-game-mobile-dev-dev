/**
 * Build Validation Service
 * Contains all logic for validating temp stack builds and card combinations
 */

export interface Card {
  rank: string;
  suit: string;
  value: number;
}

export interface ActionOption {
  type: 'capture' | 'build';
  label: string;
  card: Card | null;
  value: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  buildType?: 'same-value' | 'base' | 'normal';
  buildValue?: number;
  baseDetails?: any;
}

/**
 * Check if cards are all the same value (same-value build)
 */
export const isSameValueBuild = (cards: { value: number }[]): boolean => {
  return cards.length >= 2 && cards.every((c: { value: number }) => c.value === cards[0].value);
};

/**
 * Find base build details with position validation
 */
export const findBaseBuildDetails = (cards: { value: number, source: string }[]): { baseValue: number, baseIndex: number, supports: { value: number }[] } | null => {
  for (let baseIndex = 0; baseIndex < cards.length; baseIndex++) {
    const potentialBase = cards[baseIndex];
    const supports = cards.filter((_, index) => index !== baseIndex);
    const supportsSum = supports.reduce((s: number, c: { value: number }) => s + c.value, 0);

    if (supportsSum === potentialBase.value && potentialBase.value <= 10) {
      // Check position requirements based on base source
      if (potentialBase.source === 'oppTopCard') {
        // oppTopCard base: anywhere EXCEPT position 0 (bottom)
        if (baseIndex > 0) {
          console.log(`🔍 [VALIDATOR] Valid oppTopCard base: ${potentialBase.value} at position ${baseIndex} (not bottom)`);
          return { baseValue: potentialBase.value, baseIndex, supports };
        } else {
          console.log(`🔍 [VALIDATOR] Invalid oppTopCard base position: ${potentialBase.value} at bottom (position 0)`);
        }
      } else if (potentialBase.source === 'table' || potentialBase.source === 'hand') {
        // table/hand base: must be position 0 (bottom)
        if (baseIndex === 0) {
          console.log(`🔍 [VALIDATOR] Valid table/hand base: ${potentialBase.value} at bottom (position 0)`);
          return { baseValue: potentialBase.value, baseIndex, supports };
        } else {
          console.log(`🔍 [VALIDATOR] Invalid table/hand base position: ${potentialBase.value} at position ${baseIndex} (must be 0)`);
        }
      }
    }
  }
  return null;
};

/**
 * Check if player has required capture card
 */
export const playerHasCaptureCard = (buildValue: number, hand: Card[]): boolean => {
  return hand.some((card: Card) => card.value === buildValue);
};

/**
 * Calculate all available build and capture options for a temp stack
 */
export const calculateConsolidatedOptions = (stack: any, hand: Card[]): ActionOption[] => {
  const options: ActionOption[] = [];
  const cards = stack.cards || [];
  const hasHandCards = cards.some((c: { source?: string }) => c.source === 'hand');
  const totalSum = cards.reduce((s: number, c: { value: number }) => s + c.value, 0);
  console.log('🔍 [VALIDATOR] Input cards:', cards.map(c => `${c.value}(${c.source || 'unknown'})`));
  console.log('🔍 [VALIDATOR] Player hand:', hand.map(c => `${c.value}${c.suit}`));
  // 🎯 STEP 1: USE PRE-CALCULATED SAME-VALUE BUILD OPTIONS (if available)
  const sameValueBuildOptions = stack.sameValueBuildOptions;
  if (sameValueBuildOptions && sameValueBuildOptions.length > 0) {
    console.log('🔍 [VALIDATOR] Pre-calculated options:', sameValueBuildOptions.map(o => ({
      type: o.type,
      buildValue: o.buildValue,
      captureCard: o.captureCard,
      description: o.description
    })));

    // Convert pre-calculated options to ActionOption format
    sameValueBuildOptions.forEach((option: any) => {
      // Check if player has the required capture card
      const hasCaptureCard = hand.some(card => card.value === option.captureCard);
      if (hasCaptureCard) {
        options.push({
          type: 'build',
          label: option.description,
          card: null,
          value: option.buildValue
        });
        console.log(`✅ [VALIDATOR] Added: ${option.description} (pre-calculated option)`);
      } else {
        console.log(`❌ [VALIDATOR] Rejected: ${option.description} (missing capture card ${option.captureCard})`);
      }
    });

    // Also add capture option for same-value cards
    const value = cards[0].value;
    options.push({
      type: 'capture',
      label: `Capture ${value}`,
      card: null,
      value: value
    });
    console.log(`✅ [VALIDATOR] Added: Capture ${value} (same-value capture option)`);
    console.log('✅ [VALIDATOR] Final options from pre-calculated:', options.map(o => `${o.type.toUpperCase()}: ${o.label}`));
    return options;
  }

  // 🎯 STEP 2: FALLBACK - CHECK SAME VALUE BUILDS (legacy logic)
  const sameValueCheck = isSameValueBuild(cards);
  if (sameValueCheck) {
    const value = cards[0].value;
    options.push({
      type: 'capture',
      label: `Capture ${value}`,
      card: null,
      value: value
    });
    console.log(`✅ [VALIDATOR] Added: Capture ${value} (same-value capture option)`);

    options.push({
      type: 'build',
      label: `Build ${value}`,
      card: null,
      value: value
    });
    console.log(`✅ [VALIDATOR] Added: Build ${value} (same-value build option)`);

    // Sum build for low cards - check if player has card with SUM value
    const sumBuildEligible = value <= 5 && totalSum <= 10;
    console.log(`🔍 [VALIDATOR] Sum build eligibility: ${sumBuildEligible ? '✅' : '❌'} (value≤5: ${value <= 5}, totalSum≤10: ${totalSum <= 10})`);
    if (sumBuildEligible) {
      const hasSumCard = hand.some((c: Card) => c.value === totalSum);
      if (hasSumCard) {
        options.push({
          type: 'build',
          label: `Build ${totalSum}`,
          card: null,
          value: totalSum
        });
        console.log(`✅ [VALIDATOR] Added: Build ${totalSum} (sum build)`);
      } else {
        console.log(`❌ [VALIDATOR] Skipped: Build ${totalSum} (no sum card in hand)`);
      }
    }
  }

  // 🆕 STEP 2: CHECK BASE BUILDS (casino-ordered)
  else {
    const baseBuildDetails = findBaseBuildDetails(cards);
    const baseBuildCheck = baseBuildDetails !== null;
    if (baseBuildCheck && baseBuildDetails) {
      const supportsSum = baseBuildDetails.supports.reduce((s: number, c: { value: number }) => s + c.value, 0);
      console.log(`🔍 [VALIDATOR] Base analysis: ${baseBuildDetails.baseValue} = ${baseBuildDetails.supports.map((c: { value: number }) => c.value).join('+')} = ${supportsSum}`);
    // Check if player has the required capture card
    if (playerHasCaptureCard(baseBuildDetails.baseValue, hand)) {
      options.push({
        type: 'build',
        label: `Build ${baseBuildDetails.baseValue}`,
        card: null,
        value: baseBuildDetails.baseValue
      });
      console.log(`✅ [VALIDATOR] Added: Build ${baseBuildDetails.baseValue} (base build - player has capture card)`);
    } else {
      console.log(`❌ [VALIDATOR] Rejected: Build ${baseBuildDetails.baseValue} (player missing ${baseBuildDetails.baseValue} in hand)`);
    }
    } else {
    }

    // 🆕 STEP 3: CHECK NORMAL BUILDS (sum-based)
    if (!baseBuildCheck) {
      const normalBuildEligible = hasHandCards && totalSum <= 10 && totalSum >= 2;
      console.log(`   - Total sum ≤ 10: ${totalSum <= 10 ? '✅' : '❌'} (${totalSum})`);
      console.log(`   - Total sum ≥ 2: ${totalSum >= 2 ? '✅' : '❌'} (${totalSum})`);

      if (normalBuildEligible) {
        // Check if player has the required capture card
        if (playerHasCaptureCard(totalSum, hand)) {
          options.push({
            type: 'build',
            label: `Build ${totalSum}`,
            card: null,
            value: totalSum
          });
          console.log(`✅ [VALIDATOR] Added: Build ${totalSum} (normal sum build - player has capture card)`);
        } else {
          console.log(`❌ [VALIDATOR] Rejected: Build ${totalSum} (player missing ${totalSum} in hand)`);
        }
      } else {
      }
    }
  }

  // 🎯 STEP 4: CAPTURE FALLBACK (always available for 2+ cards)
  const captureEligible = cards.length >= 2;
  console.log(`🔍 [VALIDATOR] Capture fallback eligibility: ${captureEligible ? '✅' : '❌'} (${cards.length} cards)`);
  if (captureEligible) {
    const captureValue = cards[0]?.value || 0;
    options.push({
      type: 'capture',
      label: `Capture all (${cards.length} cards)`,
      card: null,
      value: captureValue
    });
    console.log(`✅ [VALIDATOR] Added: Capture all (${cards.length} cards) (fallback option)`);
  }
  console.log('✅ [VALIDATOR] Final options:', options.map(o => `${o.type.toUpperCase()}: ${o.label}`));
  return options;
};

/**
 * Enhanced validation with specific error messages
 */
export const validateTempStackDetailed = (stack: any, hand: Card[]): ValidationResult => {
  const cards = stack.cards || [];
  const hasHandCards = cards.some((c: { source?: string }) => c.source === 'hand');
  const totalSum = cards.reduce((s: number, c: { value: number }) => s + c.value, 0);
  // Check minimum cards
  if (!cards || cards.length < 2) {
    return { valid: false, error: 'Temp stacks must contain at least 2 cards' };
  }

  // Check same-value builds
  const sameValueCheck = isSameValueBuild(cards);
  if (sameValueCheck) {
    // For same-value builds, capture is ALWAYS available (direct capture of the pair)
    // Build options are filtered in calculateConsolidatedOptions based on available cards
    const value = cards[0].value;
    return { valid: true, buildType: 'same-value', buildValue: value };
  }

  // Check base builds
  const baseDetails = findBaseBuildDetails(cards);
  if (baseDetails) {
    // Check if player has capture card for base builds
    if (!playerHasCaptureCard(baseDetails.baseValue, hand)) {
      return { valid: false, error: `Missing capture card - you need a ${baseDetails.baseValue} in your hand to create this build` };
    }
    return { valid: true, buildType: 'base', buildValue: baseDetails.baseValue, baseDetails };
  }

  // Check normal sum builds
  if (hasHandCards && totalSum <= 10 && totalSum >= 2) {
    // Check if player has capture card for normal builds
    if (!playerHasCaptureCard(totalSum, hand)) {
      return { valid: false, error: `Missing capture card - you need a ${totalSum} in your hand to create this build` };
    }
    return { valid: true, buildType: 'normal', buildValue: totalSum };
  }

  // No valid build found
  return { valid: false, error: 'Invalid build combination - cards don\'t form a valid build' };
};

/**
 * Legacy validation function for backward compatibility
 */
export const validateTempStack = (stack: any, hand: Card[]) => {
  const detailedResult = validateTempStackDetailed(stack, hand);

  if (!detailedResult.valid) {
    return {
      valid: false,
      error: detailedResult.error,
      message: detailedResult.error
    };
  }

  // For valid builds, return legacy format
  return {
    valid: true,
    options: [{
      type: 'build',
      label: `Build ${detailedResult.buildValue}`,
      value: detailedResult.buildValue,
      card: null
    }],
    target: detailedResult.buildValue,
    selectedCard: null,
    message: `Choose your action for this stack`
  };
};
