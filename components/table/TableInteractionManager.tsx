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

export function useTableInteractionManager({ tableCards, onDropOnCard }: TableInteractionManagerProps) {

  const handleDropOnStack = useCallback((draggedItem: any, stackId: string) => {
    // Parse stack ID to get target information
    const parts = stackId.split('-');
    const targetType = parts[0]; // 'loose', 'build', or 'temp'
    const targetIndex = parseInt(parts[1]);

    if (targetType === 'loose') {
      // Dropped on a loose card
      const targetCard = tableCards[targetIndex];

      if (targetCard && !('type' in targetCard)) {
        const looseCard = targetCard as any; // Type assertion for loose card

        // Check if this is a table-to-table drop
        if (draggedItem.source === 'table') {
          console.log(`🎯 Table-to-table drop: ${draggedItem.card.rank}${draggedItem.card.suit} → ${looseCard.rank}${looseCard.suit}`);
          console.log(`🎯 [TableDrop:DEBUG] Table zone detected - marking for server validation`);

          return {
            tableZoneDetected: true,
            targetType: 'loose',
            targetCard: looseCard,
            draggedItem
          };
        } else {
          // Normal hand-to-table drop
          return onDropOnCard?.(draggedItem, {
            type: 'loose',
            card: looseCard,
            index: targetIndex
          }) || false;
        }
      }
    } else if (targetType === 'build') {
      // Dropped on a build
      const targetBuild = tableCards[targetIndex];
      if (targetBuild && 'type' in targetBuild && targetBuild.type === 'build') {
        return onDropOnCard?.(draggedItem, {
          type: 'build',
          build: targetBuild,
          index: targetIndex
        }) || false;
      }
    } else if (targetType === 'temp') {
      // Dropped on a temporary stack
      const targetStack = tableCards[targetIndex];
      if (targetStack && 'type' in targetStack && targetStack.type === 'temporary_stack') {
        const tempStack = targetStack as any; // Type assertion for temp stack
        return onDropOnCard?.(draggedItem, {
          type: 'temporary_stack',
          stack: tempStack,
          stackId: tempStack.stackId,
          index: targetIndex
        }) || false;
      }
    }

    return false;
  }, [tableCards, onDropOnCard]);

  return {
    handleDropOnStack
  };
}
