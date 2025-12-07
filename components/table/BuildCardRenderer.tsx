/**
 * BuildCardRenderer
 * Handles rendering and interaction for build items on the table
 * Extracted from TableCards.tsx to focus on build logic
 */

import { TableCard } from '../../multiplayer/server/game-logic/game-state';
import { CardType } from '../card';
import CardStack from '../CardStack';

interface BuildCardRendererProps {
  tableItem: TableCard;
  index: number;
  baseZIndex: number;
  dragZIndex: number;
  currentPlayer: number;
  onDropStack: (draggedItem: any) => boolean;
}

export function BuildCardRenderer({
  tableItem,
  index,
  baseZIndex,
  dragZIndex,
  currentPlayer,
  onDropStack
}: BuildCardRendererProps) {
  // Type assertion for build item
  const buildItem = tableItem as any; // Build has type: 'build' with additional properties
  const stackId = `build-${index}`;

  // Build items can have multiple cards, or a single card representation
  const buildCards = buildItem.cards || [tableItem as CardType];

  return (
    <CardStack
      key={`table-build-${index}`}
      stackId={stackId}
      cards={buildCards}
      onDropStack={onDropStack}
      buildValue={buildItem.value}
      isBuild={true}
      currentPlayer={currentPlayer}
      style={{ zIndex: baseZIndex }}
    />
  );
}
