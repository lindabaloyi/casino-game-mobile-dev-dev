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

  console.log(`[TempStackRenderer] Rendering temp stack:`, {
    stackId: tempStackItem.stackId || stackId,
    owner: tempStackItem.owner,
    currentPlayer,
    isCurrentPlayerOwner,
    cardCount: tempStackCards.length,
    captureValue: tempStackItem.captureValue,
    cards: tempStackCards.map((c: any) => `${c.rank}${c.suit}`)
  });

  return (
    <View key={`staging-container-${index}`} style={styles.stagingStackContainer}>
      <CardStack
        stackId={tempStackItem.stackId || stackId}
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
            console.log(`[TempStackRenderer] Staging accept pressed for ${stackId}`);
            onStagingAccept?.(stackId);
          }}
          onReject={() => {
            console.log(`[TempStackRenderer] Staging reject pressed for ${stackId}`);
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
