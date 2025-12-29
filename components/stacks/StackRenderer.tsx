import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Card, { CardType } from '../card';

import DraggableCard from '../DraggableCard';

interface StackRendererProps {
  cards: CardType[];
  draggable?: boolean;
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => void;
  onDragMove?: (card: CardType, position: { x: number; y: number }) => void;
  currentPlayer?: number;
  dragSource?: string;
  stackId?: string;
  dragZIndex?: number;
  baseZIndex?: number;
  baseElevation?: number;
}

/**
 * StackRenderer - Handles the visual rendering of card stacks
 * Manages the difference between draggable and non-draggable cards
 * Handles stacking context management for drag operations
 */
export const StackRenderer: React.FC<StackRendererProps> = ({
  cards,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragMove,
  currentPlayer = 0,
  dragSource = 'table',
  stackId,
  dragZIndex,
  baseZIndex = 1,
  baseElevation = 1
}) => {
  const [isDragging, setIsDragging] = useState(false);

  // Show only the top card for visual simplicity on mobile
  const topCard = cards[cards.length - 1];
  const cardCount = cards.length;

  // Stacking context drag event handlers
  const handleCardDragStart = () => {
    console.log(`[StackRenderer] 🎯 DRAG START: ${stackId} setting z-index to 99999, elevation to 999`);
    setIsDragging(true);
  };

  const handleCardDragEnd = () => {
    console.log(`[StackRenderer] 🛑 DRAG END: ${stackId} resetting z-index to ${baseZIndex}, elevation to ${baseElevation}`);
    setIsDragging(false);
  };

  console.log(`[StackRenderer:DEBUG] 🧱 Rendering ${stackId}:`, {
    cardCount,
    hasDraggableCards: cardCount === 1 && draggable,
    topCard: topCard ? `${topCard.rank}${topCard.suit}` : 'none',
    isDragging,
    dynamicZIndex: isDragging ? 99999 : baseZIndex,
    dynamicElevation: isDragging ? 999 : baseElevation
  });

  // Dynamic style for stacking context management
  const dynamicStyle = {
    zIndex: isDragging ? 99999 : baseZIndex,
    elevation: isDragging ? 999 : baseElevation, // Android shadow depth
  };

  if (!topCard) {
    return null;
  }

  return (
    <View style={[{ position: 'relative' }, dynamicStyle]}>
      {draggable && cardCount === 1 ? (
        <DraggableCard
          card={topCard}
          onDragStart={(card) => {
            handleCardDragStart(); // Update renderer z-index first
            onDragStart?.(card);    // Then call parent's handler
          }}
          onDragEnd={(draggedItem, dropPosition) => {
            handleCardDragEnd();   // Reset renderer z-index first
            onDragEnd?.(draggedItem, dropPosition); // Then call parent's handler
          }}
          onDragMove={onDragMove}
          currentPlayer={currentPlayer}
          source={dragSource}
          stackId={stackId}
          dragZIndex={dragZIndex}
        />
      ) : (
        <TouchableOpacity
          style={{
            alignItems: 'center',
            justifyContent: 'center'
          }}
          activeOpacity={draggable ? 1.0 : 0.7}
          disabled={draggable}
        >
          <Card
            card={topCard}
            size="normal"
            disabled={false}
            draggable={draggable}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};
