import React from 'react';
import { View } from 'react-native';
/**
 * DEPRECATED: Drop zone system removed - builds now use contact detection only
 */
import { useLayoutMeasurement } from '../../hooks/useLayoutMeasurement';
import { CardType } from '../cards/card';
import { BuildIndicator } from '../indicators/BuildIndicator';
import { CardCountIndicator } from '../indicators/CardCountIndicator';
import TempOverlay from '../overlays/TempOverlay';
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
  // NEW: Overlay support for pending extensions
  showOverlay?: boolean;
  overlayText?: string;
  onAccept?: (buildId: string) => void;
  onReject?: () => void;
  // NEW: Build extension overlay
  isPendingExtension?: boolean;
  onAcceptExtension?: (buildId: string) => void;
  onCancelExtension?: (buildId: string) => void;
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
  baseElevation = 1,
  // Overlay props
  showOverlay = false,
  overlayText = 'BUILD',
  onAccept,
  onReject,
  // Build extension overlay props
  isPendingExtension = false,
  onAcceptExtension,
  onCancelExtension
}) => {
  // DEPRECATED: Drop zone registration removed - builds now use contact detection only
  // Layout measurement still needed for contact detection positioning
  const { ref, measure } = useLayoutMeasurement(stackId, 0.15);

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

      {/* Card count indicator for builds with multiple cards */}
      <CardCountIndicator count={cards.length} />

      {/* Build augmentation overlay */}
      <TempOverlay
        isVisible={showOverlay}
        tempId={stackId}
        overlayText={overlayText}
        onAccept={(id) => onAccept?.(id)}
        onReject={onReject || (() => {})}
      />

      {/* Build extension overlay - similar to temp overlay but for build extensions */}
      <TempOverlay
        isVisible={isPendingExtension}
        tempId={stackId}
        overlayText="EXTEND"
        onAccept={(id) => onAcceptExtension?.(id)}
        onReject={() => onCancelExtension?.(stackId)}
      />
    </View>
  );
};
