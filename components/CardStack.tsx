import { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Card, { CardType } from './card';
import DraggableCard from './DraggableCard';

interface CardStackProps {
  stackId: string;
  cards: CardType[];
  onDropStack?: (draggedItem: any) => boolean | any;
  buildValue?: number;
  isBuild?: boolean;
  draggable?: boolean;
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => void;
  onDragMove?: (card: CardType, position: { x: number; y: number }) => void;
  currentPlayer?: number;
  dragSource?: string;
  isTemporaryStack?: boolean;
  stackOwner?: number;
  onFinalizeStack?: (stackId: string) => void;
  onCancelStack?: (stackId: string) => void;
  captureValue?: number; // For temp stacks: shows the value to capture with
  totalValue?: number; // For temp stacks: shows total sum of card values
  style?: any; // For custom styles like z-index
  dragZIndex?: number; // Z-index for dragged cards from this stack
  baseZIndex?: number; // Base z-index for stacking context management
  baseElevation?: number; // Base elevation for Android stacking context management
}

const CardStack = memo<CardStackProps>(({
  stackId,
  cards,
  onDropStack,
  buildValue,
  isBuild = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragMove,
  currentPlayer = 0,
  dragSource = 'table',
  isTemporaryStack = false,
  stackOwner,
  onFinalizeStack,
  onCancelStack,
  captureValue,
  totalValue,
  style,
  dragZIndex,
  baseZIndex = 1,
  baseElevation = 1
}) => {
  const stackRef = useRef<View>(null);
  const [isLayoutMeasured, setIsLayoutMeasured] = useState(false);
  const [dropZoneBounds, setDropZoneBounds] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false); // Stacking context drag state

  // Register drop zone only after layout is measured with valid bounds
  useEffect(() => {
    if (!isLayoutMeasured || !dropZoneBounds || !onDropStack) return;

    // Initialize global registry if needed
    if (!(global as any).dropZones) {
      (global as any).dropZones = [];
    }

    const dropZone = {
      stackId,
      bounds: dropZoneBounds,
      onDrop: (draggedItem: any) => {
        console.log('[DROP ZONE HIT]', {
          stackId,
          bounds: dropZoneBounds,
          draggedCardId: draggedItem?.card?.id,
          source: draggedItem?.source
        });

        console.log(`[CardStack] ${stackId} received drop:`, draggedItem);
        // Staging fix: track last active drop zone
        (global as any).lastDropZoneId = stackId;
        if (onDropStack) {
          console.log(`[CardStack] ${stackId} calling onDropStack`);
          return onDropStack(draggedItem);
        } else {
          console.log(`[CardStack] ${stackId} ERROR: onDropStack is undefined/falsy`);
          return false;
        }
      }
    };

    // Remove existing zone and add new one
    (global as any).dropZones = (global as any).dropZones.filter(
      (zone: any) => zone.stackId !== stackId
    );
    (global as any).dropZones.push(dropZone);

    console.log(`[CardStack:DEBUG] 📍 Drop zone registered for ${stackId}:`, dropZoneBounds);

    return () => {
      // Cleanup drop zone on unmount
      if ((global as any).dropZones) {
        (global as any).dropZones = (global as any).dropZones.filter(
          (zone: any) => zone.stackId !== stackId
        );
      }
    };
  }, [stackId, onDropStack, isLayoutMeasured, dropZoneBounds]);

  const handleLayout = (event: any) => {
    if (!onDropStack || !stackRef.current) return;

    const { width, height } = event.nativeEvent.layout;

    // Measure position on screen with retry logic for invalid measurements
    stackRef.current.measureInWindow((pageX, pageY, measuredWidth, measuredHeight) => {
      // Skip invalid measurements (often happen on first render)
      if (pageX === 0 && pageY === 0) {
        console.log(`[CardStack] Skipping invalid measurement for ${stackId}, will retry`);
        // Retry measurement after a short delay
        setTimeout(() => {
          if (stackRef.current) {
            stackRef.current.measureInWindow((retryX, retryY, retryWidth, retryHeight) => {
              if (retryX !== 0 || retryY !== 0) {
                console.log(`[CardStack] Retry measurement successful for ${stackId}`);
                updateDropZoneBounds(retryX, retryY, measuredWidth, measuredHeight);
              } else {
                console.log(`[CardStack] Retry measurement also invalid for ${stackId}`);
              }
            });
          }
        }, 100);
        return;
      }

      updateDropZoneBounds(pageX, pageY, measuredWidth, measuredHeight);
    });
  };

  const updateDropZoneBounds = (pageX: number, pageY: number, width: number, height: number) => {
    // Expand bounds by 15% on each side for easier dropping
    const newBounds = {
      x: pageX - (width * 0.15),
      y: pageY - (height * 0.15),
      width: width * 1.3,  // 30% total expansion
      height: height * 1.3
    };

    setDropZoneBounds(newBounds);
    setIsLayoutMeasured(true);
    console.log(`[CardStack] Measured bounds for ${stackId}:`, newBounds);
  };

  // Show only the top card for visual simplicity on mobile
  const topCard = cards[cards.length - 1];
  const cardCount = cards.length;

  // Stacking context drag event handlers
  const handleCardDragStart = () => {
    console.log(`[CardStack] 🎯 DRAG START: ${stackId} setting z-index to 99999, elevation to 999`);
    setIsDragging(true);
  };

  const handleCardDragEnd = () => {
    console.log(`[CardStack] 🛑 DRAG END: ${stackId} resetting z-index to ${baseZIndex}, elevation to ${baseElevation}`);
    setIsDragging(false);
  };

  console.log(`[CardStack:DEBUG] 🧱 Rendering ${stackId}:`, {
    isTemporaryStack,
    owner: stackOwner,
    currentPlayer,
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

  return (
    <View ref={stackRef} style={[styles.stackContainer, style, dynamicStyle]} onLayout={handleLayout}>
      {topCard && (
        draggable && cardCount === 1 ? (
          <DraggableCard
            card={topCard}
            onDragStart={(card) => {
              handleCardDragStart(); // Update CardStack z-index first
              onDragStart?.(card);    // Then call parent's handler
            }}
            onDragEnd={(draggedItem, dropPosition) => {
              handleCardDragEnd();   // Reset CardStack z-index first
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
            style={styles.stackTouchable}
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
        )
      )}

      {/* Build value indicator */}
      {isBuild && buildValue !== undefined && (
        <View style={styles.buildValueContainer}>
          <Text style={styles.buildValueText}>{buildValue}</Text>
        </View>
      )}

      {/* Card count indicator for stacks with multiple cards */}
      {cardCount > 1 && !isTemporaryStack && (
        <View style={styles.cardCountContainer}>
          <Text style={styles.cardCountText}>{cardCount}</Text>
        </View>
      )}

      {/* Capture value indicator for temporary stacks */}
      {isTemporaryStack && captureValue !== undefined && (
        <View style={styles.captureValueContainer}>
          <Text style={styles.captureValueText}>{captureValue}</Text>
        </View>
      )}

      {/* Total value indicator for temporary stacks */}
      {isTemporaryStack && totalValue !== undefined && (
        <View style={styles.totalValueContainer}>
          <Text style={styles.totalValueText}>{totalValue}</Text>
        </View>
      )}


    </View>
  );
});

const styles = StyleSheet.create({
  stackContainer: {
    position: 'relative',
    // Dynamic z-index for stacking context management (set via dynamicStyle)
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  stackTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildValueContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFD700', // Gold
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#B8860B',
  },
  buildValueText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardCountContainer: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    backgroundColor: '#2196F3', // Blue
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  cardCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  captureValueContainer: {
    position: 'absolute',
    bottom: -8,
    right: -8,  // Opposite corner from card count
    backgroundColor: '#9C27B0', // Purple
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  captureValueText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  totalValueContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#9C27B0', // Purple
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  totalValueText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

});

export default CardStack;
