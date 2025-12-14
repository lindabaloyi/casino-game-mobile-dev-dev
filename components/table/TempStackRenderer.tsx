/**
 * TempStackRenderer
 * Handles rendering and interaction for temporary stack items on the table
 * Extracted from TableCards.tsx to focus on temporary stack logic
 */

import { StyleSheet, View } from 'react-native';
import { TableCard } from '../../multiplayer/server/game-logic/game-state';
import CardStack from '../CardStack';
import StagingOverlay from '../StagingOverlay';

interface TempStackRendererProps {
  tableItem: TableCard;
  index: number;
  baseZIndex: number;
  dragZIndex: number;
  currentPlayer: number;
  onDropStack: (draggedItem: any) => boolean;
  onFinalizeStack?: (stackId: string) => void;
  onCancelStack?: (stackId: string) => void;
  onStagingAccept?: (stackId: string) => void;
  onStagingReject?: (stackId: string) => void;
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
  onStagingReject
}: TempStackRendererProps) {
  // Type assertion for temporary stack item
  const tempStackItem = tableItem as any; // Temporary stack has type: 'temporary_stack'

  const stackId = tempStackItem.stackId || `temp-${index}`;
  const tempStackCards = tempStackItem.cards || [];
  const isCurrentPlayerOwner = tempStackItem.owner === currentPlayer;

  console.log(`[TEMP_STACK_RENDERER] 🎴 Rendering TEMPORARY STACKING STACK:`, {
    stackId: tempStackItem.stackId || stackId,
    dropZoneId: `temp-${index}`, // This is what drop zones use
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
    unlimitedStagingEnabled: true
  });
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
        stackId={`temp-${index}`} // Force simple temp-{index} format for drop zones
        cards={tempStackCards}
        onDropStack={onDropStack}
        isBuild={false}
        currentPlayer={currentPlayer}
        isTemporaryStack={true}
        stackOwner={tempStackItem.owner}
        captureValue={tempStackItem.captureValue}
        onFinalizeStack={onFinalizeStack}
        onCancelStack={onCancelStack}
        style={{ zIndex: baseZIndex }}
        dragZIndex={dragZIndex}
      />
      {/* Show staging overlay only for player's own temporary stacks */}
      {isCurrentPlayerOwner && (
        <StagingOverlay
          isVisible={true}
          stackId={tempStackItem.stackId || stackId}
          onAccept={() => {
            console.log(`[TEMP_STACK_RENDERER] 📨 ACCEPT callback triggered for stack ${stackId}`, {
              stackId,
              callingOnStagingAccept: !!onStagingAccept,
              callbackType: 'onStagingAccept',
              timestamp: Date.now()
            });
            onStagingAccept?.(stackId);
          }}
          onReject={() => {
            console.log(`[TEMP_STACK_RENDERER] 📨 CANCEL callback triggered for stack ${stackId}`, {
              stackId,
              callingOnStagingReject: !!onStagingReject,
              callbackType: 'onStagingReject',
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
