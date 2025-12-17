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
  console.log('[GAME_APPROPRIATE_DROP] Processing drop with stackId:', stackId);

  // Enhanced validation for game-appropriate approach
  if (!draggedItem || !draggedItem.card) {
    console.log('[GAME_APPROPRIATE_DROP] ❌ No dragged item');
    return false;
  }

  let targetItem;
  let isTempStack = false;

  // Strategy 1: Try to find temp stack by stackId
  if (stackId.startsWith('temp-') || stackId.startsWith('staging-')) {
    targetItem = tableCards.find(item =>
      item &&
      safeHasProperty(item, 'type') &&
      (item as any).type === 'temporary_stack' &&
      (item as any).stackId === stackId
    );
    isTempStack = !!targetItem;
  }

  // Strategy 2: Try to parse as loose/build card index
  if (!targetItem && (stackId.startsWith('card-') || stackId.startsWith('loose-') || stackId.startsWith('build-'))) {
    const parts = stackId.split('-');
    const targetIndex = parseInt(parts[1]);
    targetItem = tableCards[targetIndex];
    isTempStack = false;
  }

  if (!targetItem) {
    console.log('[GAME_APPROPRIATE_DROP] ❌ No target found for stackId:', stackId);
    return false;
  }

  if (isTempStack) {
    const tempStack = targetItem as any;

    console.log('[GAME_APPROPRIATE_DROP] 🎯 Adding card to temp stack (game-appropriate):', {
      stackId: tempStack.stackId,
      stackOwner: tempStack.owner,
      draggedSource: draggedItem.source,
      flexibleValidation: true
    });

    // 🎯 FIX 6: IMMEDIATE UI FEEDBACK - Show placement instantly
    try {
      // Immediate visual feedback for smooth UX
      console.log('[UI_FEEDBACK] Showing immediate placement for:', draggedItem.card);

      // Send optimistic update to UI (server will validate)
      const optimisticUpdate = {
        type: 'temp_stack_card_added',
        stackId: tempStack.stackId,
        card: draggedItem.card,
        timestamp: Date.now(),
        optimistic: true  // Mark as optimistic update
      };

      // Dispatch immediate UI update (if available)
      if ((global as any).socket) {
        (global as any).socket.emit('optimistic_update', optimisticUpdate);
      }
    } catch (uiError: any) {
      console.warn('[UI_FEEDBACK] Could not show immediate feedback:', uiError.message);
    }

    // Server will handle with flexible validation (no modals)
    return onDropOnCard(draggedItem, {
      type: 'temporary_stack',
      stackId: tempStack.stackId,
      stack: tempStack,
      card: draggedItem.card,
      source: draggedItem.source
    });
  } else {
    // Dropping on loose card - CREATE NEW TEMP STACK
    console.log('[GAME_APPROPRIATE_DROP] 🎯 Creating new temp stack from loose card');

    // 🎯 FIX 6: IMMEDIATE UI FEEDBACK for new stack creation
    try {
      const optimisticNewStack = {
        type: 'temp_stack_created',
        baseCard: targetItem,
        draggedCard: draggedItem.card,
        timestamp: Date.now(),
        optimistic: true
      };

      if ((global as any).socket) {
        (global as any).socket.emit('optimistic_update', optimisticNewStack);
      }
    } catch (uiError: any) {
      console.warn('[UI_FEEDBACK] Could not show new stack feedback:', uiError.message);
    }

    const targetIndex = tableCards.indexOf(targetItem);

    return onDropOnCard(draggedItem, {
      type: 'loose',
      card: targetItem,
      index: targetIndex,
      draggedCard: draggedItem.card,
      source: draggedItem.source
    });
  }
}, [tableCards, onDropOnCard]);

  return {
    handleDropOnStack
  };
}
