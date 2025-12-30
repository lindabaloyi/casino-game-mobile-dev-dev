/**
 * TableDraggableCard Component
 *
 * Specialized draggable card component for table cards that:
 * - Registers itself as a drop zone (so other cards can drop onto it)
 * - Handles table-to-table drag interactions
 * - Uses priority-based zone selection
 * - Provides clean separation from hand card logic
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { findContactAtPoint, removePosition, reportPosition } from '../../src/utils/contactDetection';
import Card, { CardType } from '../card';

interface TableDraggableCardProps {
  card: CardType;
  stackId: string;  // e.g., "loose-0", "loose-1"
  index: number;    // Position in table array
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => void;
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
  const pan = useRef(new Animated.ValueXY()).current;
  const [hasStartedDrag, setHasStartedDrag] = useState(false);
  const cardRef = useRef<View>(null);

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

        console.log('[TABLE-CARD] 📍 Reporting position for card:', {
          id: cardId,
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height)
        });

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

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: (event, gestureState) => {
      const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
      return distance > 8;
    },

    onPanResponderGrant: () => {
      const currentX = (pan.x as any)._value || 0;
      const currentY = (pan.y as any)._value || 0;
      pan.setOffset({ x: currentX, y: currentY });
      pan.setValue({ x: 0, y: 0 });
    },

    onPanResponderMove: (event, gestureState) => {
      const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);

      if (distance > 8 && !hasStartedDrag) {
        setHasStartedDrag(true);
        console.log(`[TableDraggableCard] 🏁 STARTED dragging ${card.rank}${card.suit} from table`);
        console.log(`[TableDraggableCard] 📊 Stack ID: ${stackId}, Index: ${index}`);

        if (onDragStart) {
          onDragStart(card);
        }
      }

      if (hasStartedDrag) {
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(event, gestureState);

        // Optional: Log position occasionally
        if (Math.floor(Date.now() / 100) % 10 === 0) {
          console.log(`[TableDraggableCard] 📍 Drag position: (${gestureState.moveX.toFixed(1)}, ${gestureState.moveY.toFixed(1)})`);
        }

        if (onDragMove) {
          onDragMove(card, { x: gestureState.moveX, y: gestureState.moveY });
        }
      }
    },

    onPanResponderRelease: (event, gestureState) => {
      const dropPosition: any = {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
        handled: false,
        attempted: false
      };

      console.log(`[TableDraggableCard] 🎯 Drop position: ${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)}`);
      console.log(`[TableDraggableCard] 🔍 Available drop zones:`, ((global as any).dropZones || []).length);

      // For table cards, prioritize contact detection over drop zones
      // Check if this is a table-to-table drop by looking for contact first
      const contactDetected = (() => {
        try {
          const contact = findContactAtPoint(dropPosition.x, dropPosition.y, 80);
          if (contact && contact.type === 'card') {
            console.log(`[TableDraggableCard] 🎯 Contact detected: ${contact.id} (${contact.type})`);
            return contact;
          }
        } catch {
          console.log('[TableDraggableCard] Contact detection not available');
        }
        return null;
      })();

      if (contactDetected) {
        // Table-to-table drop detected - let contact system handle it
        console.log(`[TableDraggableCard] 📦 Table-to-table drop detected, delegating to contact system`);
        dropPosition.contactDetected = true;
        dropPosition.contact = contactDetected;
      } else {
        // No contact detected - check drop zones (for builds, etc.)
        if ((global as any).dropZones && (global as any).dropZones.length > 0) {
          let bestZone: any = null;
          let highestPriority = -1;
          const hitZones: any[] = [];

          // Find ALL zones that contain the drop point
          for (const zone of (global as any).dropZones as any[]) {
            const { x, y, width, height } = zone.bounds;

            if (dropPosition.x >= x &&
                dropPosition.x <= x + width &&
                dropPosition.y >= y &&
                dropPosition.y <= y + height) {

              hitZones.push({
                zone,
                priority: zone.priority || 0
              });
            }
          }

          console.log(`[TableDraggableCard] 📍 Zones hit: ${hitZones.length}`);

          // Select zone with HIGHEST priority
          hitZones.forEach(({ zone, priority }: any) => {
            // Don't drop on ourselves
            if (zone.stackId === stackId) {
              console.log(`[TableDraggableCard] ⚠️ Ignoring self-zone: ${zone.stackId}`);
              return;
            }

            if (priority > highestPriority) {
              highestPriority = priority;
              bestZone = zone;
              console.log(`[TableDraggableCard] 🎯 New best zone: ${zone.stackId} (priority: ${priority})`);
            }
          });

          if (bestZone) {
            console.log(`[TableDraggableCard] 🏆 Best drop zone: ${bestZone.stackId} (priority: ${highestPriority})`);
            dropPosition.attempted = true;

            const draggedItem = {
              card,
              source: 'table',
              player: currentPlayer,
              stackId,
              originalIndex: index
            };

            const dropResult = bestZone.onDrop(draggedItem);

            if (dropResult && typeof dropResult === 'object') {
              dropPosition.handled = true;
              dropPosition.targetType = dropResult.targetType || 'loose';
              dropPosition.targetCard = dropResult.card;
              dropPosition.targetIndex = dropResult.index;
              dropPosition.needsServerValidation = true;
              dropPosition.tableZoneDetected = true; // ✅ CRITICAL FIX: Enable server communication!
              console.log(`[TableDraggableCard] ✅ Drop accepted by ${bestZone.stackId}`);
            } else {
              console.log(`[TableDraggableCard] ❌ Drop rejected by ${bestZone.stackId}`);
            }
          } else {
            console.log(`[TableDraggableCard] ❌ No valid drop zone found`);
          }
        }
      }

      // Snap back if not handled
      if (!dropPosition.handled) {
        console.log(`[TableDraggableCard] 🏠 Snapping back ${card.rank}${card.suit} to original position`);
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          friction: 7,
          tension: 40,
          useNativeDriver: false,
        }).start();
      }

      pan.flattenOffset();

      if (onDragEnd) {
        const draggedItem = {
          card,
          source: 'table',
          player: currentPlayer,
          stackId,
          originalIndex: index
        };
        console.log(`[TableDraggableCard] 📤 Calling onDragEnd, handled: ${dropPosition.handled}, position: (${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)})`);
        onDragEnd(draggedItem, dropPosition);
      }

      setHasStartedDrag(false);
    },

    onPanResponderTerminate: () => {
      console.log(`[TableDraggableCard] ⚠️ Drag terminated for ${card.rank}${card.suit}`);
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
      pan.flattenOffset();
      setHasStartedDrag(false);
    }
  });

  // Handle external reset (server validation failures)
  useEffect(() => {
    if (triggerReset) {
      console.log(`[TableDraggableCard] ⚡ INSTANT RESET triggered for ${card.rank}${card.suit}`);
      pan.stopAnimation();
      pan.setValue({ x: 0, y: 0 });
      pan.flattenOffset();
      setHasStartedDrag(false);
    }
  }, [triggerReset, pan, card.rank, card.suit]);

  return (
    <Animated.View
      ref={cardRef}
      style={[
        styles.container,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y }
          ],
          zIndex: hasStartedDrag ? dragZIndex : 1,
        },
        hasStartedDrag && styles.dragging
      ]}
      {...panResponder.panHandlers}
    >
      <Card
        card={card}
        size={size}
        disabled={disabled}
        draggable={true}
      />
    </Animated.View>
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
