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

    // 🔍 DEBUG: Current table state before action
    console.log(`🔍 [STAGING_DEBUG] Current table state:`, {
      tableCardsCount: gameState.tableCards?.length || 0,
      tableCards: gameState.tableCards?.map((card: any, index) => ({
        index,
        type: card?.type || 'loose',
        card: card?.type === 'temporary_stack'
          ? `temp-stack(${card.stackId})[${card.cards?.length || 0} cards]`
          : `${card?.rank || 'no-rank'}${card?.suit || 'no-suit'}`,
        owner: card?.owner
      })) || [],
      playerHands: gameState.playerHands?.map((hand, idx) => ({
        player: idx,
        handSize: hand?.length || 0,
        cards: hand?.map((c: any) => `${c.rank}${c.suit}`) || []
      })) || []
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

      // Check if this is a table zone detected drop (table-to-loose staging)
      if (dropPosition.tableZoneDetected) {
        console.log(`🌟 [TableDrag] 🎯 TABLE-TO-LOOSE STAGING DETECTED - sending action to server`, {
          draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit} (val:${draggedItem.card.value})`,
          tableZoneDetected: dropPosition.tableZoneDetected,
          needsServerValidation: dropPosition.needsServerValidation,
          targetType: dropPosition.targetType,
          targetCard: dropPosition.targetCard ? `${dropPosition.targetCard.rank}${dropPosition.targetCard.suit}` : 'none'
        });
        // Validate target card exists
        if (!dropPosition.targetCard) {
          console.error(`🌟 [TableDrag] ❌ No target card detected for table-to-loose drop`, {
            draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
            dropPosition
          });
          return;
        }

        console.log(`🎯 [STAGING_DEBUG] TABLE CARD STAGING: ${draggedItem.card.rank}${draggedItem.card.suit} → loose ${dropPosition.targetCard.rank}${dropPosition.targetCard.suit} - EXPECT STAGING OVERLAY`);

        // For table-to-loose drops, send card-drop action to trigger staging
        // Use the actual target information detected by the drop zone
        const targetIndex = gameState.tableCards.findIndex((card: any) => {
          if (!card || typeof card !== 'object') return false;
          // Check if it's a loose card (no type property or type === 'loose')
          const isLooseCard = 'rank' in card && 'suit' in card && (!('type' in card) || (card as any).type === 'loose');
          if (!isLooseCard) return false;
          // Match the target card detected by drop zone
          return card.rank === dropPosition.targetCard.rank &&
                 card.suit === dropPosition.targetCard.suit;
        });

        console.log(`🌟 [TableDrag] Target card lookup:`, {
          targetCard: dropPosition.targetCard,
          foundAtIndex: targetIndex,
          totalTableCards: gameState.tableCards.length
        });

        if (targetIndex === -1) {
          console.error(`🌟 [TableDrag] ❌ Could not find target card in table state`, {
            targetCard: dropPosition.targetCard,
            tableCards: gameState.tableCards.map((c: any) => c ? `${c.rank}${c.suit}` : 'null')
          });
          return;
        }

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
              card: dropPosition.targetCard, // Use actual target card
              index: targetIndex, // Use actual target index
              draggedSource: 'table'
            },
            requestId: Date.now()
          }
        };

        console.log(`🌟 [TableDrag] 🚀 SENDING TABLE-TO-LOOSE STAGING ACTION TO SERVER:`, {
          actionType: 'card-drop',
          draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
          player: playerNumber,
          requestId: actionPayload.payload.requestId
        });

        sendAction(actionPayload);

        console.log(`🌟 [TableDrag] ✅ Table-to-loose staging action sent - expecting temp stack creation and overlay`);
        return;
      }

      // For fully validated drops (contactValidated = true), no server routing needed
      if (dropPosition.contactValidated) {
        console.log(`🌟 [TableDrag] Table card drop was fully validated - no server routing needed`, {
          contactValidated: dropPosition.contactValidated,
          handledWithoutServer: true
        });
        return;
      }
    }

    // If not handled by any zone, it's an invalid drop - snap back
    console.log(`[GameBoard] Table card drop not handled by any zone - snapping back`);
  }, [sendAction, gameState.tableCards, playerNumber]);

  const handleCapturedCardDragStart = useCallback((card: any) => {
    console.log(`� [CapturedDrag] Captured card drag start:`, card);
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
      console.log(`� [CapturedDrag] Captured card drop was handled by a zone`);
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
