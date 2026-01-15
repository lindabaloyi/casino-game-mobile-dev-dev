import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useDragGesture } from '../../hooks/useDragGesture';
import Card, { CardType } from './card';

interface DraggableCardProps {
  card: CardType;
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => { validContact: boolean } | void;
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
  // Use drag gesture hook - simplified for contact-based system
  const { gesture, animatedStyle, isDragging, resetPosition } = useDragGesture({
    draggable,
    disabled,
    onDragStart,
    onDragMove,
    onDragEnd: (card, dropPosition) => handleDragEnd(card, dropPosition),
    card
  });

  // Drag end handler - conditionally reset based on contact validity
  const handleDragEnd = (card: CardType, dropPosition: { x: number; y: number }) => {
    console.log(`[DraggableCard] 🎯 Processing drop for ${card.rank}${card.suit} at (${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)})`);

    // Notify parent - contact detection will happen in useDragHandlers
    if (onDragEnd) {
      const draggedItem = {
        card,
        source,
        player: currentPlayer,
        stackId: stackId || undefined
      };
      const result = onDragEnd(draggedItem, dropPosition);

      // Only reset if NO valid contact was made
      if (!result?.validContact) {
        console.log(`[DraggableCard] ❌ No valid contact - resetting position`);
        resetPosition();
      } else {
        console.log(`[DraggableCard] ✅ Valid contact - keeping card at drop position`);
        // Card stays where it was dropped - don't reset
      }
    } else {
      // No onDragEnd handler - always reset
      console.log(`[DraggableCard] ⚠️ No onDragEnd handler - resetting position`);
      resetPosition();
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
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.draggableContainer,
          animatedStyle,
          {
            zIndex: isDragging ? dragZIndex : 1,
          },
          isDragging && styles.dragging
        ]}
      >
        <Card
          card={card}
          size={size}
          disabled={disabled}
          draggable={draggable}
        />
      </Animated.View>
    </GestureDetector>
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
