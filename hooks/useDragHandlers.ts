import { useCallback, useState } from 'react';
import { Card, GameState } from '../multiplayer/server/game-logic/game-state';

// Type definitions for drag operations and UI
interface DraggedItem {
  card: Card;
  source: string;
  player?: number;
}

interface TargetInfo {
  type: string;
  card?: Card;
  stackId?: string;
  build?: any;
  stack?: any;
  index?: number;
  area?: string;
}

interface ModalInfo {
  visible: boolean;
  title: string;
  message: string;
}

interface DragTurnState {
  isMyTurn: boolean;
  currentPlayer: number;
}

/**
 * Custom hook to manage all drag and drop behavior in GameBoard
 * Consolidates drag state and handlers for cleaner component separation
 */
export function useDragHandlers({
  gameState,
  playerNumber,
  sendAction,
  setCardToReset,
  setErrorModal
}: {
  gameState: GameState;
  playerNumber: number;
  sendAction: (action: any) => void;
  setCardToReset: (card: { rank: string; suit: string } | null) => void;
  setErrorModal: (modal: ModalInfo | null) => void;
}) {
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragTurnState, setDragTurnState] = useState<DragTurnState | null>(null);

  const isMyTurn = gameState.currentPlayer === playerNumber;

  const handleDragStart = useCallback((card: any) => {
    console.log(`[GameBoard] handleDragStart: isMyTurn=${isMyTurn}, card=${card?.rank}${card?.suit}`);
    if (!isMyTurn) {
      console.log(`[GameBoard] Not my turn, ignoring drag start`);
      return;
    }
    // Store turn state at drag start to prevent race conditions
    setDragTurnState({ isMyTurn: true, currentPlayer: gameState.currentPlayer });
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn, gameState.currentPlayer]);

  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
    setIsDragging(false);
  }, []);

  const handleDropOnCard = useCallback((draggedItem: any, targetInfo: any) => {
    console.log(`🏆 [STAGING_DEBUG] Card dropped - START:`, {
      draggedCard: draggedItem.card.rank + draggedItem.card.suit,
      source: draggedItem.source,
      targetType: targetInfo.type,
      targetArea: targetInfo.area,
      isMyTurn,
      currentPlayer: gameState.currentPlayer,
      targetCard: targetInfo.card ? targetInfo.card.rank + targetInfo.card.suit : 'none',
      targetIndex: targetInfo.index,
      timestamp: Date.now()
    });

    // 🔍 DETECT STAGING DROP early
    const isStagingDrop = (draggedItem.source === 'hand' || draggedItem.source === 'table') && targetInfo.type === 'loose';
    const isAutoValidDrop = !isStagingDrop; // Regular drops can be validated immediately

    console.log(`🔍 [STAGING_DEBUG] Drop analysis:`, {
      isStagingDrop,
      isAutoValidDrop,
      draggedSource: draggedItem.source,
      targetType: targetInfo.type,
      draggedCardValue: draggedItem.card.value,
      targetCardValue: targetInfo.card ? targetInfo.card.value : 'none',
      combinedValue: targetInfo.card ? draggedItem.card.value + targetInfo.card.value : 'n/a'
    });

    if (isStagingDrop) {
      console.log(`🎯 [STAGING_DEBUG] STAGING DROP DETECTED: ${draggedItem.card.rank}${draggedItem.card.suit} → loose ${targetInfo.card.rank}${targetInfo.card.suit}`);
      console.log(`🎯 [STAGING_DEBUG] STAGING: Will send to server for validation - DO NOT validate locally!`);
      console.log(`🎯 [STAGING_DEBUG] STAGING PAYLOAD PREP:`, {
        draggedItem: {
          card: `${draggedItem.card.rank}${draggedItem.card.suit}`,
          source: draggedItem.source,
          player: draggedItem.player
        },
        targetInfo: {
          type: targetInfo.type,
          card: targetInfo.card ? `${targetInfo.card.rank}${targetInfo.card.suit}` : null,
          index: targetInfo.index,
          draggedSource: draggedItem.source
        }
      });
    } else if (isAutoValidDrop) {
      console.log(`✅ [STAGING_DEBUG] REGULAR VALID DROP: ${draggedItem.card.rank}${draggedItem.card.suit} → ${targetInfo.type} - validating locally`);
    }

    if (!isMyTurn) {
      setErrorModal({ visible: true, title: 'Not Your Turn', message: 'Please wait for your turn.' });
      return false;
    }

    // Track this card as the one being dropped (for potential instant reset)
    setCardToReset({
      rank: draggedItem.card.rank,
      suit: draggedItem.card.suit
    });

    // Send raw drop event to server
    const actionPayload = {
      type: 'card-drop',
      payload: {
        draggedItem,
        targetInfo: {
          ...targetInfo,
          draggedSource: draggedItem.source // Add draggedSource for staging logic
        },
        requestId: Date.now() // For matching responses
      }
    };

    console.log(`[DRAG_HANDLERS] 📤 SENDING TO SERVER - Potential Staging Action:`, {
      draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
      draggedSource: draggedItem.source,
      targetType: targetInfo.type,
      targetCard: targetInfo.card ? `${targetInfo.card.rank}${targetInfo.card.suit}` : 'null',
      hasStagingPotential: (draggedItem.source === 'hand' && targetInfo.type === 'loose'),
      payloadDraggedSource: actionPayload.payload.targetInfo.draggedSource
    });

    console.log('[STAGING DROP SENT TO SERVER]', {
      source: draggedItem.source,
      targetType: targetInfo.type,
      draggedCardId: draggedItem.card.id,
      targetCardId: targetInfo.card?.id
    });

    console.log(`[DRAG_HANDLERS] 🔍 DEBUG: Sending card-drop action to server`, {
      actionType: 'card-drop',
      draggedItem: {
        card: `${draggedItem.card.rank}${draggedItem.card.suit}`,
        source: draggedItem.source,
        player: draggedItem.player
      },
      targetInfo: {
        type: targetInfo.type,
        card: targetInfo.card ? `${targetInfo.card.rank}${targetInfo.card.suit}` : null,
        index: targetInfo.index,
        draggedSource: draggedItem.source
      },
      requestId: actionPayload.payload.requestId
    });

    sendAction(actionPayload);

    return true;
  }, [isMyTurn, gameState.currentPlayer, setCardToReset, setErrorModal, sendAction]);

  const handleTableCardDragStart = useCallback((card: any) => {
    console.log(`🎴 Table drag start: ${card.rank}${card.suit}`);
    if (!isMyTurn) {
      console.log(`❌ Not your turn - ignoring table drag`);
      return;
    }
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn]);

  const handleTableCardDragEnd = useCallback((draggedItem: { card: any; source?: string }, dropPosition: any) => {
    console.log(`🌟 [TableDrag] Table card drag end:`, draggedItem, dropPosition);
    console.log(`🌟 [TableDrag] Dragged card: ${draggedItem.card.rank}${draggedItem.card.suit}`);
    console.log(`🌟 [TableDrag] Drop position handled: ${dropPosition.handled}`);

    setDraggedCard(null);
    setIsDragging(false);

    // Handle table-to-table drops through Phase 2 system
    if (dropPosition.handled) {
      console.log(`🌟 [TableDrag] Table card drop was handled by a zone`, {
        handled: dropPosition.handled,
        zoneHandledBy: 'unknown'
      });

      // Check if this drop needs server validation (table zone detected but contact not validated)
      if (dropPosition.tableZoneDetected) {
        console.log(`🌟 [TableDrag] 🎯 STAGING DROP DETECTED - table zone detected flagged for server validation`, {
          draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit} (val:${draggedItem.card.value})`,
          targetType: dropPosition.targetType,
          needsServerValidation: dropPosition.needsServerValidation || false
        });

        // Route through Phase 2 card-drop event for server-centric validation
        if (dropPosition.targetType === 'loose' && dropPosition.targetCard) {
          console.log(`🌟 [TableDrag] 🎴 STAGING: Loose card-to-loose card drop potential - sending to server`, {
            draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit} (val:${draggedItem.card.value})`,
            targetCard: `${dropPosition.targetCard.rank}${dropPosition.targetCard.suit} (val:${dropPosition.targetCard.value})`,
            combinedValue: draggedItem.card.value + dropPosition.targetCard.value
          });

          // Find target card index for proper server validation
          const targetIndex = gameState.tableCards.findIndex((card: any) => {
            // Check if it's a loose card (no type property or type === 'loose')
            const isLooseCard = 'rank' in card && 'suit' in card && (!('type' in card) || (card as any).type === 'loose');
            if (isLooseCard) {
              return (card as any).rank === dropPosition.targetCard.rank &&
                     (card as any).suit === dropPosition.targetCard.suit;
            }
            return false;
          });

          console.log(`🌟 [TableDrag] Target card index found: ${targetIndex}`, {
            searchCriteria: `${dropPosition.targetCard.rank}${dropPosition.targetCard.suit}`,
            foundAtIndex: targetIndex,
            totalTableCards: gameState.tableCards.length
          });

          // Send through Phase 2 system for validation
          const actionPayload = {
            type: 'card-drop',
            payload: {
              draggedItem: {
                card: draggedItem.card,
                source: 'table',
                player: playerNumber
              },
              targetInfo: {
                type: 'loose',
                card: dropPosition.targetCard,
                index: targetIndex,
                draggedSource: 'table' // For staging, this is table-to-table
              },
              requestId: Date.now()
            }
          };

          console.log(`🌟 [TableDrag] 🚀 SENDING STAGING ACTION TO SERVER:`, {
            actionType: 'card-drop',
            draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
            targetCard: `${dropPosition.targetCard.rank}${dropPosition.targetCard.suit}`,
            player: playerNumber,
            requestId: actionPayload.payload.requestId
          });

          sendAction(actionPayload);

          console.log(`🌟 [TableDrag] ✅ Table-to-table staging action sent to server - expecting temp stack creation`);
          return;
        } else {
          console.log(`🌟 [TableDrag] ❌ Not a loose-to-loose drop - no staging action needed`);
        }
      }

      // For fully validated drops (contactValidated = true), no server routing needed
      console.log(`🌟 [TableDrag] Table card drop was fully validated - no server routing needed`, {
        contactValidated: dropPosition.contactValidated,
        handledWithoutServer: true
      });
      return;
    }

    // If not handled by any zone, it's an invalid drop - snap back
    console.log(`[GameBoard] Table card drop not handled by any zone - snapping back`);
  }, [sendAction, gameState.tableCards, playerNumber]);

  const handleCapturedCardDragStart = useCallback((card: any) => {
    console.log(`🃏 [CapturedDrag] Captured card drag start:`, card);
    if (!isMyTurn) {
      console.log(`❌ Not your turn - ignoring captured card drag`);
      return;
    }
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn]);

  const handleCapturedCardDragEnd = useCallback((draggedItem: any, dropPosition: any) => {
    console.log(`🃏 [CapturedDrag] Captured card drag end:`, draggedItem, dropPosition);
    console.log(`🃏 [CapturedDrag] Dragged card: ${draggedItem.card.rank}${draggedItem.card.suit} from opponent's captures`);

    setDraggedCard(null);
    setIsDragging(false);

    // Handle captured card drops through same drop system
    if (dropPosition.handled) {
      console.log(`🃏 [CapturedDrag] Captured card drop was handled by a zone`);
      // The drop zone handlers will route this through Phase 2 system
      return;
    }

    // Invalid drop - snap back to opponent's capture pile (no visual source)
    console.log(`🃏 [CapturedDrag] Captured card drop not handled - snapping back`);
  }, []);

  return {
    draggedCard,
    isDragging,
    dragTurnState,
    handleDragStart,
    handleDragEnd,
    handleDropOnCard,
    handleTableCardDragStart,
    handleTableCardDragEnd,
    handleCapturedCardDragStart,
    handleCapturedCardDragEnd
  };
}
