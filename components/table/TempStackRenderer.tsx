/**
 * TempStackRenderer
 * Handles rendering and interaction for temporary stack items on the table
 * Extracted from TableCards.tsx to focus on temporary stack logic
 */

import { StyleSheet, View } from 'react-native';
import { TableCard } from '../../multiplayer/server/game-logic/game-state';
import CardStack from '../cards/CardStack';
import StagingOverlay from '../overlays/StagingOverlay';

interface TempStackRendererProps {
  tableItem: TableCard;
  index: number;
  baseZIndex: number;
  dragZIndex: number;
  currentPlayer: number;
  onDropStack: (draggedItem: any) => boolean | any;
  onFinalizeStack?: (stackId: string) => void;
  onCancelStack?: (stackId: string) => void;
  onStagingAccept?: (stackId: string) => void;  // ✅ Now triggers validation modal
  onStagingReject?: (stackId: string) => void;
  isDragging?: boolean; // Add drag state to hide overlay during drag
  onDragStart?: (card: any) => void; // For updating table drag state
  onDragEnd?: (draggedItem: any, dropPosition: any) => void; // For updating table drag state
}

export function TempStackRenderer({
  tableItem,
  index,
  baseZIndex,
  dragZIndex,
  currentPlayer,
  onDropStack,
  onFinalizeStack,
  onCancelStack,
  onStagingAccept,
  onStagingReject,
  isDragging = false,
  onDragStart,
  onDragEnd
}: TempStackRendererProps) {
  // Type assertion for temporary stack item
  const tempStackItem = tableItem as any; // Temporary stack has type: 'temporary_stack'

  const stackId = tempStackItem.stackId || `temp-${index}`;
  const tempStackCards = tempStackItem.cards || [];
  const isCurrentPlayerOwner = tempStackItem.owner === currentPlayer;
  // Check if this player has any builds they can augment (contextual capability)
  const canAugmentBuilds = tempStackItem.canAugmentBuilds || false;

  console.log(`[TEMP_STACK_RENDERER] 🎴 Rendering TEMPORARY STACKING STACK:`, {
    stackId: tempStackItem.stackId || stackId,
    owner: tempStackItem.owner,
    currentPlayer,
    isCurrentPlayerOwner,
    cardCount: tempStackCards.length,
    captureValue: tempStackItem.captureValue,
    stackValue: tempStackItem.value,
    cards: tempStackCards.map((c: any) => `${c.rank}${c.suit}(${c.source})`),
    index,
    baseZIndex,
    hasStagingCallbacks: !!(onStagingAccept && onStagingReject),
    hasLegacyCallbacks: !!(onFinalizeStack && onCancelStack),
    unlimitedStagingEnabled: true,
    canAugmentBuilds
  });

  // Contextual logging based on player's build augmentation capability
  if (canAugmentBuilds && isCurrentPlayerOwner) {
    console.log(`[UNIVERSAL_STAGING_UI] 🏗️ RENDERING ENHANCED STAGING STACK (with augmentation):`, {
      stackId: tempStackItem.stackId || stackId,
      player: currentPlayer,
      owner: tempStackItem.owner,
      value: tempStackItem.value,
      cards: tempStackCards.map((c: any) => `${c.rank}${c.suit}(${c.value})`),
      isDraggable: true,
      showsAcceptCancel: true,
      stagingType: 'enhanced',
      dragInstruction: 'Accept to capture, or drag onto your build to augment'
    });
  } else if (isCurrentPlayerOwner) {
    console.log(`[UNIVERSAL_STAGING_UI] 📦 RENDERING BASIC STAGING STACK (capture only):`, {
      stackId: tempStackItem.stackId || stackId,
      player: currentPlayer,
      owner: tempStackItem.owner,
      value: tempStackItem.value,
      cards: tempStackCards.map((c: any) => `${c.rank}${c.suit}(${c.value})`),
      isDraggable: false,
      showsAcceptCancel: true,
      stagingType: 'basic',
      instruction: 'Accept to capture combination'
    });
  }
  console.log(`🎯 [STAGING_DEBUG] TEMP STACK ${index} READY: Can accept unlimited loose card drops`);

  if (isCurrentPlayerOwner) {
    console.log(`[TEMP_STACK_RENDERER] 👑 Player owns this stack - showing STAGING OVERLAY with Accept/Cancel buttons`, {
      stackId,
      player: currentPlayer,
      overlayEnabled: true,
      stackCards: tempStackCards.length,
      stagingSource: tempStackCards.length > 1 ? 'table-to-loose-drop' : 'unknown'
    });
    console.log(`🎯 [STAGING_DEBUG] STAGING OVERLAY SHOULD APPEAR for stack ${stackId} - Accept/Cancel buttons visible`);
  } else {
    console.log(`[TEMP_STACK_RENDERER] 👀 Player does NOT own this stack - NO overlay shown`, {
      stackId,
      owner: tempStackItem.owner,
      currentPlayer,
      overlayEnabled: false
    });
  }

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
        totalValue={tempStackItem.value} // Shows total sum of card values
        onFinalizeStack={onFinalizeStack}
        onCancelStack={onCancelStack}
        baseZIndex={baseZIndex}
        baseElevation={1}
        dragZIndex={dragZIndex}
        // Pass build augmentation capability for contextual dragging
        canAugmentBuilds={canAugmentBuilds}
      />
      {/* Show staging overlay only for player's own temporary stacks, hidden during drag */}
      {isCurrentPlayerOwner && (
        <StagingOverlay
          isVisible={!isDragging}
          stackId={tempStackItem.stackId || stackId}
          onAccept={() => {
            console.log(`[UNIVERSAL_STAGING_UI] 📨 ACCEPT callback triggered for stack ${stackId}`, {
              stackId,
              callingOnStagingAccept: !!onStagingAccept,
              callbackType: 'onStagingAccept',
              canAugmentBuilds,
              stagingType: canAugmentBuilds ? 'enhanced' : 'basic',
              action: 'capture_combination',
              timestamp: Date.now()
            });

            onStagingAccept?.(stackId);
          }}
          onReject={() => {
            console.log(`[UNIVERSAL_STAGING_UI] 📨 CANCEL callback triggered for stack ${stackId}`, {
              stackId,
              callingOnStagingReject: !!onStagingReject,
              callbackType: 'onStagingReject',
              canAugmentBuilds,
              stagingType: canAugmentBuilds ? 'enhanced' : 'basic',
              action: 'cancel_staging',
              cardsReturned: tempStackCards.length,
              timestamp: Date.now()
            });

            onStagingReject?.(stackId);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stagingStackContainer: {
    position: 'relative' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const
  }
});
