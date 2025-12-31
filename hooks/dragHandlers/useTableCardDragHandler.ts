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
    console.log(`[TABLE-DRAG] 🎯 Table card drag end:`, {
      card: `${draggedItem.card.rank}${draggedItem.card.suit}`,
      dropPosition: `(${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)})`,
      source: draggedItem.source,
      handled: dropPosition.handled,
      contactDetected: dropPosition.contactDetected,
      stackId: draggedItem.stackId
    });

    if (!isMyTurn) {
      console.log(`[TABLE-DRAG] ❌ Not your turn for table drag`);
      return;
    }

    // Use contact from TableDraggableCard if already detected, otherwise find it
    let contact = dropPosition.contact;
    if (!contact && dropPosition.contactDetected) {
      // If contact was detected but not provided, we need to find it
      // This should be handled by the component, but fallback here
      console.log(`[TABLE-DRAG] ⚠️ Contact detected but not provided - this should be fixed`);
      return;
    }

    if (contact) {
      console.log(`[TABLE-DRAG] ✅ Found contact for table drop:`, {
        id: contact.id,
        type: contact.type,
        distance: Math.round(contact.distance)
      });

      // Check if this is a temp stack being dragged to a build (build augmentation)
      if (contact.type === 'build' && draggedItem.stackId) {
        const success = handleBuildAugmentationDragEnd(draggedItem, contact);
        if (success) {
          console.log(`[TABLE-DRAG] ✅ Build augmentation successful`);
          return;
        } else {
          console.log(`[TABLE-DRAG] ❌ Build augmentation failed - cleaning up`);
          return;
        }
      }

      // For table-to-table drops, create a temp stack
      if (contact.type === 'card') {
        console.log(`[TABLE-DRAG] 🏗️ Table-to-table drop detected`);

        // Get the touched card from contact data
        const targetCard = contact.data;
        if (targetCard) {
          console.log(`[TABLE-DRAG] 📦 Creating temp stack from:`, {
            dragged: `${draggedItem.card.rank}${draggedItem.card.suit}`,
            target: `${targetCard.rank}${targetCard.suit}`
          });

          const action = {
            type: 'tableToTableDrop',
            payload: {
              draggedItem: draggedItem,
              targetInfo: {
                card: targetCard,
                type: 'loose',
                index: contact.data.index // Use the index from contact data
              }
            }
          };

          console.log(`[TABLE-DRAG] 🚀 Sending table-to-table action:`, action.type);
          sendAction(action);
          return;
        }
      }
    } else {
      console.log(`[TABLE-DRAG] ❌ No contact found for table drop - snapping back`);
    }

    // If no valid contact, just clean up (handled by parent component)
  }, [sendAction, isMyTurn, handleBuildAugmentationDragEnd]);

  return {
    handleTableCardDragEnd
  };
}
