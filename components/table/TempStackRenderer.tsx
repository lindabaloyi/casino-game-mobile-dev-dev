/**
 * TempStackRenderer
 * Handles rendering and interaction for temporary stack items on the table
 * Extracted from TableCards.tsx to focus on temporary stack logic
 * OPTIMIZED: Memoized to prevent unnecessary re-renders
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TableCard } from '../../multiplayer/server/game-logic/game-state';
import CardStack from '../cards/CardStack';
import TempOverlay from '../overlays/TempOverlay';

interface TempStackRendererProps {
  tableItem: TableCard;
  index: number;
  baseZIndex: number;
  dragZIndex: number;
  currentPlayer: number;
  onDropStack: (draggedItem: any) => boolean | any;
  onFinalizeStack?: (stackId: string) => void;
  onCancelStack?: (stackId: string) => void;
  onTempAccept?: (tempId: string) => void;  // ✅ Now triggers validation modal
  onTempReject?: (tempId: string) => void;
  isDragging?: boolean; // Add drag state to hide overlay during drag
  onDragStart?: (card: any) => void; // For updating table drag state
  onDragEnd?: (draggedItem: any, dropPosition: any) => void; // For updating table drag state
}

const TempStackRendererComponent = ({
  tableItem,
  index,
  baseZIndex,
  dragZIndex,
  currentPlayer,
  onDropStack,
  onFinalizeStack,
  onCancelStack,
  onTempAccept,
  onTempReject,
  isDragging = false,
  onDragStart,
  onDragEnd
}: TempStackRendererProps) => {
  // Type assertion for temporary stack item
  const tempStackItem = tableItem as any; // Temporary stack has type: 'temporary_stack'

  const stackId = tempStackItem.stackId || `temp-${index}`;
  const tempStackCards = tempStackItem.cards || [];
  const isCurrentPlayerOwner = tempStackItem.owner === currentPlayer;
  // Check if this player has any builds they can augment (contextual capability)
  const canAugmentBuilds = tempStackItem.canAugmentBuilds || false;

  return (
    <View key={`staging-container-${index}`} style={styles.stagingStackContainer}>
      <CardStack
        stackId={stackId} // Use actual stack ID instead of drop zone ID
        cards={tempStackCards}
        onDropStack={onDropStack}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        isBuild={false}
        currentPlayer={currentPlayer}
        isTemporaryStack={true}
        stackOwner={tempStackItem.owner}
        totalValue={tempStackItem.displayValue || tempStackItem.value} // Shows build calculator value
        displayValue={tempStackItem.displayValue} // Pass calculated build values for contact detection
        buildValue={tempStackItem.buildValue}
        captureValue={tempStackItem.captureValue}
        onFinalizeStack={onFinalizeStack}
        onCancelStack={onCancelStack}
        baseZIndex={baseZIndex}
        baseElevation={1}
        dragZIndex={dragZIndex}
        // Pass build augmentation capability for contextual dragging
        canAugmentBuilds={canAugmentBuilds}
      />
      {/* Show temp overlay only for player's own temporary stacks, hidden during drag */}
      {isCurrentPlayerOwner && (
        <TempOverlay
          isVisible={!isDragging}
          tempId={tempStackItem.stackId || stackId}
          onAccept={() => {
            onTempAccept?.(stackId);
          }}
          onReject={() => {
            onTempReject?.(stackId);
          }}
        />
      )}
    </View>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const TempStackRenderer = React.memo(TempStackRendererComponent);

const styles = StyleSheet.create({
  stagingStackContainer: {
    position: 'relative' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const
  }
});
