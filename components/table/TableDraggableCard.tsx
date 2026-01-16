/**
 * TableDraggableCard Component
 *
 * Specialized draggable card component for table cards that:
 * - Registers itself as a drop zone (so other cards can drop onto it)
 * - Handles table-to-table drag interactions
 * - Uses priority-based zone selection
 * - Provides clean separation from hand card logic
 * - Uses Reanimated + Gesture Handler for snappy drag/drop
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';

import { useDragGesture } from '../../hooks/useDragGesture';
import { findContactAtPoint, removePosition, reportPosition } from '../../src/utils/contactDetection';
import Card, { CardType } from '../cards/card';

interface TableDraggableCardProps {
  card: CardType;
  stackId: string;  // e.g., "loose-0", "loose-1"
  index: number;    // Position in table array
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => { validContact: boolean } | void;
  onDragMove?: (card: CardType, position: { x: number; y: number }) => void;
  disabled?: boolean;
  size?: "normal" | "small" | "large";
  currentPlayer: number;
  dragZIndex?: number;
  triggerReset?: boolean;
}

const TableDraggableCard: React.FC<TableDraggableCardProps> = ({
  card,
  stackId,
  index,
  onDragStart,
  onDragEnd,
  onDragMove,
  disabled = false,
  size = 'normal',
  currentPlayer,
  dragZIndex = 9999,
  triggerReset = false
}) => {
  const cardRef = useRef<View>(null);

  // Use the shared drag gesture hook for consistent behavior
  const { gesture, animatedStyle, isDragging, resetPosition } = useDragGesture({
    draggable: !disabled,
    disabled,
    onDragStart,
    onDragMove,
    onDragEnd: (card, dropPosition) => handleDragEnd(card, dropPosition),
    card
  });

  // Drag end handler - contact detection and position management
  const handleDragEnd = (card: CardType, dropPosition: { x: number; y: number }) => {
    console.log(`[TableDraggableCard] 🎯 Processing drop for ${card.rank}${card.suit} at (${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)})`);

    // Calculate this card's ID to exclude it from contact detection
    const thisCardId = `${card.rank}${card.suit}_${index}`;

    // PERFORMANCE: Run contact detection on UI thread for instant response
    runOnJS(() => {
      // PURE CONTACT DETECTION: Find contact at drop position
      const contact = findContactAtPoint(dropPosition.x, dropPosition.y, 80, {
        excludeId: thisCardId
      });

      const enhancedDropPosition: any = {
        ...dropPosition,
        contactDetected: !!contact,
        contact,
        handled: false,
        attempted: true
      };

      if (contact) {
        console.log(`[TableDraggableCard] ✅ Contact detected: ${contact.id} (${contact.type}) at ${contact.distance.toFixed(1)}px`);
        enhancedDropPosition.handled = true;
      } else {
        console.log(`[TableDraggableCard] ❌ No contact detected at drop position`);
      }

      // Notify parent - let drag handler determine if valid contact was made
      if (onDragEnd) {
        const draggedItem = {
          card,
          source: 'table',
          player: currentPlayer,
          stackId,
          originalIndex: index
        };

        const result = onDragEnd(draggedItem, enhancedDropPosition);

        // Only reset position if NO valid contact was made
        if (!result?.validContact) {
          console.log(`[TableDraggableCard] ❌ No valid contact - resetting position`);
          resetPosition();
        } else {
          console.log(`[TableDraggableCard] ✅ Valid contact - keeping card at drop position`);
          // Card stays where it was dropped - don't reset
        }
      } else {
        // No onDragEnd handler - always reset
        console.log(`[TableDraggableCard] ⚠️ No onDragEnd handler - resetting position`);
        resetPosition();
      }
    })();
  };

  // ✅ CONTACT-BASED: Report position to contact system
  useEffect(() => {
    if (!cardRef.current) return;

    const cardId = `${card.rank}${card.suit}_${index}`;

    const measureAndReport = () => {
      cardRef.current?.measureInWindow((x, y, width, height) => {
        // Skip invalid measurements
        if (x === 0 && y === 0 && width === 0 && height === 0) {
          console.log('[TABLE-CARD] Invalid measurement for card:', cardId);
          return;
        }

        reportPosition(cardId, {
          id: cardId,
          x,
          y,
          width,
          height,
          type: 'card',
          data: { ...card, index }
        });
      });
    };

    // Initial report
    const initialTimeout = setTimeout(measureAndReport, 50);

    // Re-measure periodically
    const intervalId = setInterval(measureAndReport, 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
      removePosition(cardId);
      console.log('[TABLE-CARD] 🧹 Cleaned up position for card:', cardId);
    };
  }, [card, index]);

  // Handle external reset (server validation failures)
  useEffect(() => {
    if (triggerReset) {
      console.log(`[TableDraggableCard] ⚡ External reset triggered for ${card.rank}${card.suit}`);
      resetPosition();
    }
  }, [triggerReset, resetPosition, card.rank, card.suit]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        ref={cardRef}
        style={[
          styles.container,
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
          draggable={true}
        />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container styles
  },
  dragging: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
});

export default TableDraggableCard;
