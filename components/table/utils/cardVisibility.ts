import { Card } from '../types';

interface OpponentDragState {
  isDragging: boolean;
  cardId?: string;
  source?: 'hand' | 'table' | 'captured';
  targetId?: string;
}

/**
 * Hook for determining if a card should be hidden during opponent's drag
 * Implements optimistic UI to prevent duplicate card display after drop
 */
export function useCardVisibility(opponentDrag?: OpponentDragState | null) {
  const isCardHidden = (card: Card): boolean => {
    if (!opponentDrag) return false;

    const cardId = `${card.rank}${card.suit}`;
    
    // Hide card if:
    // 1. Opponent is actively dragging this card, OR
    // 2. Card has been dropped (has targetId) - optimistic UI to prevent duplicate display
    const isHidden = 
      (opponentDrag.source === 'table' && 
       opponentDrag.cardId === cardId &&
       opponentDrag.isDragging) ||
      (opponentDrag.source === 'table' && 
       opponentDrag.cardId === cardId &&
       Boolean(opponentDrag.targetId));
    
    if (isHidden) {
      console.log(`[TableArea] Hiding table card ${cardId} - opponent is dragging or dropped`);
    }
    
    return isHidden;
  };

  return { isCardHidden };
}
