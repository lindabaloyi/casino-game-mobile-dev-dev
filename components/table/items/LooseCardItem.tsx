import React from 'react';
import { Card, isLooseCard } from '../types';
import { DraggableLooseCard } from '../DraggableLooseCard';
import { CardBounds } from '../../../hooks/useDrag';

interface LooseCardItemProps {
  card: Card;
  isMyTurn: boolean;
  playerNumber: number;
  tableVersion: number;
  registerCard: (id: string, bounds: CardBounds) => void;
  unregisterCard: (id: string) => void;
  findCardAtPoint: (x: number, y: number, excludeId?: string) => { id: string; card: Card } | null;
  findTempStackAtPoint: (x: number, y: number) => { stackId: string; owner: number; stackType: 'temp_stack' | 'build_stack' } | null;
  onStackDrop?: (card: Card, stackId: string, stackOwner: number, stackType: 'temp_stack' | 'build_stack') => void;
  onTableCardDropOnCard?: (card: Card, targetCard: Card) => void;
  onTableDragStart: (card: Card, absoluteX: number, absoluteY: number) => void;
  onTableDragMove: (absoluteX: number, absoluteY: number) => void;
  onTableDragEnd: () => void;
  isHidden?: boolean;
  /** Callback for double-tap to create single temp stack */
  onDoubleTapCard?: (card: Card) => void;
  /** Pending drop card - for optimistic UI to hide card immediately after action */
  pendingDropCard?: Card | null;
  /** Pending drop source - 'hand' | 'captured' | 'table' | null */
  pendingDropSource?: 'hand' | 'captured' | 'table' | null;
}

export function LooseCardItem({
  card,
  isMyTurn,
  playerNumber,
  tableVersion,
  registerCard,
  unregisterCard,
  findCardAtPoint,
  findTempStackAtPoint,
  onStackDrop,
  onTableCardDropOnCard,
  onTableDragStart,
  onTableDragMove,
  onTableDragEnd,
  isHidden,
  onDoubleTapCard,
  pendingDropCard,
  pendingDropSource,
}: LooseCardItemProps) {
  // Generate a unique key using rank, suit to handle potential duplicates
  // In practice, duplicate cards shouldn't exist in a standard deck
  const cardKey = `${card.rank}${card.suit}`;
  
  // Check if this card is pending drop (optimistic UI - hide immediately after action)
  const isPendingDrop = pendingDropCard && 
    pendingDropSource === 'table' &&
    pendingDropCard.rank === card.rank &&
    pendingDropCard.suit === card.suit;
  
  // Combine with isHidden prop
  const shouldHide = Boolean(isHidden || isPendingDrop);
  
  return (
    <DraggableLooseCard
      key={cardKey}
      card={card}
      isMyTurn={isMyTurn}
      playerNumber={playerNumber}
      layoutVersion={tableVersion}
      registerCard={registerCard}
      unregisterCard={unregisterCard}
      findCardAtPoint={findCardAtPoint}
      findTempStackAtPoint={findTempStackAtPoint}
      isHidden={shouldHide}
      onDropOnStack={(droppedCard, stackId, stackOwner, stackType) => {
        onStackDrop?.(droppedCard, stackId, stackOwner, stackType);
      }}
      onDropOnCard={(droppedCard, targetCard) => {
        onTableCardDropOnCard?.(droppedCard, targetCard);
      }}
      onDragStart={onTableDragStart}
      onDragMove={onTableDragMove}
      onDragEnd={onTableDragEnd}
      onDoubleTapCard={onDoubleTapCard}
    />
  );
}

// Type guard for checking if item is a loose card
export function isLooseCardItem(item: any): item is Card {
  return isLooseCard(item);
}
