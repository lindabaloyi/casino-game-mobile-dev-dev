import React from 'react';
import { View } from 'react-native';
import { DROP_ZONE_PRIORITIES } from '../../constants/dropZonePriorities';
import { useDropZoneRegistration } from '../../hooks/useDropZoneRegistration';
import { useLayoutMeasurement } from '../../hooks/useLayoutMeasurement';
import { CardType } from '../card';
import { CardCountIndicator } from '../indicators/CardCountIndicator';
import { StackRenderer } from './StackRenderer';

interface RegularStackProps {
  stackId: string;
  cards: CardType[];
  onDropStack?: (draggedItem: any) => boolean | any;
  draggable?: boolean;
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => void;
  onDragMove?: (card: CardType, position: { x: number; y: number }) => void;
  currentPlayer?: number;
  dragSource?: string;
  dragZIndex?: number;
  baseZIndex?: number;
  baseElevation?: number;
}

/**
 * RegularStack - Component for regular card stacks (loose cards)
 * Handles drop zone registration and layout measurement
 * Uses StackRenderer for visual rendering
 */
export const RegularStack: React.FC<RegularStackProps> = ({
  stackId,
  cards,
  onDropStack,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragMove,
  currentPlayer = 0,
  dragSource = 'table',
  dragZIndex,
  baseZIndex = 1,
  baseElevation = 1
}) => {
  // Use layout measurement hook with standard expansion
  const { ref, bounds, measure } = useLayoutMeasurement(stackId, 0.15);

  // Register drop zone for loose cards
  useDropZoneRegistration({
    stackId,
    bounds,
    priority: DROP_ZONE_PRIORITIES.LOOSE_CARD,
    onDrop: onDropStack,
    zoneType: 'LOOSE_CARD'
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
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragMove={onDragMove}
        currentPlayer={currentPlayer}
        dragSource={dragSource}
        stackId={stackId}
        dragZIndex={dragZIndex}
        baseZIndex={baseZIndex}
        baseElevation={baseElevation}
      />

      {/* Card count indicator for multi-card stacks */}
      <CardCountIndicator count={cards.length} />
    </View>
  );
};
