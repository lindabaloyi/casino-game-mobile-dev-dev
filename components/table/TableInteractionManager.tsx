/**
 * TableInteractionManager
 * Handles drop zones and interaction logic for table cards
 * Extracted from TableCards.tsx to separate interaction concerns from rendering
 */

import { useCallback } from 'react';
import { TableCard } from '../../multiplayer/server/game-logic/game-state';

interface TableInteractionManagerProps {
  tableCards: TableCard[];
  onDropOnCard: (draggedItem: any, targetInfo: any) => boolean;
}

// Safe property checker utility
const safeHasProperty = (obj: any, prop: string): boolean => {
  return obj != null && typeof obj === 'object' && prop in obj;
};

export function useTableInteractionManager({ tableCards, onDropOnCard }: TableInteractionManagerProps) {

const handleDropOnStack = useCallback((draggedItem: any, stackId: string) => {
  console.log('[CLIENT_DEBUG] ===== CLIENT DROP =====');
  console.log('[CLIENT_DEBUG] draggedItem.source:', draggedItem?.source);
  console.log('[CLIENT_DEBUG] stackId:', stackId);
  console.log('[CLIENT_DEBUG] draggedCard:', draggedItem?.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'null');

  console.log('[SIMPLE DROP] Processing drop:', {
    draggedCard: `${draggedItem?.card?.rank}${draggedItem?.card?.suit}`,
    stackId,
    source: draggedItem?.source
  });

    // Basic validation only
    if (!draggedItem || !draggedItem.card) {
      console.log('[SIMPLE DROP] No dragged item');
      return false;
    }

    // Parse stack ID
    const parts = stackId.split('-');
    const targetType = parts[0];
    const targetIndex = parseInt(parts[1]);

    // Find the target item
    const targetItem = tableCards[targetIndex];

    if (!targetItem) {
      console.log('[SIMPLE DROP] No target at index', targetIndex);
      return false;
    }

    // Check if it's a temp stack
    const isTempStack = safeHasProperty(targetItem, 'type') && (targetItem as any).type === 'temporary_stack';

  if (isTempStack) {
    console.log('[SIMPLE DROP] 🎯 Dropping on temp stack - ADD CARD');

    const tempStack = targetItem as any;

    // SIMPLE: Always allow adding to temp stack
    if (onDropOnCard) {
      const result = onDropOnCard(draggedItem, {
        type: 'temporary_stack', // ✅ Consistent with server expectations
        stackId: tempStack.stackId,
        stack: tempStack,
        index: targetIndex,
        card: draggedItem.card, // ✅ Include dragged card for consistency
        source: draggedItem.source
      });

      console.log('[SIMPLE DROP] Add to temp stack result:', result);
      return result || true;
    }
  }
  else {
    // Dropping on loose card - CREATE NEW TEMP STACK
    console.log('[SIMPLE DROP] 🎯 Dropping on loose card - CREATE NEW TEMP STACK');

    if (onDropOnCard) {
      const result = onDropOnCard(draggedItem, {
        type: 'loose', // ✅ CRITICAL FIX: Server expects 'loose' for staging
        card: targetItem, // ✅ FIXED: Changed from targetCard to card
        index: targetIndex,
        draggedCard: draggedItem.card,
        source: draggedItem.source
      });

      console.log('[SIMPLE DROP] Create temp stack result:', result);
      return result || true;
    }
  }

    return true;
  }, [tableCards, onDropOnCard]);

  return {
    handleDropOnStack
  };
}
