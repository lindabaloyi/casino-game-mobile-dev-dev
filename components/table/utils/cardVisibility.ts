import { Card } from '../types';

interface OpponentDragState {
  isDragging: boolean;
  cardId?: string;
  source?: 'hand' | 'table' | 'captured';
}

/**
 * Hook for determining if a card should be hidden during opponent's drag
 */
export function useCardVisibility(opponentDrag?: OpponentDragState | null) {
  const isCardHidden = (card: Card): boolean => {
    if (!opponentDrag?.isDragging) return false;

    const cardId = `${card.rank}${card.suit}`;
    const isHidden = opponentDrag.source === 'table' && 
                     opponentDrag.cardId === cardId;
    
    if (isHidden) {
      console.log(`[TableArea] Hiding table card ${cardId} - opponent is dragging`);
    }
    
    return isHidden;
  };

  return { isCardHidden };
}
