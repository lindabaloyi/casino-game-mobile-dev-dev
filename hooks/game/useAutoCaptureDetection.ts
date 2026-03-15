/**
 * useAutoCaptureDetection Hook
 * Detects when a player should automatically capture their temp stack
 * without showing the PlayOptionsModal.
 * 
 * Conditions for auto-capture:
 * 1. Player has exactly ONE temp stack on the table
 * 2. The temp stack is complete (no pending card)
 * 3. Player has exactly ONE card in hand that can capture the temp stack
 * 4. No alternative plays exist (no build extensions, no other captures)
 */

import { useMemo, useCallback } from 'react';
import { Card, TempStack, BuildStack } from '../../types';
import { getBuildHint } from '../../utils/buildCalculator';

export interface AutoCaptureResult {
  shouldAutoCapture: boolean;
  captureValue?: number;
  reason?: string;
}

/**
 * Calculates all possible capture values for a temp stack
 */
function getPossibleCaptureValues(cards: Card[]): number[] {
  if (!cards || cards.length === 0) return [];
  
  const values = new Set<number>();
  const cardValues = cards.map(c => c.value);
  
  // Get hint for the stack (gives us the build target and what's needed)
  const hint = getBuildHint(cardValues);
  
  if (hint) {
    // Add the main build value
    values.add(hint.value);
    
    // If incomplete, add what card value is needed
    if (hint.need > 0) {
      values.add(hint.need);
    }
  }
  
  // Also check for same-rank build
  if (cards.length > 1) {
    const allSameRank = cards.every(c => c.rank === cards[0].rank);
    if (allSameRank) {
      values.add(cards[0].value);
    }
  }
  
  // Check for sum build (if total <= 10)
  const totalSum = cardValues.reduce((sum, v) => sum + v, 0);
  if (totalSum <= 10) {
    values.add(totalSum);
  }
  
  return Array.from(values).sort((a, b) => a - b);
}

/**
 * Checks if player has any alternative plays besides capturing the temp stack
 */
function hasAlternativePlays(
  playerHand: Card[],
  tableCards: Card[],
  buildStacks: BuildStack[],
  playerIndex: number
): boolean {
  // Check for build extensions (player has spare cards of same rank as any build)
  for (const build of buildStacks) {
    // Only check player's own builds
    if (build.owner !== playerIndex) continue;
    
    const buildCardRanks = build.cards.map(c => c.rank);
    const hasSpare = playerHand.some(c => buildCardRanks.includes(c.rank));
    if (hasSpare) return true;
  }
  
  // Check for other captures on loose table cards
  const looseCards = tableCards.filter(tc => !('type' in tc));
  for (const looseCard of looseCards) {
    // Check if any hand card can capture this loose card
    const canCapture = playerHand.some(c => 
      c.rank === looseCard.rank || c.value === looseCard.value
    );
    if (canCapture) return true;
  }
  
  // Check for opponent build captures
  for (const build of buildStacks) {
    if (build.owner === playerIndex) continue; // Skip own builds
    
    const canCapture = playerHand.some(c => c.value === build.value);
    if (canCapture) return true;
  }
  
  return false;
}

export function useAutoCaptureDetection(
  tempStack: TempStack | null,
  playerHand: Card[],
  tableCards: Card[] | undefined,
  buildStacks: BuildStack[] | undefined,
  playerIndex: number
): AutoCaptureResult {
  return useMemo(() => {
    // No temp stack = no auto-capture
    if (!tempStack) {
      return { shouldAutoCapture: false, reason: 'No temp stack' };
    }
    
    // Temp stack must be complete (no pending card) to capture
    // Note: In the current implementation, tempStack represents the complete stack
    // The pending card would be handled separately
    
    // Get possible capture values for this temp stack
    const possibleValues = getPossibleCaptureValues(tempStack.cards);
    
    if (possibleValues.length === 0) {
      return { shouldAutoCapture: false, reason: 'No capture values' };
    }
    
    // Find cards in hand that match any of the possible capture values
    const matchingCards = playerHand.filter(card => 
      possibleValues.includes(card.value)
    );
    
    // If no matching cards in hand, can't capture
    if (matchingCards.length === 0) {
      return { shouldAutoCapture: false, reason: 'No matching cards in hand' };
    }
    
    // If multiple capture options, need user to choose
    if (matchingCards.length > 1) {
      return { 
        shouldAutoCapture: false, 
        reason: `Multiple capture options (${matchingCards.length} cards)` 
      };
    }
    
    // Exactly one capture card - check for alternative plays
    const hasAlternatives = hasAlternativePlays(
      playerHand,
      tableCards || [],
      buildStacks || [],
      playerIndex
    );
    
    if (hasAlternatives) {
      return { 
        shouldAutoCapture: false, 
        reason: 'Alternative plays available' 
      };
    }
    
    // All conditions met - auto-capture!
    return {
      shouldAutoCapture: true,
      captureValue: matchingCards[0].value,
      reason: 'Single capture option with no alternatives'
    };
  }, [tempStack, playerHand, tableCards, buildStacks, playerIndex]);
}

/**
 * Standalone function version for non-hook contexts
 * (e.g., for server-side validation or testing)
 */
export function checkAutoCaptureEligibility(
  tempStack: TempStack | null,
  playerHand: Card[],
  tableCards: Card[] | undefined,
  buildStacks: BuildStack[] | undefined,
  playerIndex: number
): AutoCaptureResult {
  // No temp stack = no auto-capture
  if (!tempStack) {
    return { shouldAutoCapture: false, reason: 'No temp stack' };
  }
  
  // Get possible capture values for this temp stack
  const possibleValues = getPossibleCaptureValues(tempStack.cards);
  
  if (possibleValues.length === 0) {
    return { shouldAutoCapture: false, reason: 'No capture values' };
  }
  
  // Find cards in hand that match any of the possible capture values
  const matchingCards = playerHand.filter(card => 
    possibleValues.includes(card.value)
  );
  
  // If no matching cards in hand, can't capture
  if (matchingCards.length === 0) {
    return { shouldAutoCapture: false, reason: 'No matching cards in hand' };
  }
  
  // If multiple capture options, need user to choose
  if (matchingCards.length > 1) {
    return { 
      shouldAutoCapture: false, 
      reason: `Multiple capture options (${matchingCards.length} cards)` 
    };
  }
  
  // Exactly one capture card - check for alternative plays
  const hasAlternatives = hasAlternativePlays(
    playerHand,
    tableCards || [],
    buildStacks || [],
    playerIndex
  );
  
  if (hasAlternatives) {
    return { 
      shouldAutoCapture: false, 
      reason: 'Alternative plays available' 
    };
  }
  
  // All conditions met - auto-capture!
  return {
    shouldAutoCapture: true,
    captureValue: matchingCards[0].value,
    reason: 'Single capture option with no alternatives'
  };
}

export default useAutoCaptureDetection;
