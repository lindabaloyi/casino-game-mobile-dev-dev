/**
 * useTempStackCards
 * Derives the bottom, top, and pending cards from the temp stack.
 */

import { useMemo } from 'react';
import { TempStack, Card } from '../types';

interface UseTempStackCardsResult {
  /** Bottom card (highest value, base of stack) */
  bottom: Card | undefined;
  /** Top card (most recently added) */
  top: Card | undefined;
  /** Pending cards for display */
  pendingCards: Card[];
  /** Whether the stack is being extended */
  isExtending: boolean;
}

export function useTempStackCards(stack: TempStack): UseTempStackCardsResult {
  // bottom = highest-value card (base)
  const bottom = useMemo(() => stack.cards[0], [stack.cards]);

  // Get pending extension cards
  const pendingExtension = stack.pendingExtension;
  const isExtending = !!(pendingExtension?.cards?.length);

  // Pending cards for display
  const pendingCards = useMemo(
    () => pendingExtension?.cards?.map((p: { card: Card }) => p.card) ?? [],
    [pendingExtension]
  );

  // Top card: show most recent pending card if extending, otherwise original top
  const top = useMemo(() => {
    if (isExtending && pendingCards.length > 0) {
      return pendingCards[pendingCards.length - 1];
    }
    return stack.cards[stack.cards.length - 1];
  }, [stack.cards, pendingCards, isExtending]);

  return {
    bottom,
    top,
    pendingCards,
    isExtending,
  };
}

export default useTempStackCards;
