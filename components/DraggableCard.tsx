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
          useNativeDriver: false,
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

      // Check global drop zones
      if ((global as any).dropZones && (global as any).dropZones.length > 0) {
        let bestZone = null;
        let closestDistance = Infinity;

        for (const zone of (global as any).dropZones) {
          const { x, y, width, height } = zone.bounds;
          const tolerance = 50; // Increased tolerance for easier dropping
          const expandedBounds = {
            x: x - tolerance,
            y: y - tolerance,
            width: width + (tolerance * 2),
            height: height + (tolerance * 2)
          };

          // Check if drop position is inside expanded bounds
          if (dropPosition.x >= expandedBounds.x &&
              dropPosition.x <= expandedBounds.x + expandedBounds.width &&
              dropPosition.y >= expandedBounds.y &&
              dropPosition.y <= expandedBounds.y + expandedBounds.height) {

            const zoneCenter = {
              x: zone.bounds.x + zone.bounds.width / 2,
              y: zone.bounds.y + zone.bounds.height / 2
            };
            const distance = Math.sqrt(
              Math.pow(dropPosition.x - zoneCenter.x, 2) +
              Math.pow(dropPosition.y - zoneCenter.y, 2)
            );

            if (distance < closestDistance) {
              closestDistance = distance;
              bestZone = zone;
            }
          }
        }

        console.log(`[DraggableCard:DEBUG] 🏆 Best drop zone:`, bestZone?.stackId || 'none');

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
            // SPECIAL CASE: Table cards need contact validation
            if (source === 'table') {
              // Table cards: check for contact validation or proximity-based validation
              console.log(`[DraggableCard:DEBUG] Table card drop - checking validation`);
              if (typeof dropResult === 'object') {
                if (dropResult.contactValidated === true) {
                  dropPosition.handled = true;
                  dropPosition.targetType = dropResult.targetType;
                  dropPosition.targetCard = dropResult.targetCard;
                  console.log(`[DraggableCard:DEBUG] Table card contact validated - handling drop`);
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

              // Check if dropResult is an object with additional info
              if (typeof dropResult === 'object' && dropResult.targetType) {
                dropPosition.targetType = dropResult.targetType;
                dropPosition.targetCard = dropResult.targetCard;
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
            useNativeDriver: false,
          }).start();
        } else {
          // Hand cards snap back only if drop was attempted but failed
          // (attempted=true means valid drop zones existed but none accepted)
          if (dropPosition.attempted) {
            console.log(`[DraggableCard:DEBUG] 🏠 Hand card ${card.rank}${card.suit} attempted drop failed, snapping back`);
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
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
        useNativeDriver: false,
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
