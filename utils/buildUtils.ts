/**
 * Build Utils
 * Unified system for all build-related functionality:
 * - Build preview (displaying build values)
 * - Build validation
 * - Build type detection (base, same-value, multi)
 * - Player options calculation (build vs capture choices)
 * 
 * Logic:
 * - Find the largest card in the stack (base)
 * - Find subset of other cards that sums closest to base
 * - diff = base - subsetSum
 * - If diff = 0 → valid build (show base)
 * - If diff > 0 → incomplete (show "-${diff}" in red)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

import type { Card, TempStack, BuildStack, AnyStack, TableItem } from '../components/table/types';
import { isTempStack, isBuildStack, isAnyStack, isLooseCard } from '../components/table/types';

// Re-export types for convenience
export type { Card, TempStack, BuildStack, AnyStack, TableItem };
export { isTempStack, isBuildStack, isAnyStack, isLooseCard };

export interface BuildPreviewResult {
  icon: string;
  isRed: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  buildType?: 'single' | 'multi';
}

/** Types of builds supported by the game */
export type BuildTypeId = 'base' | 'same-value' | 'multi';

/** Information about a specific build type */
export interface BuildType {
  type: BuildTypeId;
  target: number;
  description: string;
}

/** Player's option when accepting a temp stack */
export interface PlayOption {
  type: 'build' | 'capture';
  buildType?: BuildType;
  label: string;
  value: number;
  hasBase: boolean;
  card?: Card; // For capture - which hand card will be used
}

/**
 * Calculate build preview for a temp stack (any number of cards).
 * 
 * Algorithm:
 * 1. Find largest card = base
 * 2. Find subset of other cards that sums closest to base (without exceeding)
 * 3. diff = base - subsetSum
 * 4. If diff = 0 → valid build
 * 5. If diff > 0 → incomplete, show "-${diff}"
 */
export function getTempStackPreview(cards: { value: number }[]): BuildPreviewResult {
  if (!cards || cards.length === 0) {
    return { icon: '-', isRed: false };
  }

  if (cards.length === 1) {
    // Single card - use its value directly
    return { icon: cards[0].value.toString(), isRed: false };
  }

  if (cards.length === 2) {
    // 2 cards: use simpler logic
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    const base = sorted[0].value;
    const added = sorted[1].value;
    const total = base + added;

    if (total <= 10) {
      return { icon: total.toString(), isRed: false };
    }

    const diff = base - added;
    if (diff === 0) {
      return { icon: base.toString(), isRed: false };
    }
    return { icon: `-${diff}`, isRed: true };
  }

  // 3+ cards: use subset sum algorithm
  // Find the largest card as base
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const base = sorted[0].value;
  const otherCards = sorted.slice(1);

  // Find subset of otherCards that sums closest to base (without exceeding)
  const bestSum = findBestSubsetSum(otherCards, base);
  const diff = base - bestSum;

  if (diff === 0) {
    // Valid build - exact match
    return { icon: base.toString(), isRed: false };
  }

  // Incomplete - show negative diff
  return { icon: `-${diff}`, isRed: true };
}

/**
 * Find the maximum sum from subset of cards that doesn't exceed target.
 * Uses dynamic programming for efficiency.
 */
function findBestSubsetSum(cards: { value: number }[], target: number): number {
  if (cards.length === 0) return 0;

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
 * Format build value for display.
 */
export function formatBuildValue(value: number | null): string {
  if (value === null) return '-';
  return value.toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Types Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine what type of build this is.
 * - 'base': Largest card is base, others add to it (e.g., 4,4 → base 4)
 * - 'same-value': Two identical cards (e.g., 4,4 → can be 4 or 8)
 * - 'multi': More than 2 cards in stack
 */
export function detectBuildType(cards: Card[]): BuildTypeId {
  if (!cards || cards.length < 2) return 'base';
  if (cards.length > 2) return 'multi';
  
  // For 2 cards, check if they're the same value
  if (cards[0].value === cards[1].value) {
    return 'same-value';
  }
  return 'base';
}

/**
 * Get all valid build types for a stack.
 * e.g., [4,4] → [{ type: 'same-value', target: 4 }, { type: 'base', target: 8 }]
 */
export function getBuildTypes(cards: Card[]): BuildType[] {
  if (!cards || cards.length === 0) return [];
  
  const types: BuildType[] = [];
  const buildType = detectBuildType(cards);
  
  // Get unique values and counts
  const valueCounts = new Map<number, number>();
  for (const card of cards) {
    valueCounts.set(card.value, (valueCounts.get(card.value) || 0) + 1);
  }
  
  // Calculate possible targets based on build type
  if (buildType === 'same-value') {
    // Same value cards (e.g., 4,4)
    const value = cards[0].value;
    types.push({
      type: 'same-value',
      target: value,
      description: `Base ${value}`,
    });
    // Can also make double if value <= 5
    if (value <= 5) {
      types.push({
        type: 'same-value',
        target: value * 2,
        description: `Double ${value}`,
      });
    }
  } else {
    // Base build or multi-card
    const target = calculateBuildTarget(cards);
    types.push({
      type: buildType,
      target,
      description: `Build ${target}`,
    });
  }
  
  return types;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate temp stack - check if it can be accepted
 */
export function validateTempStack(tempStack: TempStack, playerHand: Card[]): ValidationResult {
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

  return { valid: true, buildType: 'single' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Target Calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the build target value from a stack of cards.
 * Uses the same logic as getTempStackPreview.
 */
export function calculateBuildTarget(cards: Card[]): number {
  if (!cards || cards.length === 0) return 0;
  
  if (cards.length === 1) {
    return cards[0].value;
  }

  const preview = getTempStackPreview(cards);
  // Extract numeric value from icon (handle negative diffs)
  const icon = preview.icon;
  if (icon.startsWith('-')) {
    // Incomplete build - use the sum of all cards
    return cards.reduce((sum, c) => sum + c.value, 0);
  }
  return parseInt(icon, 10) || 0;
}

/**
 * Calculate all possible build targets from a temp stack.
 * For identical cards (like 4,4), there can be multiple targets.
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
  
  // For each unique value that appears 2+ times, can make double
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
 * Check if a specific target is a valid build for the given cards.
 */
export function isValidBuild(cards: Card[], target: number): boolean {
  const total = cards.reduce((sum, c) => sum + c.value, 0);
  return total === target;
}

// ─────────────────────────────────────────────────────────────────────────────
// Capture Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if player can capture with a specific target value.
 * Returns true if player has a spare card (not used in the stack itself).
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
 * Get the hand card that would be used to capture a target.
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

// ─────────────────────────────────────────────────────────────────────────────
// Player Options Calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate all available options for a temp stack.
 * Returns both BUILD and CAPTURE options the player can choose from.
 */
export function calculatePlayOptions(
  tempStack: TempStack,
  playerHand: Card[]
): PlayOption[] {
  const options: PlayOption[] = [];
  
  // Get all possible targets for this stack
  const targets = calculatePossibleTargets(tempStack.cards);
  const buildType = detectBuildType(tempStack.cards);
  
  for (const target of targets) {
    // Check for BUILD option
    const canBuild = playerHand.some(c => c.value === target) && 
                     isValidBuild(tempStack.cards, target);
    
    if (canBuild) {
      options.push({
        type: 'build',
        buildType: {
          type: buildType,
          target,
          description: `Build ${target}`,
        },
        label: `Build ${target}`,
        value: target,
        hasBase: tempStack.cards.length === 2 && 
                 tempStack.cards[0].value === tempStack.cards[1].value,
      });
    }
    
    // Check for CAPTURE option
    const canCapture = hasSpareCardForTarget(target, tempStack, playerHand);
    
    if (canCapture) {
      const captureCard = getCaptureCard(target, tempStack, playerHand);
      options.push({
        type: 'capture',
        label: `Capture ${target}`,
        value: target,
        hasBase: false,
        card: captureCard,
      });
    }
  }
  
  return options;
}
