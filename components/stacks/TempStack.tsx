import React from "react";
import { View } from "react-native";
import { useLayoutMeasurement } from "../../hooks/useLayoutMeasurement";
import { useCardContact } from "../../src/hooks/useCardContact";
import { CardType } from "../cards/card";
import { TempStackIndicator } from "../indicators/TempStackIndicator";
import { StackRenderer } from "./StackRenderer";

interface TempStackProps {
  stackId: string;
  cards: CardType[];
  captureValue?: number;
  totalValue?: number;
  displayValue?: number; // Calculated build display value for rule engine
  buildValue?: number; // Calculated build value for rule engine
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
  displayValue,
  buildValue,
  onDropStack,
  onFinalizeStack,
  onCancelStack,
  currentPlayer = 0,
  dragSource = "table",
  dragZIndex,
  baseZIndex = 1,
  baseElevation = 1,
  canAugmentBuilds = false,
  onDragStart,
  onDragEnd,
}) => {
  // Dynamic expansion factor for temp stacks: base 50% + 10% per card over 4
  // This ensures drop zones grow as stacks get taller
  const baseExpansion = 0.5;
  const extraExpansionPerCard = 0.1;
  const cardCount = cards.length;
  const dynamicExpansion =
    cardCount > 4
      ? baseExpansion + extraExpansionPerCard * (cardCount - 4)
      : baseExpansion;

  console.log(`[TempStack] 📏 Dynamic expansion for ${stackId}:`, {
    cardCount,
    baseExpansion: `${(baseExpansion * 100).toFixed(0)}%`,
    dynamicExpansion: `${(dynamicExpansion * 100).toFixed(0)}%`,
    totalExpansion: `${(dynamicExpansion * 2 * 100).toFixed(0)}% wider/taller`,
  });

  const { ref, bounds, measure } = useLayoutMeasurement(
    stackId,
    dynamicExpansion,
  );

  // Report temp stack position to contact detection system
  const { reportCardPosition, removeCardPosition } = useCardContact();

  React.useEffect(() => {
    if (bounds) {
      reportCardPosition(stackId, {
        id: stackId, // Now uses actual stack ID instead of drop zone ID
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        type: "tempStack",
        data: {
          displayValue, // Calculated build display value for rule engine
          buildValue, // Calculated build value for rule engine
          captureValue, // Explicit capture value
          value: totalValue, // Fallback total value
          canAugmentBuilds,
          cards,
        }, // Include all build values for rule engine evaluation
      });
    }

    // ✅ CLEANUP: Remove position when component unmounts or stackId changes
    return () => {
      removeCardPosition(stackId);
    };
  }, [
    stackId,
    bounds,
    reportCardPosition,
    removeCardPosition,
    totalValue,
    displayValue,
    buildValue,
    captureValue,
    canAugmentBuilds,
    cards,
  ]);

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
      <TempStackIndicator captureValue={captureValue} totalValue={totalValue} />
    </View>
  );
};
