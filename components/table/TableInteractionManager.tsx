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
  console.log('[DEBUG] Processing drop with stackId:', stackId);

  // Basic validation only
  if (!draggedItem || !draggedItem.card) {
    console.log('[SIMPLE DROP] No dragged item');
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
    console.log('[ERROR] No target found for stackId:', stackId);
    return false;
  }

  if (isTempStack) {
    const tempStack = targetItem as any;



    console.log('[SIMPLE DROP] 🎯 Adding card to temp stack');
    return onDropOnCard(draggedItem, {
      type: 'temporary_stack',
      stackId: tempStack.stackId,
      stack: tempStack,
      card: draggedItem.card,
      source: draggedItem.source
    });
  } else {
    // Dropping on loose card - CREATE NEW TEMP STACK
    console.log('[SIMPLE DROP] 🎯 Creating new temp stack from loose card');
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
