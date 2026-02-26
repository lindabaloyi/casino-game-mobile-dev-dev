/**
 * Build Utils
 * Utility functions for calculating build values from card combinations.
 * 
 * Logic:
 * - Find the largest card in the stack (base)
 * - Find subset of other cards that sums closest to base
 * - diff = base - subsetSum
 * - If diff = 0 → valid build (show base)
 * - If diff > 0 → incomplete (show "-${diff}" in red)
 */

export interface BuildPreviewResult {
  icon: string;
  isRed: boolean;
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
