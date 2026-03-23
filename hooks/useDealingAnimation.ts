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
  const wasCalledRef = useRef(false);
  const [animatingCardIds, setAnimatingCardIds] = useState<Set<string>>(new Set());

  // Track when useDealingAnimation is called
  if (!wasCalledRef.current) {
    wasCalledRef.current = true;
    console.log('[useDealingAnimation] 🔵 FIRST TIME CALL - hand.length:', hand.length);
  }

  console.log('[useDealingAnimation] 🔄 Called - hand.length:', hand.length, 'initialDealComplete:', initialDealCompleteRef.current, 'animatingCardIds.size:', animatingCardIds.size);

  // Detect when hand first gets cards (initial deal)
  useEffect(() => {
    console.log('[useDealingAnimation] ⚡ useEffect - hand.length:', hand.length, 'initialDealComplete:', initialDealCompleteRef.current);
    
    if (!initialDealCompleteRef.current && hand.length > 0) {
      // First time we have cards – animate all of them
      const allIds = new Set(hand.map(getCardId));
      setAnimatingCardIds(allIds);
      // Mark as complete so this never runs again
      initialDealCompleteRef.current = true;
      console.log('[useDealingAnimation] ✅ INITIAL DEAL - Set animatingCardIds:', Array.from(allIds));
    } else if (initialDealCompleteRef.current) {
      console.log('[useDealingAnimation] ⛔ SKIP - Already complete');
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
    console.log('[useDealingAnimation] 🎬 Animation complete:', cardId);
    setAnimatingCardIds(prev => {
      const next = new Set(prev);
      next.delete(cardId);
      console.log('[useDealingAnimation]   Remaining animating:', Array.from(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    console.log('[useDealingAnimation] 🔄 RESET');
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
