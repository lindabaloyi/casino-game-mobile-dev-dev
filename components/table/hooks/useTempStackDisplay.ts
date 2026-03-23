/**
 * useTempStackDisplay
 * Computes display value and badge color for temp stacks.
 * Includes logic for baseFixed (dual builds), hints, and completion state.
 */

import { useMemo } from 'react';
import { getBuildHint } from '../../../utils/buildCalculator';
import { TempStack, Card } from '../types';
import { getTeamFromIndex } from '../../../shared/game/team';
import { 
  TEAM_A_COLORS, 
  TEAM_B_COLORS,
  PLAYER_1_GOLD, 
  PLAYER_2_PURPLE, 
  PLAYER_3_BLUE, 
  PLAYER_4_BURGUNDY 
} from '../../../constants/teamColors';

// Re-export player colors for convenience
export const COLORS = {
  PLAYER_1_GOLD,
  PLAYER_2_PURPLE,
  PLAYER_3_BLUE,
  PLAYER_4_BURGUNDY,
};

interface UseTempStackDisplayResult {
  /** Display value string for the badge */
  displayValue: string;
  /** Badge background color */
  badgeColor: string;
}

export function useTempStackDisplay(
  stack: TempStack,
  pendingCards: Card[],
  isExtending: boolean,
  playerCount: number = 2,
  isPartyMode: boolean = false
): UseTempStackDisplayResult {
  // Compute build hint dynamically from card values
  const hint = useMemo(() => {
    if (!stack.cards || stack.cards.length < 2) return null;
    const values = stack.cards.map(c => c.value);
    return getBuildHint(values);
  }, [stack.cards]);

  // Get badge color based on player (gold for P1, purple for P2, blue for P3, burgundy for P4)
  const getBadgeColor = (isComplete: boolean): string => {
    if (!isComplete) {
      // Incomplete - show red for need
      return '#E53935';
    }
    
    // For party mode (4-player with teams), use team colors
    if (isPartyMode && playerCount === 4) {
      const team = getTeamFromIndex(stack.owner);
      return team === 'A' ? TEAM_A_COLORS.primary : TEAM_B_COLORS.primary;
    }
    
    // Complete - use player-specific colors based on playerCount
    if (playerCount === 4) {
      // 4-player free-for-all: P0=purple, P1=gold, P2=blue, P3=burgundy
      switch (stack.owner) {
        case 0: return PLAYER_2_PURPLE;  // Purple
        case 1: return PLAYER_1_GOLD;    // Gold
        case 2: return PLAYER_3_BLUE;    // Blue
        case 3: return PLAYER_4_BURGUNDY; // Burgundy
        default: return PLAYER_2_PURPLE;
      }
    }
    if (playerCount === 3) {
      // 3-player mode
      switch (stack.owner) {
        case 0: return PLAYER_1_GOLD;
        case 1: return PLAYER_2_PURPLE;
        case 2: return PLAYER_3_BLUE;
        default: return PLAYER_2_PURPLE;
      }
    }
    // 2-player mode
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
  }, [stack, pendingCards, isExtending, hint, getBadgeColor, isPartyMode]);

  return { displayValue, badgeColor };
}

export default useTempStackDisplay;
