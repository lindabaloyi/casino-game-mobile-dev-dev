/**
 * Build Display Value Hook
 * Computes effectiveSum and displayValue from pending cards.
 */

import { useMemo } from 'react';
import { Card } from '../types';

interface UseBuildDisplayValueProps {
  /** Build value (target) */
  value: number;
  /** Pending cards being added to the build */
  pendingCards: Card[];
}

interface UseBuildDisplayValueResult {
  /** Current sum of pending cards with reset logic */
  effectiveSum: number;
  /** Display string for the badge */
  displayValue: string;
}

export function useBuildDisplayValue({
  value,
  pendingCards,
}: UseBuildDisplayValueProps): UseBuildDisplayValueResult {
  // Compute effective sum with reset on reset logic
  // This matches the server-side validation logic:
  // - Iterate through cards in order
  // - Reset sum to 0 whenever it equals build value
  const effectiveSum = useMemo(() => {
    let sum = 0;
    for (const card of pendingCards) {
      sum += card.value;
      if (sum === value) {
        sum = 0; // reset after exact match
      }
    }
    console.log('[useBuildDisplayValue] effectiveSum:', { pendingCards: pendingCards.map(c => c.value), value, sum });
    return sum;
  }, [pendingCards, value]);

  // Compute display value
  const displayValue = useMemo(() => {
    if (effectiveSum === 0) {
      // Currently at a completed state (or no pending cards)
      return value?.toString() ?? '-';
    } else if (effectiveSum < value) {
      // Need more cards
      return `-${value - effectiveSum}`;
    } else {
      // Excess
      return `+${effectiveSum - value}`;
    }
  }, [effectiveSum, value]);

  return {
    effectiveSum,
    displayValue,
  };
}

export default useBuildDisplayValue;
