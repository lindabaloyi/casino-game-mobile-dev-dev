import React, { useEffect } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useCardDropHandler } from '../hooks/useCardDropHandler';
import { useDragGesture } from '../hooks/useDragGesture';
import { useDropZoneResolver } from '../hooks/useDropZoneResolver';
import Card, { CardType } from './card';

interface DraggableCardProps {
  card: CardType;
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => void;
  onDragMove?: (card: CardType, position: { x: number; y: number }) => void;
  disabled?: boolean;
  draggable?: boolean;
  size?: "normal" | "small" | "large";
  currentPlayer: number;
  source?: string;
  stackId?: string | null;
  dragZIndex?: number;
  triggerReset?: boolean;
}

/**
 * DraggableCard - Clean component using separated hooks
 * No longer a 300-line monster - just orchestrates focused hooks
 */
const DraggableCard: React.FC<DraggableCardProps> = ({
  card,
  onDragStart,
  onDragEnd,
  onDragMove,
  disabled = false,
  draggable = true,
  size = 'normal',
  currentPlayer,
  source = 'hand',
  stackId = null,
  dragZIndex = 9999,
  triggerReset = false
}) => {
  // Use separated hooks for different concerns
  const { pan, panResponder, isDragging, resetPosition } = useDragGesture({
    draggable,
    disabled,
    onDragStart,
    onDragMove,
    onDragEnd: (card, dropPosition) => handleDragEnd(card, dropPosition),
    card
  });

  const { resolveDropZone } = useDropZoneResolver();
  const { handleDrop } = useCardDropHandler({
    card,
    source,
    currentPlayer,
    stackId
  });

  // Handle drag end with drop zone resolution
  const handleDragEnd = async (card: CardType, dropPosition: { x: number; y: number }) => {
    console.log(`[DraggableCard] 🎯 Processing drop for ${card.rank}${card.suit} at (${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)})`);

    // Resolve which drop zone was hit
    const zoneResult = resolveDropZone(dropPosition, source);

    // Handle the drop with business logic
    const finalDropPosition = await handleDrop(dropPosition, zoneResult.bestZone);

    // Handle snap-back animation if not handled
    if (!finalDropPosition.handled) {
      if (source !== 'hand') {
        // Table cards always snap back
        resetPosition();
      } else if (finalDropPosition.attempted) {
        // Hand cards snap back only if drop was attempted but failed
        resetPosition();
      }
    }

    // Notify parent
    if (onDragEnd) {
      const draggedItem = {
        card,
        source,
        player: currentPlayer,
        stackId: stackId || undefined
      };
      onDragEnd(draggedItem, finalDropPosition);
    }
  };

  // Handle external reset trigger
  useEffect(() => {
    if (triggerReset) {
      console.log(`[DraggableCard] ⚡ External reset triggered for ${card.rank}${card.suit}`);
      resetPosition();
    }
  }, [triggerReset, resetPosition, card.rank, card.suit]);

  return (
    <Animated.View
      style={[
        styles.draggableContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y }
          ],
          zIndex: isDragging ? dragZIndex : 1,
        },
        isDragging && styles.dragging
      ]}
      {...panResponder.panHandlers}
    >
      <Card
        card={card}
        size={size}
        disabled={disabled}
        draggable={draggable}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  draggableContainer: {
    // zIndex is set dynamically in the component
  },
  dragging: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
});

export default DraggableCard;
