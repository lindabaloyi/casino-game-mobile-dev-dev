import React from 'react';
import { View } from 'react-native';
import { DROP_ZONE_PRIORITIES } from '../../constants/dropZonePriorities';
import { useDropZoneRegistration } from '../../hooks/useDropZoneRegistration';
import { useLayoutMeasurement } from '../../hooks/useLayoutMeasurement';
import { CardType } from '../card';
import { BuildIndicator } from '../indicators/BuildIndicator';
import { StackRenderer } from './StackRenderer';

interface BuildStackProps {
  stackId: string;
  cards: CardType[];
  buildValue?: number;
  stackOwner?: number;
  onDropStack?: (draggedItem: any) => boolean | any;
  currentPlayer?: number;
  dragSource?: string;
  dragZIndex?: number;
  baseZIndex?: number;
  baseElevation?: number;
}

/**
 * BuildStack - Component for build stacks
 * Handles build-specific drop zone registration and indicators
 * Uses StackRenderer for visual rendering
 */
export const BuildStack: React.FC<BuildStackProps> = ({
  stackId,
  cards,
  buildValue,
  stackOwner,
  onDropStack,
  currentPlayer = 0,
  dragSource = 'table',
  dragZIndex,
  baseZIndex = 1,
  baseElevation = 1
}) => {
  // Use layout measurement hook with standard expansion
  const { ref, bounds, measure } = useLayoutMeasurement(stackId, 0.15);

  // Register drop zone for build stacks
  useDropZoneRegistration({
    stackId,
    bounds,
    priority: DROP_ZONE_PRIORITIES.BUILD,
    onDrop: onDropStack,
    zoneType: 'BUILD'
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
        draggable={false} // Builds are not directly draggable
        currentPlayer={currentPlayer}
        dragSource={dragSource}
        stackId={stackId}
        dragZIndex={dragZIndex}
        baseZIndex={baseZIndex}
        baseElevation={baseElevation}
      />

      {/* Build value and owner indicators */}
      <BuildIndicator
        value={buildValue}
        owner={stackOwner}
      />
    </View>
  );
};
