/**
 * Build Utils
 * Utility functions for calculating build values from card combinations.
 * 
 * For temp stacks (2 cards): uses base + added logic
 * - Base (S) = larger card value (bottom)
 * - Added = smaller card value (top)
 */

export interface BuildPreviewResult {
  icon: string;
  isRed: boolean;
}

/**
 * Calculate build preview for a 2-card temp stack.
 * 
 * @param cards - Array of cards (must have at least 2 cards)
 * @returns Object with icon string and red color flag
 */
export function getTempStackPreview(cards: { value: number }[]): BuildPreviewResult {
  if (!cards || cards.length < 2) {
    return { icon: '-', isRed: false };
  }

  // Sort: base (larger) at bottom, added (smaller) on top
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const baseValue = sorted[0].value;   // S - larger card (bottom)
  const addedValue = sorted[1].value;  // added - smaller card (top)
  
  const total = baseValue + addedValue;

  if (total <= 10) {
    // Simple build - total ≤ 10
    return { icon: total.toString(), isRed: false };
  }

  // Total > 10, calculate difference
  const diff = baseValue - addedValue;  // Always >= 0 due to sorting

  if (diff === 0) {
    // Exact match (e.g., 7+7=14, diff=0) - show base value
    return { icon: baseValue.toString(), isRed: false };
  }

  // Incomplete - show negative diff in red
  return { icon: `-${diff}`, isRed: true };
}

/**
 * Format build value for display.
 */
export function formatBuildValue(value: number | null): string {
  if (value === null) return '-';
  return value.toString();
}
