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
    console.log(`[TABLE-DRAG] 🎯 Table card drag end:`, {
      card: `${draggedItem.card.rank}${draggedItem.card.suit}`,
      dropPosition: `(${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)})`,
      source: draggedItem.source,
      handled: dropPosition.handled,
      contactDetected: dropPosition.contactDetected,
      stackId: draggedItem.stackId
    });

    // Use contact from TableDraggableCard if already detected, otherwise find it
    let contact = dropPosition.contact;

    // Special case: Allow build owners to augment their builds even when it's not their turn
    let allowAction = isMyTurn; // Default: only allow on your turn

    if (contact?.type === 'build') {
      const build = contact.data;
      if (build && build.owner === playerNumber) {
        console.log(`[TABLE-DRAG] 🏗️ Build owner (${playerNumber}) can augment their build anytime`);
        allowAction = true; // Build owners can always augment their builds
      }
    }

    if (!allowAction) {
      console.log(`[TABLE-DRAG] ❌ Not your turn and not augmenting your own build`);
      return;
    }
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

      const isLooseCard = draggedItem.stackId && typeof draggedItem.stackId === 'string' && draggedItem.stackId.startsWith('loose-');
      const isTempStack = draggedItem.stackId && typeof draggedItem.stackId === 'string' && !draggedItem.stackId.startsWith('loose-');

      if (contact.type === 'build') {
        if (isLooseCard) {
          console.log(`[TABLE-DRAG] 🏗️ Loose card dropped on build - direct addition (no staging).`);
          const build = contact.data;
          if (build && build.owner !== playerNumber) {
            console.log(`[TABLE-DRAG] ❌ Cannot augment opponent's build.`);
            return;
          }
          const action = {
            type: 'addToOwnBuild',  // Direct addition like hand cards
            payload: {
              draggedItem: { card: draggedItem.card, source: 'table' },
              buildToAddTo: build
            }
          };
          console.log(`[TABLE-DRAG] 🚀 Sending addToOwnBuild action for table card.`);
          sendAction(action);
          return;
        } else if (isTempStack) {
          const success = handleBuildAugmentationDragEnd(draggedItem, contact);
          if (success) {
            console.log(`[TABLE-DRAG] ✅ Build augmentation successful`);
          } else {
            console.log(`[TABLE-DRAG] ❌ Build augmentation failed - cleaning up`);
          }
          return;
        }
      }

      if (contact.type === 'card') {
        console.log(`[TABLE-DRAG] 🏗️ Table-to-table drop detected`);
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
                index: contact.data.index
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
  }, [sendAction, isMyTurn, handleBuildAugmentationDragEnd, playerNumber]);

  return {
    handleTableCardDragEnd
  };
}
