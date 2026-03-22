/**
 * useDealingAnimation
 * Hook to detect new cards being dealt and provide stagger delays.
 * 
 * Minimal implementation - only tracks which cards need animation
 * and provides stagger delay for sequential slide-in effect.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface Card {
  rank: string;
  suit: string;
  value: number;
  id?: string;
}

interface UseDealingAnimationResult {
  /** Set of card IDs that are currently being animated */
  animatingCardIds: Set<string>;
  /** Delay in ms for a card based on its index among the new cards */
  getCardDelay: (card: Card) => number;
  /** Mark a card as finished animating */
  onAnimationComplete: (cardId: string) => void;
  /** Reset animation state (e.g., after all cards are done) */
  reset: () => void;
}

// Helper to generate stable ID for a card
function getCardId(card: Card): string {
  return card.id || `${card.rank}${card.suit}`;
}

/**
 * Hook to track dealing animation state
 * @param hand - The current hand array
 */
export function useDealingAnimation(hand: Card[]): UseDealingAnimationResult {
  const [animatingCardIds, setAnimatingCardIds] = useState<Set<string>>(new Set());
  const prevHandRef = useRef<Card[]>(hand);
  // Initialize to 0 so initial deal is detected as new cards
  const prevLengthRef = useRef<number>(0);

  // Detect new cards when hand changes
  useEffect(() => {
    const currentLength = hand.length;
    const previousLength = prevLengthRef.current;

    console.log('[useDealingAnimation] Hand changed:', { currentLength, previousLength });
    
    if (currentLength > previousLength) {
      // New cards added (either initial deal or new cards)
      const newCards = hand.slice(previousLength);
      const newCardIds = new Set(newCards.map(getCardId));
      console.log('[useDealingAnimation] New cards detected:', newCardIds.size, 'Cards:', Array.from(newCardIds));
      setAnimatingCardIds(newCardIds);
    } else if (currentLength < previousLength) {
      // Cards were played - reset animating state
      console.log('[useDealingAnimation] Cards played, resetting animation state');
      setAnimatingCardIds(new Set());
    }

    prevHandRef.current = hand;
    prevLengthRef.current = currentLength;
  }, [hand]);

  // Calculate delay based on position among new cards
  const getCardDelay = useCallback((card: Card): number => {
    // Find all new cards in order of appearance in the hand
    const newCards = hand.filter(c => animatingCardIds.has(getCardId(c)));
    const index = newCards.findIndex(c => getCardId(c) === getCardId(card));
    return index * 120; // 120ms stagger per card
  }, [hand, animatingCardIds]);

  // Mark a card as finished animating
  const onAnimationComplete = useCallback((cardId: string) => {
    setAnimatingCardIds(prev => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  }, []);

  // Reset animation state
  const reset = useCallback(() => {
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
