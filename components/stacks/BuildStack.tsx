import React from "react";
import { View } from "react-native";
/**
 * DEPRECATED: Drop zone system removed - builds now use contact detection only
 */
import { useLayoutMeasurement } from "../../hooks/useLayoutMeasurement";
import { CardType } from "../cards/card";
import { BuildIndicator } from "../indicators/BuildIndicator";
import { CardCountIndicator } from "../indicators/CardCountIndicator";
import BuildExtensionOverlay from "../overlays/BuildExtensionOverlay";
import BuildMergeOverlay from "../overlays/BuildMergeOverlay";
import TempOverlay from "../overlays/TempOverlay";
import { StackRenderer } from "./StackRenderer";

interface BuildStackProps {
  stackId: string;
  cards: CardType[];
  buildValue?: number;
  displayValue?: number;
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
  mergeMode?: boolean; // 🔀 NEW: Show "Merge" instead of "Accept" when true
  onMergeExtension?: () => void; // 🔀 NEW: Merge handler
  // NEW: Drag handlers for draggable builds
  onDragStart?: (card: CardType) => void;
  onDragEnd?: (draggedItem: any, dropPosition: any) => { validContact: boolean };
  onDragMove?: (card: CardType, position: { x: number; y: number }) => void;
  // NEW: Drag state for UI optimization
  isDragging?: boolean;
  onDragStateChange?: (isDragging: boolean) => void;
}

let buildStackRenderCount = 0;

/**
 * BuildStack - Component for build stacks
 * Handles build-specific drop zone registration and indicators
 * Uses StackRenderer for visual rendering
 */
const BuildStack: React.FC<BuildStackProps> = ({
  stackId,
  cards,
  buildValue,
  displayValue,
  stackOwner,
  onDropStack,
  currentPlayer = 0,
  dragSource = "table",
  dragZIndex,
  baseZIndex = 1,
  baseElevation = 1,
  // Overlay props
  showOverlay = false,
  overlayText = "BUILD",
  onAccept,
  onReject,
  // Build extension overlay props
  isPendingExtension = false,
  onAcceptExtension,
  onCancelExtension,
  mergeMode = false, // 🔀 NEW: Show "Merge" instead of "Accept" when true
  onMergeExtension, // 🔀 NEW: Merge handler
  // Drag handlers
  onDragStart,
  onDragEnd,
  onDragMove,
  // Drag state
  isDragging: externalIsDragging,
  onDragStateChange,
}) => {
  buildStackRenderCount++;
  console.log(`🏗️ BuildStack render #${buildStackRenderCount}`, {
    stackId,
    cardsLength: cards?.length,
    isPendingExtension,
    time: Date.now()
  });

  // Track internal drag state for UI optimization
  const [internalIsDragging, setInternalIsDragging] = React.useState(false);
  const isDragging = externalIsDragging !== undefined ? externalIsDragging : internalIsDragging;

  // Enhanced drag handlers that update internal state
  const handleDragStart = React.useCallback((card: CardType) => {
    setInternalIsDragging(true);
    onDragStateChange?.(true);
    onDragStart?.(card);
  }, [onDragStart, onDragStateChange]);

  const handleDragEnd = React.useCallback((draggedItem: any, dropPosition: any) => {
    setInternalIsDragging(false);
    onDragStateChange?.(false);
    return onDragEnd?.(draggedItem, dropPosition);
  }, [onDragEnd, onDragStateChange]);
  // Debug build dragging setup
  const isOpponentBuild = stackOwner !== currentPlayer;
  const willBeDraggable = isOpponentBuild;
  const hasDragHandlers = !!(onDragStart && onDragEnd);

  console.log('[BUILD_STACK] Build setup:', {
    stackId,
    stackOwner,
    currentPlayer,
    isOpponentBuild,
    willBeDraggable,
    hasDragHandlers,
    cardCount: cards.length,
    isPendingExtension,
    isDragging,
    overlayVisible: isPendingExtension && !isDragging,
    indicatorsVisible: !isDragging,
    dragSource
  });

  // DEPRECATED: Drop zone registration removed - builds now use contact detection only
  // Layout measurement still needed for contact detection positioning
  const { ref, measure } = useLayoutMeasurement(stackId, 0.15);

  return (
    <View
      ref={ref}
      onLayout={measure}
      style={{
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        padding: 4,
      }}
    >
      <StackRenderer
        cards={cards}
        draggable={stackOwner !== currentPlayer} // All opponent builds are draggable for overtake
        allowMultiCardDrag={true} // Builds can have multiple cards and still be draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragMove={onDragMove}
        currentPlayer={currentPlayer}
        dragSource={dragSource}
        stackId={stackId}
        dragZIndex={dragZIndex}
        baseZIndex={baseZIndex}
        baseElevation={baseElevation}
      />

      {/* Build value and owner indicators - hide when dragging for clean UX */}
      {!isDragging && (
        <BuildIndicator
          value={buildValue}
          displayValue={displayValue}
          owner={stackOwner}
        />
      )}

      {/* Card count indicator for builds with multiple cards - hide when dragging */}
      {!isDragging && (
        <CardCountIndicator count={cards.length} />
      )}

      {/* Build augmentation overlay */}
      <TempOverlay
        isVisible={showOverlay}
        tempId={stackId}
        overlayText={overlayText}
        onAccept={(id) => onAccept?.(id)}
        onReject={onReject || (() => {})}
      />

      {/* Build extension/merge overlay - conditional rendering based on merge mode */}
      {/* Hide overlay when dragging for clean overtake UX */}
      {mergeMode ? (
        <BuildMergeOverlay
          isVisible={isPendingExtension && !isDragging}
          buildId={stackId}
          extensionText="MERGE INTO BUILD"
          onMerge={() => onMergeExtension?.()}
          onCancel={() => onCancelExtension?.(stackId)}
        />
      ) : (
        <BuildExtensionOverlay
          isVisible={isPendingExtension && !isDragging}
          buildId={stackId}
          extensionText="EXTEND BUILD"
          onAccept={(id) => onAcceptExtension?.(id)}
          onCancel={() => onCancelExtension?.(stackId)}
          mergeMode={mergeMode}
        />
      )}
    </View>
  );
};

export default React.memo(BuildStack, (prev, next) => {
  // Only re-render if cards array or build state changes
  return (
    prev.cards === next.cards &&
    prev.isPendingExtension === next.isPendingExtension &&
    prev.buildValue === next.buildValue &&
    prev.showOverlay === next.showOverlay &&
    prev.isDragging === next.isDragging
  );
});
