/**
 * useTempStackDisplay
 * Computes display value and badge color for temp stacks.
 * Includes logic for baseFixed (dual builds), hints, and completion state.
 */

import { useMemo } from 'react';
import { getBuildHint } from '../../../utils/buildCalculator';
import { TempStack, Card } from '../types';
import { PLAYER_1_GOLD, PLAYER_2_PURPLE } from './useBuildTeamInfo';

interface UseTempStackDisplayResult {
  /** Display value string for the badge */
  displayValue: string;
  /** Badge background color */
  badgeColor: string;
}

export function useTempStackDisplay(
  stack: TempStack,
  pendingCards: Card[],
  isExtending: boolean
): UseTempStackDisplayResult {
  // Compute build hint dynamically from card values
  const hint = useMemo(() => {
    if (!stack.cards || stack.cards.length < 2) return null;
    const values = stack.cards.map(c => c.value);
    return getBuildHint(values);
  }, [stack.cards]);

  // Get badge color based on player (gold for P1, purple for P2)
  const getBadgeColor = (isComplete: boolean): string => {
    if (!isComplete) {
      // Incomplete - show red for need
      return '#E53935';
    }
    // Complete - use gold for P1, purple for P2
    return stack.owner === 0 ? PLAYER_1_GOLD : PLAYER_2_PURPLE;
  };

  // Compute display value and badge color
  const { displayValue, badgeColor } = useMemo(() => {
    let value: string;
    let color: string;

    // Handle baseFixed (dual builds) - show deficit/excess
    if (stack.baseFixed && isExtending) {
      // Compute effective sum with reset on exact matches
      let effectiveSum = 0;
      for (const card of pendingCards) {
        effectiveSum += card.value;
        if (effectiveSum === stack.value) {
          effectiveSum = 0; // reset after exact match
        }
      }

      if (effectiveSum === 0) {
        value = stack.value?.toString() ?? '-';
        color = getBadgeColor(true);
      } else if (effectiveSum < stack.value) {
        value = `-${stack.value - effectiveSum}`;
        color = getBadgeColor(false);
      } else {
        value = `+${effectiveSum - stack.value}`;
        color = getBadgeColor(false);
      }
    } else if (stack.baseFixed && !isExtending) {
      // Fixed but no pending - show the fixed value
      value = stack.value?.toString() ?? '-';
      color = getBadgeColor(true);
    } else if (hint) {
      if (hint.need === 0) {
        // Complete stack - show target value with gold/purple badge
        value = hint.value.toString();
        color = getBadgeColor(true);
      } else {
        // Incomplete stack - show needed value with red badge
        value = `-${hint.need}`;
        color = getBadgeColor(false);
      }
    } else {
      // Fallback to server-provided values
      const isComplete = stack.need === 0;
      value = stack.need > 0 ? `-${stack.need}` : stack.value?.toString() ?? '-';
      color = getBadgeColor(isComplete);
    }

    return { displayValue: value, badgeColor: color };
  }, [stack, pendingCards, isExtending, hint, getBadgeColor]);

  return { displayValue, badgeColor };
}

export default useTempStackDisplay;
