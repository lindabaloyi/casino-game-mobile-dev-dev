/**
 * TempStackRenderer
 * Handles rendering and interaction for temporary stack items on the table
 * Extracted from TableCards.tsx to focus on temporary stack logic
 */

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

export function TempStackRenderer({
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
}: TempStackRendererProps) {
  // Type assertion for temporary stack item
  const tempStackItem = tableItem as any; // Temporary stack has type: 'temporary_stack'

  const stackId = tempStackItem.stackId || `temp-${index}`;
  const tempStackCards = tempStackItem.cards || [];
  const isCurrentPlayerOwner = tempStackItem.owner === currentPlayer;
  // Check if this player has any builds they can augment (contextual capability)
  const canAugmentBuilds = tempStackItem.canAugmentBuilds || false;

  // 🔍 CLIENT-SIDE DEBUGGING: Log when component receives new props
  console.log('[CLIENT_DEBUG] 🎯 TempStackRenderer RENDER TRIGGERED:', {
    stackId: tempStackItem.stackId || `temp-${index}`,
    renderTimestamp: Date.now(),
    propsChanged: {
      displayValue: tempStackItem.displayValue,
      buildValue: tempStackItem.buildValue,
      segmentCount: tempStackItem.segmentCount,
      isValid: tempStackItem.isValid,
      isBuilding: tempStackItem.isBuilding,
      cardsCount: tempStackCards.length,
      tableItemKeys: Object.keys(tempStackItem)
    },
    componentState: {
      isCurrentPlayerOwner,
      canAugmentBuilds,
      isDragging
    }
  });

  console.log(`[TEMP_STACK_RENDERER] 🎴 Rendering TEMPORARY STACKING STACK:`, {
    stackId: tempStackItem.stackId || stackId,
    owner: tempStackItem.owner,
    currentPlayer,
    isCurrentPlayerOwner,
    cardCount: tempStackCards.length,
    captureValue: tempStackItem.captureValue,
    stackValue: tempStackItem.value,
    buildCalculatorFields: {
      displayValue: tempStackItem.displayValue,
      buildValue: tempStackItem.buildValue,
      runningSum: tempStackItem.runningSum,
      segmentCount: tempStackItem.segmentCount,
      isValid: tempStackItem.isValid,
      isBuilding: tempStackItem.isBuilding
    },
    cards: tempStackCards.map((c: any) => `${c.rank}${c.suit}(${c.source})`),
    index,
    baseZIndex,
    hasTempCallbacks: !!(onTempAccept && onTempReject),
    hasLegacyCallbacks: !!(onFinalizeStack && onCancelStack),
    unlimitedStagingEnabled: true,
    canAugmentBuilds
  });

  // Log display value propagation
  const totalValueForIndicator = tempStackItem.displayValue || tempStackItem.value;
  console.log(`[DISPLAY_VALUE_PROPAGATION] 📤 SERVER → CLIENT: TempStackRenderer passing totalValue to TempStackIndicator`, {
    stackId: tempStackItem.stackId || stackId,
    serverDisplayValue: tempStackItem.displayValue,
    serverValue: tempStackItem.value,
    totalValuePassed: totalValueForIndicator,
    passedFrom: tempStackItem.displayValue !== undefined ? 'displayValue' : 'value (fallback)',
    buildCalculatorUsed: tempStackItem.displayValue !== undefined
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
            console.log(`[UNIVERSAL_TEMP_UI] 📨 ACCEPT callback triggered for temp ${stackId}`, {
              tempId: stackId,
              callingOnTempAccept: !!onTempAccept,
              callbackType: 'onTempAccept',
              canAugmentBuilds,
              tempType: canAugmentBuilds ? 'enhanced' : 'basic',
              action: 'capture_combination',
              timestamp: Date.now()
            });

            onTempAccept?.(stackId);
          }}
          onReject={() => {
            console.log(`[UNIVERSAL_TEMP_UI] 📨 CANCEL callback triggered for temp ${stackId}`, {
              tempId: stackId,
              callingOnTempReject: !!onTempReject,
              callbackType: 'onTempReject',
              canAugmentBuilds,
              tempType: canAugmentBuilds ? 'enhanced' : 'basic',
              action: 'cancel_temp',
              cardsReturned: tempStackCards.length,
              timestamp: Date.now()
            });

            onTempReject?.(stackId);
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
