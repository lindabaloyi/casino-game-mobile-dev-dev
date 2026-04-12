/**
 * useDealingAnimation
 * Simplified: animates only the initial deal (first time hand has cards).
 * After that, no further animations occur.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface Card {
  rank: string;
  suit: string;
  value: number;
  id?: string;
}

interface UseDealingAnimationResult {
  /** Set of card IDs that should be animated (only for the initial deal) */
  animatingCardIds: Set<string>;
  /** Delay in ms for a card based on its position in the hand */
  getCardDelay: (card: Card) => number;
  /** Mark a card as finished animating */
  onAnimationComplete: (cardId: string) => void;
  /** Reset animation state (for a new game) */
  reset: () => void;
}

function getCardId(card: Card): string {
  return card.id || `${card.rank}${card.suit}`;
}

export function useDealingAnimation(hand: Card[]): UseDealingAnimationResult {
  const initialDealCompleteRef = useRef(false);
  // DISABLED: Set to always return empty set to disable dealing animation
  // To re-enable, change to: const [animatingCardIds, setAnimatingCardIds] = useState<Set<string>>(new Set());
  const [animatingCardIds, setAnimatingCardIds] = useState<Set<string>>(new Set());

  // Detect when hand first gets cards (initial deal)
  useEffect(() => {
    if (!initialDealCompleteRef.current && hand.length > 0) {
      // First time we have cards – animate all of them
      const allIds = new Set(hand.map(getCardId));
      setAnimatingCardIds(allIds);
      // Mark as complete so this never runs again
      initialDealCompleteRef.current = true;
    }
  }, [hand]);

  // Stagger delay based on card's index in the hand (for the initial deal)
  const getCardDelay = useCallback((card: Card): number => {
    // If we haven't completed the initial deal yet, compute stagger
    if (!initialDealCompleteRef.current) {
      const index = hand.findIndex(c => getCardId(c) === getCardId(card));
      return index * 500; // 500ms per card (slowed down for testing)
    }
    return 0; // No delay after initial deal
  }, [hand]);

  const onAnimationComplete = useCallback((cardId: string) => {
    setAnimatingCardIds(prev => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    initialDealCompleteRef.current = false;
    setAnimatingCardIds(new Set());
  }, []);

  return {
    animatingCardIds,
    getCardDelay,
    onAnimationComplete,
    reset,
  };
}

export default useDealingAnimation;