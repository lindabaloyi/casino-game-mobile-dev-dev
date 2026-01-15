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

    const dragData = {
      timestamp: new Date().toISOString(),

      // 1. CARD DATA (what we're dragging)
      card: {
        rank: tableItemData.rank,
        suit: tableItemData.suit,
        full: `${tableItemData.rank}${tableItemData.suit}`,
        // Check for any additional card properties
        allProperties: Object.keys(tableItemData).reduce((acc, key) => {
          acc[key] = tableItemData[key];
          return acc;
        }, {} as any)
      },

      // 2. SOURCE METADATA (where it's from)
      source: {
        type: 'loose', // Explicit - this is what we're setting in dragSource
        location: 'table',
        index: index,
        isHandCard: false,
        isTableCard: true,
        isBuildCard: false,
        isTempStack: false
      },

      // 3. ORIGINAL POSITION INFO
      position: {
        tableIndex: index,
        // Check for any position metadata
        x: tableItemData.x,
        y: tableItemData.y,
        zIndex: tableItemData.zIndex,
        hasOriginalPosition: !!tableItemData._originalPosition
      },

      // 4. STACK/BUILD INFO (if part of something)
      container: {
        isInStack: !!tableItemData.stackId,
        stackId: tableItemData.stackId,
        isInBuild: !!tableItemData.buildId,
        buildId: tableItemData.buildId,
        owner: tableItemData.owner,
        player: tableItemData.player
      },

      // 5. GAME STATE METADATA
      gameContext: {
        currentPlayer: currentPlayer,
        // Check for any game-specific flags
        canBuild: tableItemData.canBuild,
        canCapture: tableItemData.canCapture,
        isCapturable: tableItemData.isCapturable
      }
    };
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
