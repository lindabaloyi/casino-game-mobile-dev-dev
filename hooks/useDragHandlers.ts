import { useCallback, useState } from 'react';
import { Card, GameState } from '../multiplayer/server/game-logic/game-state';
import { useHandCardDragHandler, useOppTopCardDragHandler, useTableCardDragHandler } from './dragHandlers';

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
 * CONTACT-BASED: Clean drag and drop handler using separated concerns
 * Each drag type has its own focused handler for better maintainability
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
  // Base drag state management
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

  // Separated drag handlers for different card types
  const handHandler = useHandCardDragHandler({
    gameState,
    playerNumber,
    sendAction,
    setCardToReset,
    setErrorModal,
    isMyTurn
  });

  const tableHandler = useTableCardDragHandler({
    gameState,
    playerNumber,
    isMyTurn,
    sendAction
  });

  const opponentHandler = useOppTopCardDragHandler({
    gameState,
    playerNumber,
    isMyTurn,
    sendAction,
    handleDragStart
  });

  /**
   * Handle drag end (cleanup)
   */
  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
    setIsDragging(false);
  }, []);

  /**
   * Hand card drag end - delegate to separated handler with debug logging
   */
  const handleHandCardDragEnd = useCallback((draggedItem: any, dropPosition: any) => {
    console.log('[DEBUG-DRAG] 🎯 handleHandCardDragEnd called:', {
      card: draggedItem.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'no card',
      source: draggedItem.source,
      dropPosition: `${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)}`,
      timestamp: new Date().toISOString()
    });

    const result = handHandler.handleDragEnd(draggedItem, dropPosition);

    console.log('[DEBUG-DRAG] 🎯 handleHandCardDragEnd result:', {
      validContact: result?.validContact,
      timestamp: new Date().toISOString()
    });

    return result;
  }, [handHandler]);

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
   * Table card drag end - delegate to separated handler
   */
  const handleTableCardDragEnd = tableHandler.handleTableCardDragEnd;

  /**
   * Opponent card drag start - delegate to separated handler
   */
  const handleOppTopCardDragStart = opponentHandler.handleOppTopCardDragStart;

  /**
   * Opponent card drag end - delegate to separated handler
   */
  const handleOppTopCardDragEnd = opponentHandler.handleOppTopCardDragEnd;

  return {
    draggedCard,
    isDragging,
    dragTurnState,
    handleDragStart,
    handleDragEnd,
    handleHandCardDragEnd,
    handleTableCardDragStart,
    handleTableCardDragEnd,
    handleOppTopCardDragStart,
    handleOppTopCardDragEnd
  };
}
