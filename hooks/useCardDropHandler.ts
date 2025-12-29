import { useCallback } from 'react';
import { CardType } from '../components/card';

interface DropZone {
  stackId: string;
  zoneType?: string;
  onDrop?: (draggedItem: any) => boolean | any;
}

interface DropPosition {
  x: number;
  y: number;
  handled?: boolean;
  attempted?: boolean;
  targetType?: string;
  targetCard?: CardType;
  targetIndex?: number;
  draggedSource?: string;
  area?: string;
  tableZoneDetected?: boolean;
  needsServerValidation?: boolean;
}

interface DraggedItem {
  card: CardType;
  source: string;
  player: number;
  stackId?: string;
}

interface CardDropHandlerProps {
  card: CardType;
  source: string;
  currentPlayer: number;
  stackId?: string | null;
}

/**
 * Hook for card-specific drop business logic
 * Handles game rules and action creation
 * Separates business logic from UI concerns
 */
export const useCardDropHandler = ({
  card,
  source,
  currentPlayer,
  stackId
}: CardDropHandlerProps) => {

  const handleDrop = useCallback((
    dropPosition: { x: number; y: number },
    bestZone: DropZone | null
  ): DropPosition => {

    const result: DropPosition = {
      ...dropPosition,
      handled: false,
      attempted: false
    };

    if (!bestZone) {
      console.log(`[useCardDropHandler] No drop zone found for ${card.rank}${card.suit}`);
      return result;
    }

    result.attempted = true;

    const draggedItem: DraggedItem = {
      card,
      source,
      player: currentPlayer,
      stackId: stackId || undefined
    };

    console.log(`[useCardDropHandler] 🎯 Processing drop for ${card.rank}${card.suit} on ${bestZone.zoneType} zone: ${bestZone.stackId}`);

    // Regular drop zone handling
    try {
      const dropResult = bestZone.onDrop?.(draggedItem);

      if (dropResult) {
        result.handled = true;

        // Set result properties based on drop result
        if (typeof dropResult === 'object') {
          result.targetType = dropResult.type || dropResult.targetType || bestZone.zoneType;
          result.targetCard = dropResult.card || dropResult.targetCard;
          result.targetIndex = dropResult.index;
          result.draggedSource = dropResult.draggedSource || source;
          result.area = dropResult.area || 'table';

          // Special handling for table cards
          if (source === 'table') {
            result.needsServerValidation = true; // Table-to-table needs server validation
            result.tableZoneDetected = dropResult.tableZoneDetected || false;
          }
        }

        console.log(`[useCardDropHandler] ✅ Drop handled successfully:`, {
          targetType: result.targetType,
          targetCard: result.targetCard ? `${result.targetCard.rank}${result.targetCard.suit}` : 'none',
          area: result.area
        });
      } else {
        console.log(`[useCardDropHandler] ❌ Drop zone rejected the drop`);
      }
    } catch (error) {
      console.error(`[useCardDropHandler] 💥 Drop zone error:`, error);
      result.handled = false;
    }

    return result;
  }, [card, source, currentPlayer, stackId]);

  return { handleDrop };
};
