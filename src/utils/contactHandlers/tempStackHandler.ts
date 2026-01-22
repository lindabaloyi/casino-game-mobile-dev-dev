/**
 * Enhanced Temp Contact Handler
 * Handles BOTH creation (loose card contact) and addition (temp stack contact)
 */

import type {
  Card,
  GameState,
} from "../../../multiplayer/server/game-logic/game-state";
import { findLooseCardById, findTempStackById } from "../contactUtils";

interface Contact {
  id: string;
  type: string;
  distance: number;
  data?: any;
}

/**
 * Check if table item is a temp stack
 */
function isTempStack(item: any): boolean {
  return item?.type === "temporary_stack" || item?.type === "tempStack" || item?.type === "temp_stack";
}

/**
 * Enhanced Temp Contact Handler
 */
export function handleTempStackContact(
  draggedCard: Card,
  contact: Contact,
  gameState: GameState,
  currentPlayer: number,
  source?: string,
): { type: string; payload?: any; message?: string } | null {
  // SCENARIO 1: Contact with EXISTING TEMP (Addition Flow or Capture)
  if (contact.type === "tempStack" || contact.type === "temporary_stack") {
    console.log(`[TEMP_STACK_HANDLER] 🎯 Found temp stack contact: type=${contact.type}, id=${contact.id}`);
    const tempStack = findTempStackById(contact.id, gameState);

    if (!tempStack) {
      console.log(`[TEMP_STACK_HANDLER] ❌ Temp stack not found for id: ${contact.id}`);
      return null;
    }

    console.log(`[TEMP_STACK_HANDLER] ✅ Found temp stack: ${tempStack.stackId}, owner=${tempStack.owner}, currentPlayer=${currentPlayer}`);

    // Ownership check
    if (tempStack.owner !== currentPlayer) {
      return null;
    }

    // Prevent temp-to-temp
    const draggedFromTemp = isCardInTemp(draggedCard, gameState);
    if (draggedFromTemp) {
      return null;
    }

    // 🎯 CLIENT-SIDE VALIDATION: Prevent multiple hand card actions on temp stacks per turn
    // This must come BEFORE capture/add logic to block ALL hand card usage after first use
    if (source === "hand") {
      console.log(`[TEMP_STACK_HANDLER] 🔍 Checking hand card usage for temp stacks this turn:`, {
        currentPlayer,
        tempStackHandCardUsedThisTurn: gameState.tempStackHandCardUsedThisTurn?.[currentPlayer],
        source
      });

      if (gameState.tempStackHandCardUsedThisTurn?.[currentPlayer]) {
        console.log(`[TEMP_STACK_HANDLER] ❌ CLIENT VALIDATION FAILED: Already used hand card for temp stacks this turn`);
        return {
          type: 'validation_error',
          message: 'Cannot use multiple hand cards on temp stacks in the same turn. You must resolve your temp stack or wait for your next turn.'
        };
      }
    }

    // 🎯 CAPTURE CHECK: If dragged card value equals temp stack value, capture instead of adding
    if (source === "hand" && draggedCard.value === tempStack.value) {
      console.log(
        "[TEMP_STACK_CONTACT] 🎯 Direct capture detected - card matches temp stack value",
        {
          draggedCard: `${draggedCard.rank}${draggedCard.suit}(val:${draggedCard.value})`,
          tempStackValue: tempStack.value,
          tempStackCards: tempStack.cards?.length || 0,
          stackId: tempStack.stackId,
        },
      );

      return {
        type: "capture",
        payload: {
          tempStackId: tempStack.stackId,
          captureValue: draggedCard.value,
          targetCards: [...(tempStack.cards || []), draggedCard], // All stack cards + capturing card
          capturingCard: draggedCard,
        },
      };
    }

    // Default: Add to existing temp stack
    return {
      type: "addToOwnTemp",
      payload: {
        stackId: tempStack.stackId,
        card: draggedCard,
        source: source,
      },
    };
  }

  // SCENARIO 2: Contact with LOOSE CARD (Creation Flow)
  if (contact.type === "loose" || contact.type === "card") {
    const targetCard = findLooseCardById(contact.id, gameState);

    if (!targetCard) {
      return null;
    }

    // Prevent dragging card onto itself
    if (
      draggedCard.rank === targetCard.rank &&
      draggedCard.suit === targetCard.suit
    ) {
      return null;
    }

    // Check if player already has active temp
    const existingTemp = findActiveTemp(gameState, currentPlayer);
    if (existingTemp) {
      return null;
    }

    // Prevent using cards already in temps
    const draggedFromTemp = isCardInTemp(draggedCard, gameState);
    if (draggedFromTemp) {
      return null;
    }

    const isTableToTable = source === "table";
    const sourceLocation = isTableToTable ? "table" : "hand";

    return {
      type: "createTemp",
      payload: {
        cards: [targetCard, draggedCard], // Target first, dragged second
        isTableToTable,
        sourceLocation,
        playerIndex: currentPlayer,
        // Note: gameId will be added by the action router
        // Optional metadata for debugging
        targetCard,
        draggedCard: draggedCard,
      },
    };
  }

  return null;
}

// Helper functions
function isCardInTemp(card: Card, gameState: GameState): boolean {
  return gameState.tableCards.some((tc: any) => {
    if (!isTempStack(tc)) return false;
    return (tc.cards || []).some(
      (c: any) => c.rank === card.rank && c.suit === card.suit,
    );
  });
}

function findActiveTemp(gameState: GameState, playerIndex: number): any {
  return gameState.tableCards.find((tc: any) => {
    if (!isTempStack(tc)) return false;
    return tc.owner === playerIndex;
  });
}
