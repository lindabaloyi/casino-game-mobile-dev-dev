import { useCallback, useState } from 'react';

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
  gameState: any;
  playerNumber: number;
  sendAction: (action: any) => void;
  setCardToReset: (card: { rank: string; suit: string } | null) => void;
  setErrorModal: (modal: { visible: boolean; title: string; message: string } | null) => void;
}) {
  const [draggedCard, setDraggedCard] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTurnState, setDragTurnState] = useState<any>(null);

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
    console.log(`🏆 [GameBoard] Card dropped - START:`, {
      draggedCard: draggedItem.card.rank + draggedItem.card.suit,
      source: draggedItem.source,
      targetType: targetInfo.type,
      targetArea: targetInfo.area,
      isMyTurn,
      currentPlayer: gameState.currentPlayer
    });

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
    sendAction({
      type: 'card-drop',
      payload: {
        draggedItem,
        targetInfo,
        requestId: Date.now() // For matching responses
      }
    });

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
      console.log(`🌟 [TableDrag] Table card drop was handled by a zone`);

      // Check if this drop needs server validation (table zone detected but contact not validated)
      if (dropPosition.needsServerValidation) {
        console.log(`🌟 [TableDrag] Table card drop needs server validation - routing through Phase 2`);

        // Route through Phase 2 card-drop event for server-centric validation
        if (dropPosition.targetType === 'loose') {
          console.log(`🌟 [TableDrag] Table card dropped near loose card - validating with server`);
          console.log(`🌟 [TableDrag] Target card: ${dropPosition.targetCard.rank}${dropPosition.targetCard.suit}`);

          // Find target card index for proper server validation
          const targetIndex = gameState.tableCards.findIndex(card => {
            // Check if it's a loose card (no type property or type === 'loose')
            const isLooseCard = 'rank' in card && 'suit' in card && (!('type' in card) || (card as any).type === 'loose');
            if (isLooseCard) {
              return (card as any).rank === dropPosition.targetCard.rank &&
                     (card as any).suit === dropPosition.targetCard.suit;
            }
            return false;
          });

          // Send through Phase 2 system for validation
          sendAction({
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
                index: targetIndex
              },
              requestId: Date.now()
            }
          });

          console.log(`🌟 [TableDrag] Table-to-table validation sent through Phase 2 system`);
          return;
        }
      }

      // For fully validated drops (contactValidated = true), no server routing needed
      console.log(`🌟 [TableDrag] Table card drop was fully validated - no server routing needed`);
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
