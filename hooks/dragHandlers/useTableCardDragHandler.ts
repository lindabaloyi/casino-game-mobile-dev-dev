/**
 * Table Card Drag Handler
 * Handles table card drag operations: build augmentation and table-to-table drops
 */

import { useCallback } from 'react';
import { GameState } from '../../multiplayer/server/game-logic/game-state';



interface TableCardDragHandlerProps {
  gameState: GameState;
  playerNumber: number;
  isMyTurn: boolean;
  sendAction: (action: any) => void;
  gameId?: number; // Add gameId prop
}

/**
 * Hook for handling table card drag operations
 */
export function useTableCardDragHandler({
  gameState,
  playerNumber,
  isMyTurn,
  sendAction
}: TableCardDragHandlerProps) {

  /**
   * Handle build augmentation drag end
   */
  const handleBuildAugmentationDragEnd = useCallback((
    draggedItem: any,
    contact: any
  ): boolean => {
    console.log(`[BUILD-AUGMENT-DRAG] 🏗️ Build augmentation drag end:`, {
      stackId: draggedItem.stackId,
      buildId: contact.id,
      stackValue: draggedItem.value
    });

    if (!isMyTurn) {
      console.log(`[BUILD-AUGMENT-DRAG] ❌ Not your turn for build augmentation`);
      return false;
    }

    // Find the temp stack in game state to get complete data
    const tempStack = gameState.tableCards.find(tc =>
      (tc as any).type === 'temporary_stack' && (tc as any).stackId === draggedItem.stackId
    ) as any;

    if (!tempStack) {
      console.log(`[BUILD-AUGMENT-DRAG] ❌ Temp stack not found:`, draggedItem.stackId);
      return false;
    }

    if (!tempStack.canAugmentBuilds) {
      console.log(`[BUILD-AUGMENT-DRAG] ❌ Temp stack cannot augment builds:`, draggedItem.stackId);
      return false;
    }

    console.log(`[BUILD-AUGMENT-DRAG] ✅ Found valid augmentation stack:`, {
      stackId: tempStack.stackId,
      stackValue: tempStack.value,
      canAugmentBuilds: tempStack.canAugmentBuilds
    });

    // Client-side validation: temp stack value must match build value
    const build = contact.data;
    if (!build || tempStack.value !== build.value) {
      console.log(`[BUILD-AUGMENT-DRAG] ❌ Value validation failed:`, {
        tempStackValue: tempStack.value,
        buildValue: build?.value,
        match: tempStack.value === build?.value
      });
      return false;
    }

    console.log(`[BUILD-AUGMENT-DRAG] ✅ Validation passed - sending validateBuildAugmentation`);

    const action = {
      type: 'validateBuildAugmentation',
      payload: {
        buildId: contact.id,
        tempStackId: draggedItem.stackId
      }
    };

    sendAction(action);
    return true; // Success
  }, [sendAction, gameState, isMyTurn]);

  /**
   * Handle table card drag end with contact detection
   */
  const handleTableCardDragEnd = useCallback((
    draggedItem: any,
    dropPosition: { x: number; y: number; handled?: boolean; contactDetected?: boolean; contact?: any }
  ) => {
    // === FRONTEND DRAG DEBUG ===
    console.log('[FRONTEND] Table card drag end:', {
      draggedItem: {
        card: draggedItem.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
        stackId: draggedItem.stackId,
        originalIndex: draggedItem.originalIndex,
        source: draggedItem.source
      },
      dropPosition: {
        x: Math.round(dropPosition.x),
        y: Math.round(dropPosition.y),
        contactDetected: dropPosition.contactDetected,
        hasContact: !!dropPosition.contact
      },
      gameState: {
        tableCardsCount: gameState.tableCards?.length || 0,
        currentPlayer: gameState.currentPlayer
      }
    });

    // Use contact from TableDraggableCard if already detected, otherwise find it
    let contact = dropPosition.contact;

    // Special case: Allow build owners to augment their builds even when it's not their turn
    let allowAction = isMyTurn; // Default: only allow on your turn

    if (contact?.type === 'build') {
      const build = contact.data;
      if (build && build.owner === playerNumber) {
        allowAction = true; // Build owners can always augment their builds
      }
    }

    if (!allowAction) {
      return;
    }
    if (!contact && dropPosition.contactDetected) {
      return;
    }

    if (contact) {
      const isLooseCard = draggedItem.stackId && typeof draggedItem.stackId === 'string' && draggedItem.stackId.startsWith('loose-');
      const isTempStack = draggedItem.stackId && typeof draggedItem.stackId === 'string' && !draggedItem.stackId.startsWith('loose-');

      if (contact.type === 'build') {
        if (isLooseCard) {
          const build = contact.data;
          if (build && build.owner !== playerNumber) {
            return;
          }
          const action = {
            type: 'addToOwnBuild',
            payload: {
              draggedItem: { card: draggedItem.card, source: 'table' },
              buildToAddTo: build
            }
          };
          sendAction(action);
          return;
        } else if (isTempStack) {
          handleBuildAugmentationDragEnd(draggedItem, contact);
          return;
        }
      }

      if (contact.type === 'tempStack') {
        // Use our enhanced temp stack contact detection
        const { handleTempStackContact } = require('../../src/utils/contactHandlers/tempStackHandler');
        const action = handleTempStackContact(
          draggedItem.card,
          contact,
          gameState,
          playerNumber,
          'table'
        );
        if (action) {
          sendAction(action);
          return;
        }
      }

      if (contact.type === 'card') {
        const targetCard = contact.data;
        if (targetCard) {
          const action = {
            type: 'tableToTableDrop',
            payload: {
              draggedItem: draggedItem,
              targetInfo: {
                card: targetCard,
                type: 'loose',
                index: contact.data.index
              }
            }
          };
          sendAction(action);
          return;
        }
      }
    }
  }, [sendAction, isMyTurn, handleBuildAugmentationDragEnd, playerNumber, gameState]);

  return {
    handleTableCardDragEnd
  };
}
