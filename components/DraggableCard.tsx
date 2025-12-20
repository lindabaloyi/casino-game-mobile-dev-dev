import React, { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet } from 'react-native';
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
  dragZIndex?: number; // Custom z-index for dragged cards (defaults to 9999)
  triggerReset?: boolean; // Trigger instant snap-back animation
}

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
  const pan = useRef(new Animated.ValueXY()).current;
  const [hasStartedDrag, setHasStartedDrag] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => draggable && !disabled,
    onMoveShouldSetPanResponder: (event, gestureState) => {
      const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
      return distance > 8; // 8 pixel threshold
    },

    onPanResponderGrant: () => {
      // Set initial offset - get current values
      const currentX = (pan.x as any)._value || 0;
      const currentY = (pan.y as any)._value || 0;
      pan.setOffset({
        x: currentX,
        y: currentY,
      });
      pan.setValue({ x: 0, y: 0 });
    },

    onPanResponderMove: (event, gestureState) => {
      const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);

      if (distance > 8 && !hasStartedDrag) {
        setHasStartedDrag(true);
        console.log(`[DraggableCard:DEBUG] 🏁 STARTED dragging ${card.rank}${card.suit} from ${source}`);
        console.log(`[DraggableCard:DEBUG] 📊 Current player: ${currentPlayer}, stackId: ${stackId}`);
        console.log(`[DraggableCard:DEBUG] 🎨 z-index will be set to: ${dragZIndex} (calculated overlay)`);

        // Notify parent component
        if (onDragStart) {
          onDragStart(card);
        }
      }

      if (hasStartedDrag) {
        // Update animated position
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: true, // ✅ Enable native driver for smooth animation
        })(event, gestureState);

        // Debug log position every few frames (reduce spam)
        if (Math.floor(Date.now() / 100) % 5 === 0) { // Every ~500ms
          console.log(`[DraggableCard:DEBUG] 📍 Drag position: (${gestureState.moveX.toFixed(1)}, ${gestureState.moveY.toFixed(1)})`);
        }

        // Notify parent of drag move
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

      // Store drop position globally for contact validation
      (global as any).lastDropPosition = dropPosition;

      // Debug: Check available drop zones
      console.log(`[DraggableCard:DEBUG] 🎯 Drop position: ${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)}`);
      console.log(`[DraggableCard:DEBUG] 🔍 Available drop zones:`, (global as any).dropZones?.length || 0);

      // Check global drop zones - PRIORITY-BASED SELECTION
      if ((global as any).dropZones && (global as any).dropZones.length > 0) {
        let bestZone = null;
        let highestPriority = -1;

        for (const zone of (global as any).dropZones) {
          const { x, y, width, height } = zone.bounds;

          // 🔥 CRITICAL FIX: Direct bounds check - NO tolerance expansion
          // Hand cards need precise hit detection for proper trail logic
          // Table cards already have expanded bounds in TableDraggableCard.tsx
          if (dropPosition.x >= x &&
              dropPosition.x <= x + width &&
              dropPosition.y >= y &&
              dropPosition.y <= y + height) {

            // PRIORITY-BASED: Higher priority wins (not distance!)
            const zonePriority = zone.priority || 0;
            if (zonePriority > highestPriority) {
              highestPriority = zonePriority;
              bestZone = zone;
              console.log(`[DraggableCard:DEBUG] 🎯 New best zone: ${zone.stackId} (priority: ${zonePriority})`);
            } else {
              console.log(`[DraggableCard:DEBUG] ❌ Lower priority zone rejected: ${zone.stackId} (priority: ${zonePriority} < ${highestPriority})`);
            }
          }
        }

        console.log(`[DraggableCard:DEBUG] 🏆 Best drop zone by PRIORITY:`, {
          zone: bestZone?.stackId || 'none',
          priority: highestPriority,
          totalZones: (global as any).dropZones.length
        });

        if (bestZone) {
          dropPosition.attempted = true;
          const draggedItem = {
            card,
            source,
            player: currentPlayer,
            stackId: stackId || undefined
          };

          const dropResult = bestZone.onDrop(draggedItem);

          if (dropResult) {
            // SPECIAL CASE: Table cards need different validation logic
            if (source === 'table') {
              console.log(`[DraggableCard:DEBUG] Table card drop - checking validation`);
              if (typeof dropResult === 'object') {
                // For table-to-table drops (dropping on another table card)
                if (dropResult.type === 'loose' && dropResult.card) {
                  dropPosition.handled = true;
                  dropPosition.targetType = 'loose';
                  dropPosition.targetCard = dropResult.card;
                  dropPosition.targetIndex = dropResult.index;
                  dropPosition.needsServerValidation = true; // Table-to-table needs server validation
                  console.log(`[DraggableCard:DEBUG] Table-to-table drop validated - handling drop`);
                } else if (dropResult.tableZoneDetected === true) {
                  // Table zone detected but no contact - still handle but mark for validation
                  dropPosition.handled = true;
                  dropPosition.targetType = dropResult.targetType;
                  dropPosition.targetCard = dropResult.targetCard;
                  dropPosition.tableZoneDetected = dropResult.tableZoneDetected;
                  dropPosition.needsServerValidation = true; // New flag
                  console.log(`[DraggableCard:DEBUG] Table card zone detected - needs server validation`);
                } else {
                  console.log(`[DraggableCard:DEBUG] Table card drop not validated - will trigger snap-back`);
                }
              } else {
                console.log(`[DraggableCard:DEBUG] Table card drop returned non-object - will trigger snap-back`);
              }
            } else {
              // Regular hand card drops - mark as handled normally
              dropPosition.handled = true;

              // ✅ CRITICAL FIX: Always set target info for staging operations
              if (typeof dropResult === 'object') {
                dropPosition.targetType = dropResult.type || dropResult.targetType;      // 'loose'
                dropPosition.targetCard = dropResult.card || dropResult.targetCard;     // The table card
                dropPosition.targetIndex = dropResult.index;                            // Card index
                dropPosition.draggedSource = dropResult.draggedSource;                  // 'hand'
                dropPosition.area = dropResult.area || 'table';                         // Drop area

                console.log(`[DraggableCard:DEBUG] ✅ Set dropPosition for hand card:`, {
                  targetType: dropPosition.targetType,
                  targetCard: dropPosition.targetCard ? `${dropPosition.targetCard.rank}${dropPosition.targetCard.suit}` : 'none',
                  handled: dropPosition.handled
                });
              }
            }
          }
        }
      }

      // Animate back if not handled, with special logic for table cards
      if (!dropPosition.handled) {
        if (source !== 'hand') {
          // Table cards ALWAYS snap back to original position when not handled
          // This prevents cards from staying in random positions on table
          console.log(`[DraggableCard:DEBUG] 🏠 Table card ${card.rank}${card.suit} snapping back to aligned position`);
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true, // ✅ Use native driver for smooth snap-back
          }).start();
        } else {
          // Hand cards snap back only if drop was attempted but failed
          // (attempted=true means valid drop zones existed but none accepted)
          if (dropPosition.attempted) {
            console.log(`[DraggableCard:DEBUG] 🏠 Hand card ${card.rank}${card.suit} attempted drop failed, snapping back`);
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true, // ✅ Use native driver for smooth snap-back
            }).start();
          }
        }
      }

      // Reset pan offset
      pan.flattenOffset();

      // Notify parent of drag end
      if (onDragEnd) {
        console.log(`[DraggableCard:DEBUG] 📤 CALLING onDragEnd with dropPosition:`, {
          handled: dropPosition.handled,
          targetType: dropPosition.targetType,
          targetCard: dropPosition.targetCard ? `${dropPosition.targetCard.rank}${dropPosition.targetCard.suit}` : 'none',
          tableZoneDetected: dropPosition.tableZoneDetected,
          contactValidated: dropPosition.contactValidated
        });
        const draggedItem = {
          card,
          source,
          player: currentPlayer,
          stackId: stackId || undefined
        };
        onDragEnd(draggedItem, dropPosition);
      }

      console.log(`[DraggableCard:DEBUG] 🛑 DRAG END: ${card.rank}${card.suit}, handled: ${dropPosition.handled}`);
      setHasStartedDrag(false);
    },

    onPanResponderTerminate: () => {
      // Reset on termination
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true, // ✅ Use native driver for smooth termination
      }).start();
      pan.flattenOffset();
      setHasStartedDrag(false);
    }
  });

  // Debug log when drag state changes (only on important state changes)
  React.useEffect(() => {
    if (hasStartedDrag) {
      console.log(`[DraggableCard:DEBUG] 🎯 DRAG START: ${card.rank}${card.suit} now z-index ${dragZIndex} (overlay active)`);
    }
  }, [hasStartedDrag, card.rank, card.suit, dragZIndex]);

  // Handle external trigger reset (server validation failures)
  React.useEffect(() => {
    if (triggerReset) {
      console.log(`[DraggableCard] ⚡ INSTANT RESET triggered for ${card.rank}${card.suit}`);
      // Cancel any ongoing animations and snap back immediately
      pan.stopAnimation();
      pan.setValue({ x: 0, y: 0 });
      pan.flattenOffset();
      setHasStartedDrag(false);
    }
  }, [triggerReset, pan, card.rank, card.suit]);

  return (
    <Animated.View
      style={[
        styles.draggableContainer,
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
