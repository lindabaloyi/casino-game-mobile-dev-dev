/**
 * Build Validators
 * Utility functions for validating temp stacks and calculating build options.
 * 
 * Handles cases like:
 * - 4 on 4: Can build 4 OR build 8 (if player has 8 in hand)
 * - 5 on 5: Can build 5 OR build 10 (if player has 10 in hand)
 * - Same-value stacks (1-5) can have up to 3 options: capture, build base, build double
 */

import { getBaseBuildStackPreview } from '../../utils/buildUtils';

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
 * Check if dropping card on loose card with same value should be a direct capture.
 * 
 * Direct capture when:
 * - card.value === targetCard.value (same value)
 * - Player OWNS an active build (temp_stack) → ALWAYS direct capture
 * - OR Player CANNOT build: no card with value = card.value * 2 in hand
 *   (e.g., dropping 4, player has no 8)
 * 
 * @param cardValue - The value of the card being dropped
 * @param playerHand - Player's current hand
 * @param hasActiveBuild - Whether player owns an active temp_stack
 * @returns true if this should be a direct capture
 */
export function isDirectCapture(
  cardValue: number, 
  playerHand: Card[], 
  hasActiveBuild: boolean = false
): boolean {
  // If player owns an active build, ALWAYS direct capture (for any card value)
  // This allows capturing with identical cards even if they have build option
  if (hasActiveBuild) return true;
  
  // Only applies to cards 1-5 (since 6*2=12 > 10)
  if (cardValue > 5) return false;
  
  const doubleValue = cardValue * 2;
  
  // Check if player can build: do they have card.value * 2?
  const hasDouble = playerHand.some(c => c.value === doubleValue);
  
  // Direct capture if NO build possible
  return !hasDouble;
}

/**
 * Calculate the base build target value using build icon logic
 * This is the source of truth - uses base + subset sum algorithm
 * For cards [10, 9, 1]: base=10, others sum=10, target=10
 */
function calculateBaseBuildTarget(cards: Card[]): number {
  const preview = getBaseBuildStackPreview(cards);
  const icon = preview.icon;
  // If icon is negative (incomplete), use sum of all cards
  if (icon.startsWith('-')) {
    return cards.reduce((sum, c) => sum + c.value, 0);
  }
  return parseInt(icon, 10) || 0;
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
 * Check if temp stack contains any card from player's hand
 * Method 1: By rank + suit (exact match)
 */
function hasCardFromHandByRankSuit(tempStack: TempStack, playerHand: Card[]): boolean {
  return tempStack.cards.some(tc => 
    playerHand.some(ph => ph.rank === tc.rank && ph.suit === tc.suit)
  );
}

/**
 * Check if temp stack contains any card from player's hand
 * Method 2: By value combination (fallback)
 * For normal builds: if target can be made from a hand card + table card
 */
function hasCardFromHandByValue(tempStack: TempStack, playerHand: Card[]): boolean {
  // Use calculated target from build icon logic
  const targetValue = calculateBaseBuildTarget(tempStack.cards);
  
  // For each card in player's hand, check if it can combine with another card to make targetValue
  for (const handCard of playerHand) {
    const remainingValue = targetValue - handCard.value;
    // Check if remaining value could come from table cards (positive value > 0)
    if (remainingValue > 0 && remainingValue <= 10) {
      return true;
    }
  }
  return false;
}

/**
 * Check if temp stack contains any card from player's hand
 * This is needed to determine if player can build (must have card in stack)
 */
export function hasCardFromHandInStack(tempStack: TempStack, playerHand: Card[]): boolean {
  // First try exact match by rank + suit
  const hasByRankSuit = hasCardFromHandByRankSuit(tempStack, playerHand);
  if (hasByRankSuit) return true;
  
  // Fallback: check by value combination
  // If the target value can be made from player's card + table card, player contributed
  return hasCardFromHandByValue(tempStack, playerHand);
}

/**
 * Validate temp stack - check if it can be accepted
 */
export function validateTempStackDetailed(tempStack: TempStack, playerHand: Card[]): ValidationResult {
  if (!tempStack || !tempStack.cards || tempStack.cards.length < 2) {
    return { valid: false, error: 'Need at least 2 cards in stack' };
  }

  // Check if any card from player's hand is in the temp stack
  // This is required for building - player must have contributed a card
  const hasHandCardInStack = hasCardFromHandInStack(tempStack, playerHand);
  
  if (!hasHandCardInStack) {
    return { valid: false, error: 'No card from hand in stack' };
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
 * 1. Capture - if player has spare card (using card value, not double)
 * 2. Build base - build with the card value
 * 3. Build double - build with value*2 (only for cards 1-5)
 * 
 * For normal builds (e.g., 6+3=9), uses build icon logic as source of truth
 */
export function calculateConsolidatedOptions(
  tempStack: TempStack,
  playerHand: Card[]
): ActionOption[] {
  const options: ActionOption[] = [];
  
  // Get build type
  const buildType = detectBuildType(tempStack.cards);
  
  if (buildType === 'same-value') {
    // Same-value stack: get the base card value (e.g., 2 for 2,2)
    const baseValue = tempStack.cards[0].value;
    const doubleValue = baseValue * 2;
    
    // For same-value, we only capture the base value (not the double)
    // Capture option: using a spare card of the same value
    const canCapture = hasSpareCardForTarget(baseValue, tempStack, playerHand);
    
    if (canCapture) {
      const captureCard = getCaptureCard(baseValue, tempStack, playerHand);
      options.push({
        type: 'capture',
        label: `CAPTURE ${baseValue}`,
        value: baseValue,
        hasBase: false,
        card: captureCard,
        buildType,
      });
    }
    
    // Build base: using a card of the same value
    const hasBaseBuildCard = playerHand.some(c => c.value === baseValue);
    if (hasBaseBuildCard) {
      options.push({
        type: 'build',
        label: `BUILD ${baseValue}`,
        value: baseValue,
        hasBase: true,
        buildType,
        isDoubleBuild: false,
      });
    }
    
    // Build double: using a card of value*2 (only if baseValue <= 5)
    if (baseValue <= 5) {
      const hasDoubleBuildCard = playerHand.some(c => c.value === doubleValue);
      if (hasDoubleBuildCard) {
        options.push({
          type: 'build',
          label: `BUILD ${doubleValue} (DOUBLE)`,
          value: doubleValue,
          hasBase: false,
          buildType,
          isDoubleBuild: true,
        });
      }
    }
  } else {
    // Normal build: use build icon logic as source of truth (not tempStack.value)
    // This correctly handles cases like [10,9,1] -> target = 10 (not 20)
    const targetValue = calculateBaseBuildTarget(tempStack.cards);
    
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
    
    // Check if any card in temp stack equals targetValue (this is a BASE card from table)
    const baseCardInStack = tempStack.cards.some(c => c.value === targetValue);
    
    // Allow build if player has card in hand OR if base exists in stack
    if (hasBuildCard || baseCardInStack) {
      options.push({
        type: 'build',
        label: `BUILD ${targetValue}`,
        value: targetValue,
        hasBase: true, // true when building - either from hand or from base
        buildType,
      });
    }
  }
  
  return options;
}
