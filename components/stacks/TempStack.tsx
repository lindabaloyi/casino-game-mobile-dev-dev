import React from 'react';
import { View } from 'react-native';
import { useLayoutMeasurement } from '../../hooks/useLayoutMeasurement';
import { useCardContact } from '../../src/hooks/useCardContact';
import { CardType } from '../cards/card';
import { TempStackIndicator } from '../indicators/TempStackIndicator';
import { StackRenderer } from './StackRenderer';

interface TempStackProps {
  stackId: string;
  cards: CardType[];
  captureValue?: number;
  totalValue?: number;
  onDropStack?: (draggedItem: any) => boolean | any;
  onFinalizeStack?: (stackId: string) => void;
  onCancelStack?: (stackId: string) => void;
  currentPlayer?: number;
  dragSource?: string;
  dragZIndex?: number;
  baseZIndex?: number;
  baseElevation?: number;
  canAugmentBuilds?: boolean;
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => void;
}

/**
 * TempStack - Component for temporary stacks (staging stacks)
 * Uses larger expansion factor for easier drop zone hitting
 * Includes finalize/cancel actions and temp stack indicators
 */
export const TempStack: React.FC<TempStackProps> = ({
  stackId,
  cards,
  captureValue,
  totalValue,
  onDropStack,
  onFinalizeStack,
  onCancelStack,
  currentPlayer = 0,
  dragSource = 'table',
  dragZIndex,
  baseZIndex = 1,
  baseElevation = 1,
  canAugmentBuilds = false,
  onDragStart,
  onDragEnd
}) => {
  // Use layout measurement hook with LARGER expansion for temp stacks (50% vs 15%)
  const { ref, bounds, measure } = useLayoutMeasurement(stackId, 0.5);

  // Report temp stack position to contact detection system
  const { reportCardPosition } = useCardContact();

  React.useEffect(() => {
    if (bounds) {
      reportCardPosition(stackId, {
        id: stackId, // Now uses actual stack ID instead of drop zone ID
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        type: 'tempStack',
        data: { value: totalValue, canAugmentBuilds, cards } // Include stack data for drag handlers
      });
    }
  }, [stackId, bounds, reportCardPosition, totalValue, canAugmentBuilds, cards]);

  return (
    <View ref={ref} onLayout={measure} style={{
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
    }}>
      <StackRenderer
        cards={cards}
        draggable={canAugmentBuilds} // Temp stacks are draggable only when player can augment builds
        allowMultiCardDrag={canAugmentBuilds} // Allow multi-card temp stacks to be draggable for build augmentation
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        currentPlayer={currentPlayer}
        dragSource={dragSource}
        stackId={stackId}
        dragZIndex={dragZIndex}
        baseZIndex={baseZIndex}
        baseElevation={baseElevation}
      />

      {/* Temp stack value indicators */}
      <TempStackIndicator
        captureValue={captureValue}
        totalValue={totalValue}
      />
    </View>
  );
};
