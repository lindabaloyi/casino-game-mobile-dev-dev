import React from 'react';
import { View } from 'react-native';
import { DROP_ZONE_PRIORITIES } from '../../constants/dropZonePriorities';
import { useDropZoneRegistration } from '../../hooks/useDropZoneRegistration';
import { useLayoutMeasurement } from '../../hooks/useLayoutMeasurement';
import { CardType } from '../card';
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
  baseElevation = 1
}) => {
  // Use layout measurement hook with LARGER expansion for temp stacks (50% vs 15%)
  const { ref, bounds, measure } = useLayoutMeasurement(stackId, 0.5);

  // Register drop zone for temp stacks with higher priority
  useDropZoneRegistration({
    stackId,
    bounds,
    priority: DROP_ZONE_PRIORITIES.TEMP_STACK,
    onDrop: onDropStack,
    zoneType: 'TEMP_STACK'
  });

  return (
    <View ref={ref} onLayout={measure} style={{
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
    }}>
      <StackRenderer
        cards={cards}
        draggable={false} // Temp stacks are not directly draggable
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
