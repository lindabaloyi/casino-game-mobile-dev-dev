/**
 * LooseCardRenderer
 * Handles rendering and interaction for loose cards on the table
 * Extracted from TableCards.tsx to focus on loose card logic
 */

import { Card, TableCard } from '../../multiplayer/server/game-logic/game-state';
import { CardType } from '../cards/card';
import CardStack from '../cards/CardStack';

interface LooseCardRendererProps {
  tableItem: TableCard;
  index: number;
  baseZIndex: number;
  dragZIndex: number;
  currentPlayer: number;
  onDropStack: (draggedItem: any) => boolean | any;
  onTableCardDragStart?: (card: any) => void;
  onTableCardDragEnd?: (draggedItem: any, dropPosition: any) => void;
}

export function LooseCardRenderer({
  tableItem,
  index,
  baseZIndex,
  dragZIndex,
  currentPlayer,
  onDropStack,
  onTableCardDragStart,
  onTableCardDragEnd
}: LooseCardRendererProps) {
  // DEPRECATED: Drop zone logic removed - contact detection handles all drops now

  // Type assertion for loose card - it's a table item without a 'type' property
  const looseCard = tableItem as Card;
  const stackId = `loose-${index}`;

  // 🎯 COMPREHENSIVE DRAG DATA LOGGING
  const handleDragStartWithLogging = () => {
    // Get ALL available data from the tableItem
    const tableItemData = tableItem as any;

    // Removed unused dragData variable - keeping debug structure for future use
    console.log('🎯 [LOOSE_CARD_DRAG] Starting drag:', {
      timestamp: new Date().toISOString(),
      card: `${tableItemData.rank}${tableItemData.suit}`,
      index,
      currentPlayer
    });
  };

  // Store card bounds globally for contact validation (this is a technical debt item)
  // TODO: This should be moved to a proper state management system
  const cardBounds = {
    stackId,
    index,
    bounds: null as any
  };

  if (!(global as any).cardBounds) {
    (global as any).cardBounds = {};
  }
  (global as any).cardBounds[stackId] = cardBounds;

  return (
    <CardStack
      key={`table-card-${index}-${looseCard.rank}-${looseCard.suit}`}
      stackId={stackId}
      cards={[looseCard as CardType]}
      onDropStack={undefined}  // DEPRECATED: Contact detection handles all drops now
      isBuild={false}
      currentPlayer={currentPlayer}
      draggable={true}
      onDragStart={handleDragStartWithLogging}  // 🎯 USE LOGGING HANDLER
      onDragEnd={onTableCardDragEnd}
      dragSource="loose"  // 🎯 FIX: Change from 'table' to 'loose' to match staging rule
      baseZIndex={baseZIndex}
      baseElevation={1}
      dragZIndex={dragZIndex}
    />
  );
}
