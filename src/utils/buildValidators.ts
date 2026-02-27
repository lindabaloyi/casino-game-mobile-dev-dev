/**
 * Build Validators
 * Utility functions for validating temp stacks and calculating build options.
 * 
 * Handles cases like:
 * - 4 on 4: Can build 4 OR build 8 (if player has 8 in hand)
 * - 5 on 5: Can build 5 OR build 10 (if player has 10 in hand)
 * - Same-value stacks (1-5) can have up to 3 options: capture, build base, build double
 */

export interface Card {
  rank: string;
  suit: string;
  value: number;
}

export interface TempStack {
  stackId: string;
  cards: Card[];
  owner: number;
  value: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  buildType?: 'base' | 'same-value' | 'multi';
}

/** Build type for options */
export type BuildOptionType = 'base' | 'same-value' | 'multi';

export interface ActionOption {
  type: 'build' | 'capture';
  label: string;
  value: number;
  hasBase?: boolean;
  card?: Card;
  buildType?: BuildOptionType;
  isDoubleBuild?: boolean; // true for same-value double (e.g., 4+4=8)
}

/**
 * Detect the build type of a temp stack
 */
export function detectBuildType(cards: Card[]): BuildOptionType {
  if (!cards || cards.length < 2) return 'base';
  if (cards.length > 2) return 'multi';
  
  // For 2 cards, check if they're the same value
  if (cards[0].value === cards[1].value) {
    return 'same-value';
  }
  return 'base';
}

/**
 * Validate temp stack - check if it can be accepted
 */
export function validateTempStackDetailed(tempStack: TempStack, playerHand: Card[]): ValidationResult {
  if (!tempStack || !tempStack.cards || tempStack.cards.length < 2) {
    return { valid: false, error: 'Need at least 2 cards in stack' };
  }

  // Check if any card in temp matches any card in hand
  const tempValues = new Set(tempStack.cards.map(c => c.value));
  const handValues = new Set(playerHand.map(c => c.value));
  
  const hasMatch = [...tempValues].some(v => handValues.has(v));
  if (!hasMatch) {
    return { valid: false, error: 'No matching card in hand' };
  }

  const buildType = detectBuildType(tempStack.cards);
  return { valid: true, buildType };
}

/**
 * Calculate all possible build targets from a temp stack
 * For identical cards (like 4,4), there can be multiple targets
 */
export function calculatePossibleTargets(cards: Card[]): number[] {
  if (!cards || cards.length === 0) return [];
  
  // Get unique card values and counts
  const values = cards.map(c => c.value);
  const valueCounts = new Map<number, number>();
  for (const v of values) {
    valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
  }
  
  const targets: number[] = [];
  
  // For each unique value that appears 2+ times, can make double (if value <= 5)
  for (const [value, count] of valueCounts) {
    if (count >= 2 && value <= 5) {
      // Can make value or value*2 (e.g., 4 or 8)
      targets.push(value);
      targets.push(value * 2);
    } else {
      // Single card or value > 5, can only make that value
      targets.push(value);
    }
  }
  
  // Remove duplicates and sort
  return [...new Set(targets)].sort((a, b) => a - b);
}

/**
 * Check if player can capture with a specific target value
 * Returns true if player has a spare card (not used in the stack itself)
 */
export function hasSpareCardForTarget(
  targetValue: number,
  tempStack: TempStack,
  playerHand: Card[]
): boolean {
  // Count total cards of this value in hand
  const handCount = playerHand.filter(c => c.value === targetValue).length;
  
  // Count cards of this value used in temp stack
  const stackCount = tempStack.cards.filter(c => c.value === targetValue).length;
  
  // Need at least one spare in hand
  return handCount > stackCount;
}

/**
 * Get the spare card from hand that can capture a target
 */
export function getCaptureCard(
  targetValue: number,
  tempStack: TempStack,
  playerHand: Card[]
): Card | undefined {
  // Find a card in hand that matches target and is not used in stack
  return playerHand.find(c => 
    c.value === targetValue && 
    !tempStack.cards.some(sc => sc.rank === c.rank && sc.suit === c.suit)
  );
}

/**
 * Calculate consolidated options for a temp stack
 * Returns array of build/capture options the player can choose from
 * 
 * For same-value stacks (e.g., 4+4), returns up to 3 options:
 * 1. Capture - if player has spare card
 * 2. Build base - build with the card value
 * 3. Build double - build with value*2 (only for cards 1-5)
 * 
 * For normal builds (e.g., 6+3=9), uses tempStack.value as source of truth
 */
export function calculateConsolidatedOptions(
  tempStack: TempStack,
  playerHand: Card[]
): ActionOption[] {
  const options: ActionOption[] = [];
  
  // Get build type
  const buildType = detectBuildType(tempStack.cards);
  
  if (buildType === 'same-value') {
    // Same-value stack: use calculatePossibleTargets for multiple options
    const targets = calculatePossibleTargets(tempStack.cards);
    
    for (const target of targets) {
      // Check if player has a card to capture this target
      const canCapture = hasSpareCardForTarget(target, tempStack, playerHand);
      
      if (canCapture) {
        const captureCard = getCaptureCard(target, tempStack, playerHand);
        options.push({
          type: 'capture',
          label: `CAPTURE ${target}`,
          value: target,
          hasBase: false,
          card: captureCard,
          buildType,
        });
      }
      
      // Check if player can BUILD this target
      const hasBuildCard = playerHand.some(c => c.value === target);
      
      if (hasBuildCard) {
        // Check if this is a double build (same-value * 2)
        const isDoubleBuild = buildType === 'same-value' && target === tempStack.cards[0].value * 2;
        
        options.push({
          type: 'build',
          label: isDoubleBuild ? `BUILD ${target} (DOUBLE)` : `BUILD ${target}`,
          value: target,
          hasBase: buildType === 'same-value' && !isDoubleBuild,
          buildType,
          isDoubleBuild,
        });
      }
    }
  } else {
    // Normal build: use tempStack.value as the target (source of truth from build icon)
    const targetValue = tempStack.value;
    
    // Check if player can capture this value
    const canCapture = hasSpareCardForTarget(targetValue, tempStack, playerHand);
    
    if (canCapture) {
      const captureCard = getCaptureCard(targetValue, tempStack, playerHand);
      options.push({
        type: 'capture',
        label: `CAPTURE ${targetValue}`,
        value: targetValue,
        hasBase: false,
        card: captureCard,
        buildType,
      });
    }
    
    // Check if player can build (needs card matching the target value)
    const hasBuildCard = playerHand.some(c => c.value === targetValue);
    
    if (hasBuildCard) {
      options.push({
        type: 'build',
        label: `BUILD ${targetValue}`,
        value: targetValue,
        hasBase: true,
        buildType,
      });
    }
  }
  
  return options;
}
