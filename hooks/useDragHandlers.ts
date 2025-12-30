import { useCallback, useState } from 'react';
import { Card, GameState } from '../multiplayer/server/game-logic/game-state';
import { determineActionFromContact } from '../src/utils/contactActions';
import { findContactAtPoint } from '../src/utils/contactDetection';

// Simplified type definitions
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
 * CONTACT-BASED: Simplified drag and drop handler using contact detection
 * Eliminates complex drop zone system in favor of simple card-to-card contact
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

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback((card: any) => {
    console.log(`[CONTACT-DRAG] 🎯 Drag start: ${card?.rank}${card?.suit}`);
    if (!isMyTurn) {
      console.log(`[CONTACT-DRAG] ❌ Not your turn, ignoring drag start`);
      return;
    }
    setDragTurnState({ isMyTurn: true, currentPlayer: gameState.currentPlayer });
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn, gameState.currentPlayer]);

  /**
   * Handle drag end (cleanup)
   */
  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
    setIsDragging(false);
  }, []);

  /**
   * CONTACT-BASED: Handle hand card drag end with contact detection
   */
  const handleHandCardDragEnd = useCallback((
    draggedItem: { card: Card; source?: string },
    dropPosition: { x: number; y: number }
  ) => {
    console.log(`[CONTACT-DRAG] 🎯 Hand card drag end:`, {
      card: `${draggedItem.card.rank}${draggedItem.card.suit}`,
      dropPosition,
      source: draggedItem.source || 'hand'
    });

    if (!isMyTurn) {
      setErrorModal({ visible: true, title: 'Not Your Turn', message: 'Please wait for your turn.' });
      return;
    }

    // Track card for reset
    setCardToReset({
      rank: draggedItem.card.rank,
      suit: draggedItem.card.suit
    });

    // Find contact at drop position (80px threshold)
    const contact = findContactAtPoint(dropPosition.x, dropPosition.y, 80);

    if (contact) {
      console.log(`[CONTACT-DRAG] ✅ Found contact:`, {
        id: contact.id,
        type: contact.type,
        distance: Math.round(contact.distance)
      });

      // Determine action from contact
      const action = determineActionFromContact(
        draggedItem.card,
        contact,
        gameState,
        playerNumber
      );

      if (action) {
        console.log(`[CONTACT-DRAG] 🚀 Sending action: ${action.type}`);
        sendAction(action);
        return;
      } else {
        console.log(`[CONTACT-DRAG] ❌ No valid action determined from contact`);
      }
    } else {
      console.log(`[CONTACT-DRAG] ❌ No contact found - must be a trail`);
    }

    // No contact or invalid action = trail
    console.log(`[CONTACT-DRAG] 🛤️ Falling back to trail`);
    sendAction({
      type: 'trail',
      payload: {
        card: draggedItem.card,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });

  }, [sendAction, gameState, playerNumber, isMyTurn, setCardToReset, setErrorModal]);

  /**
   * Table card drag start
   */
  const handleTableCardDragStart = useCallback((card: any) => {
    console.log(`[CONTACT-DRAG] Table drag start: ${card.rank}${card.suit}`);
    if (!isMyTurn) {
      console.log(`[CONTACT-DRAG] ❌ Not your turn - ignoring table drag`);
      return;
    }
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn]);

  /**
   * CONTACT-BASED: Handle table card drag end with contact detection
   */
  const handleTableCardDragEnd = useCallback((draggedItem: any, dropPosition: { x: number; y: number; handled?: boolean; contactDetected?: boolean; contact?: any }) => {
    console.log(`[CONTACT-DRAG] 🎯 Table card drag end:`, {
      card: `${draggedItem.card.rank}${draggedItem.card.suit}`,
      dropPosition: `(${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)})`,
      source: draggedItem.source,
      handled: dropPosition.handled,
      contactDetected: dropPosition.contactDetected
    });

    if (!isMyTurn) {
      console.log(`[CONTACT-DRAG] ❌ Not your turn for table drag`);
      return;
    }

    // Use contact from TableDraggableCard if already detected, otherwise find it
    let contact = dropPosition.contact;
    if (!contact) {
      contact = findContactAtPoint(dropPosition.x, dropPosition.y, 80);
    }

    if (contact) {
      console.log(`[CONTACT-DRAG] ✅ Found contact for table drop:`, {
        id: contact.id,
        type: contact.type,
        distance: Math.round(contact.distance)
      });

      // For table-to-table drops, create a temp stack
      if (contact.type === 'card') {
        console.log(`[CONTACT-DRAG] 🏗️ Table-to-table drop detected`);

        // Get the touched card from contact data
        const targetCard = contact.data;
        if (targetCard) {
          console.log(`[CONTACT-DRAG] 📦 Creating temp stack from:`, {
            dragged: `${draggedItem.card.rank}${draggedItem.card.suit}`,
            target: `${targetCard.rank}${targetCard.suit}`
          });

          const action = {
            type: 'tableToTableDrop',
            payload: {
              gameId: 1, // TODO: Get actual game ID
              draggedItem: draggedItem,
              targetInfo: {
                card: targetCard,
                type: 'loose',
                index: contact.data.index // Use the index from contact data
              }
            }
          };

          console.log(`[CONTACT-DRAG] 🚀 Sending table-to-table action:`, action.type);
          sendAction(action);
          return;
        }
      }
    } else {
      console.log(`[CONTACT-DRAG] ❌ No contact found for table drop - snapping back`);
    }

    // If no valid contact, just clean up
    setDraggedCard(null);
    setIsDragging(false);
  }, [sendAction, isMyTurn]);

  /**
   * Captured card drag start
   */
  const handleCapturedCardDragStart = useCallback((card: any) => {
    console.log(`[CONTACT-DRAG] Captured card drag start: ${card.rank}${card.suit}`);
    if (!isMyTurn) {
      console.log(`[CONTACT-DRAG] ❌ Not your turn - ignoring captured card drag`);
      return;
    }
    setDraggedCard(card);
    setIsDragging(true);
  }, [isMyTurn]);

  /**
   * Captured card drag end (simplified)
   */
  const handleCapturedCardDragEnd = useCallback((draggedItem: any, dropPosition: any) => {
    console.log(`[CONTACT-DRAG] Captured card drag end - not yet implemented with contact`);
    setDraggedCard(null);
    setIsDragging(false);
  }, []);

  return {
    draggedCard,
    isDragging,
    dragTurnState,
    handleDragStart,
    handleDragEnd,
    handleHandCardDragEnd,
    handleTableCardDragStart,
    handleTableCardDragEnd,
    handleCapturedCardDragStart,
    handleCapturedCardDragEnd
  };
}
