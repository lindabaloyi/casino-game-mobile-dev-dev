/**
 * BuildCardRenderer
 * Handles rendering and interaction for build items on the table
 * Extracted from TableCards.tsx to focus on build logic
 */

import React, { useRef } from "react";
import { View } from "react-native";
import { useBuildContactRegistration, useBuildDropHandler } from "../../hooks";
import { TableCard } from "../../multiplayer/server/game-logic/game-state";
import { CardType } from "../cards/card";
import { BuildStack } from "../stacks/BuildStack";

interface BuildCardRendererProps {
  tableItem: TableCard;
  index: number;
  baseZIndex: number;
  dragZIndex: number;
  currentPlayer: number;
  onDropStack?: (draggedItem: any) => boolean | any; // Made optional since we'll handle it internally
  sendAction?: (action: any) => void; // Add sendAction for direct server communication
  // Overlay support for build augmentation
  showOverlay?: boolean;
  onAcceptBuildAddition?: (buildId: string) => void;
  onRejectBuildAddition?: () => void;
  // Overlay support for build extensions
  onAcceptBuildExtension?: (buildId: string) => void;
  onCancelBuildExtension?: (buildId: string) => void;
}

export function BuildCardRenderer({
  tableItem,
  index,
  baseZIndex,
  dragZIndex,
  currentPlayer,
  onDropStack,
  sendAction,
  // Overlay props
  showOverlay = false,
  onAcceptBuildAddition,
  onRejectBuildAddition,
  // Extension overlay props
  onAcceptBuildExtension,
  onCancelBuildExtension,
}: BuildCardRendererProps) {
  // Type assertion for build item
  const buildItem = tableItem as any; // Build has type: 'build' with additional properties
  const stackId = buildItem.buildId; // ✅ Use actual build ID instead of render index
  const stackRef = useRef<View>(null);

  // Build items can have multiple cards, or a single card representation
  // When in pending extension, show preview cards to visualize the extension
  const buildCards = buildItem.isPendingExtension
    ? buildItem.previewCards || buildItem.cards || [tableItem as CardType]
    : buildItem.cards || [tableItem as CardType];

  // Extracted hooks for cleaner separation of concerns
  useBuildDropHandler({
    buildItem,
    currentPlayer,
    sendAction: sendAction || (() => {}), // Provide fallback to avoid undefined
  });

  // Extracted contact registration hook
  useBuildContactRegistration({
    buildItem,
    stackRef: stackRef as React.RefObject<View>, // Cast to remove null possibility
  });

  // Handle build addition acceptance
  const handleAcceptBuildAddition = React.useCallback(() => {
    if (sendAction) {
      console.log(
        `[BUILD_ADDITION] Accepting build addition for build ${stackId}`,
      );
      sendAction({
        type: "acceptBuildAddition",
        payload: { buildId: stackId },
      });
    }
  }, [sendAction, stackId]);

  return (
    <View ref={stackRef}>
      <BuildStack
        key={`table-build-${index}`}
        stackId={stackId}
        cards={buildCards}
        buildValue={
          buildItem.isPendingExtension
            ? buildItem.previewValue
            : buildItem.value
        }
        displayValue={buildItem.displayValue}
        stackOwner={buildItem.owner}
        currentPlayer={currentPlayer}
        // Overlay props for build additions
        showOverlay={showOverlay}
        overlayText="BUILD"
        onAccept={handleAcceptBuildAddition}
        onReject={onRejectBuildAddition}
        // Overlay props for build extensions
        isPendingExtension={buildItem.isPendingExtension}
        onAcceptExtension={onAcceptBuildExtension}
        onCancelExtension={onCancelBuildExtension}
        baseZIndex={baseZIndex}
        baseElevation={1}
      />
    </View>
  );
}
