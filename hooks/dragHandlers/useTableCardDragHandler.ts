/**
 * Table Card Drag Handler
 * Handles table card drag operations: build augmentation and table-to-table drops
 */

import { useCallback } from "react";
import { GameState } from "../../multiplayer/server/game-logic/game-state";

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
  sendAction,
}: TableCardDragHandlerProps) {
  /**
   * Handle build augmentation drag end
   */
  const handleBuildAugmentationDragEnd = useCallback(
    (draggedItem: any, contact: any): boolean => {
      console.log(`[BUILD-AUGMENT-DRAG] 🏗️ Build augmentation drag end:`, {
        stackId: draggedItem.stackId,
        buildId: contact.id,
        stackValue: draggedItem.value,
      });

      if (!isMyTurn) {
        console.log(
          `[BUILD-AUGMENT-DRAG] ❌ Not your turn for build augmentation`,
        );
        return false;
      }

      // Find the temp stack in game state to get complete data
      const tempStack = gameState.tableCards.find(
        (tc) =>
          (tc as any).type === "temporary_stack" &&
          (tc as any).stackId === draggedItem.stackId,
      ) as any;

      if (!tempStack) {
        console.log(
          `[BUILD-AUGMENT-DRAG] ❌ Temp stack not found:`,
          draggedItem.stackId,
        );
        return false;
      }

      if (!tempStack.canAugmentBuilds) {
        console.log(
          `[BUILD-AUGMENT-DRAG] ❌ Temp stack cannot augment builds:`,
          draggedItem.stackId,
        );
        return false;
      }

      console.log(`[BUILD-AUGMENT-DRAG] ✅ Found valid augmentation stack:`, {
        stackId: tempStack.stackId,
        stackValue: tempStack.value,
        canAugmentBuilds: tempStack.canAugmentBuilds,
      });

      // Client-side validation: temp stack value must match build value
      const build = contact.data;
      if (!build || tempStack.value !== build.value) {
        console.log(`[BUILD-AUGMENT-DRAG] ❌ Value validation failed:`, {
          tempStackValue: tempStack.value,
          buildValue: build?.value,
          match: tempStack.value === build?.value,
        });
        return false;
      }

      console.log(
        `[BUILD-AUGMENT-DRAG] ✅ Validation passed - sending validateBuildAugmentation`,
      );

      const action = {
        type: "validateBuildAugmentation",
        payload: {
          buildId: contact.id,
          tempStackId: draggedItem.stackId,
        },
      };

      sendAction(action);
      return true; // Success
    },
    [sendAction, gameState, isMyTurn],
  );

  /**
   * Handle table card drag end with contact detection
   * Returns whether a valid contact was made (for UI positioning)
   */
  const handleTableCardDragEnd = useCallback(
    (
      draggedItem: any,
      dropPosition: {
        x: number;
        y: number;
        handled?: boolean;
        contactDetected?: boolean;
        contact?: any;
      },
    ): { validContact: boolean } => {
      // === FRONTEND DRAG DEBUG ===
      console.log("[FRONTEND] Table card drag end:", {
        draggedItem: {
          card: draggedItem.card
            ? `${draggedItem.card.rank}${draggedItem.card.suit}`
            : "none",
          stackId: draggedItem.stackId,
          originalIndex: draggedItem.originalIndex,
          source: draggedItem.source,
        },
        dropPosition: {
          x: Math.round(dropPosition.x),
          y: Math.round(dropPosition.y),
          contactDetected: dropPosition.contactDetected,
          hasContact: !!dropPosition.contact,
        },
        gameState: {
          tableCardsCount: gameState.tableCards?.length || 0,
          currentPlayer: gameState.currentPlayer,
        },
      });

      // Use contact from TableDraggableCard if already detected, otherwise find it
      let contact = dropPosition.contact;

      // Special case: Allow build owners to augment their builds even when it's not their turn
      let allowAction = isMyTurn; // Default: only allow on your turn

      if (contact?.type === "build") {
        const build = contact.data;
        if (build && build.owner === playerNumber) {
          allowAction = true; // Build owners can always augment their builds
        }
      }

      if (!allowAction) {
        return { validContact: false };
      }
      if (!contact && dropPosition.contactDetected) {
        return { validContact: false };
      }

      if (contact) {
        const isLooseCard =
          draggedItem.stackId &&
          typeof draggedItem.stackId === "string" &&
          draggedItem.stackId.startsWith("loose-");
        const isTempStack =
          draggedItem.stackId &&
          typeof draggedItem.stackId === "string" &&
          !draggedItem.stackId.startsWith("loose-");

        if (contact.type === "build") {
          if (isLooseCard) {
            const build = contact.data;
            if (build && build.owner !== playerNumber) {
              return { validContact: false };
            }
            const action = {
              type: "addToOwnBuild",
              payload: {
                draggedItem: { card: draggedItem.card, source: "table" },
                buildToAddTo: build,
              },
            };
            sendAction(action);
            return { validContact: true };
          } else if (isTempStack) {
            const success = handleBuildAugmentationDragEnd(
              draggedItem,
              contact,
            );
            return { validContact: success };
          }
        }

        if (contact.type === "tempStack") {
          // Handle dropping table cards onto temp stacks
          const tempStack = gameState.tableCards.find(
            (tc) =>
              (tc as any).type === "temporary_stack" &&
              (tc as any).stackId === contact.id,
          ) as any;

          if (!tempStack) {
            console.log(`[TABLE-DRAG] ❌ Temp stack not found: ${contact.id}`);
            return { validContact: false };
          }

          // Check ownership
          if (tempStack.owner !== playerNumber) {
            console.log(
              `[TABLE-DRAG] ❌ Temp stack not owned by player: ${contact.id}`,
            );
            return { validContact: false };
          }

          // Prevent temp-to-temp (if dragging from another temp stack)
          const isDraggingFromTemp =
            draggedItem.stackId &&
            typeof draggedItem.stackId === "string" &&
            !draggedItem.stackId.startsWith("loose-") &&
            draggedItem.stackId !== contact.id;

          if (isDraggingFromTemp) {
            console.log(
              `[TABLE-DRAG] ❌ Cannot drag from one temp stack to another`,
            );
            return { validContact: false };
          }

          console.log(
            `[TABLE-DRAG] ✅ Adding table card to temp stack: ${contact.id}`,
          );

          const action = {
            type: "addToOwnTemp",
            payload: {
              stackId: contact.id,
              card: draggedItem.card,
              source: "table",
            },
          };

          sendAction(action);
          return { validContact: true };
        }

        if (contact.type === "card") {
          const targetCard = contact.data;
          if (targetCard) {
            const action = {
              type: "tableToTableDrop",
              payload: {
                draggedItem: draggedItem,
                targetInfo: {
                  card: targetCard,
                  type: "loose",
                  index: contact.data.index,
                },
              },
            };
            sendAction(action);
            return { validContact: true };
          }
        }
      }

      // Default fallback - no valid contact made
      return { validContact: false };
    },
    [
      sendAction,
      isMyTurn,
      handleBuildAugmentationDragEnd,
      playerNumber,
      gameState,
    ],
  );

  return {
    handleTableCardDragEnd,
  };
}
