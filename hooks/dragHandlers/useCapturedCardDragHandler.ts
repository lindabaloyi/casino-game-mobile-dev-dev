/**
 * Captured Card Drag Handler
 * Handles captured card drag operations
 */

import { useCallback } from 'react';
import { GameState } from '../../multiplayer/server/game-logic/game-state';
import { findContactAtPoint } from '../../src/utils/contactDetection';

interface CapturedCardDragHandlerProps {
  gameState: GameState;
  playerNumber: number;
  isMyTurn: boolean;
  sendAction: (action: any) => void;
}

/**
 * Hook for handling captured card drag operations
 */
export function useCapturedCardDragHandler({
  gameState,
  playerNumber,
  isMyTurn,
  sendAction
}: CapturedCardDragHandlerProps) {

  /**
   * Handle captured card drag start
   */
  const handleCapturedCardDragStart = useCallback((card: any) => {
    console.log(`[CAPTURED-DRAG] 🏁 Captured card drag START:`, {
      card: `${card.rank}${card.suit}`,
      cardValue: card.value,
      isMyTurn,
      playerNumber,
      dragSource: 'captured'
    });

    if (!isMyTurn) {
      console.log(`[CAPTURED-DRAG] ❌ Not your turn - ignoring captured card drag`);
      return;
    }
    // Could add validation here if captured cards have drag restrictions
  }, [isMyTurn, playerNumber]);

  /**
   * Handle captured card drag end
   */
  const handleCapturedCardDragEnd = useCallback((draggedItem: any, dropPosition: any) => {
    console.log(`[CAPTURED-DRAG] 🏁 Captured card drag END:`, {
      draggedCard: `${draggedItem.card?.rank}${draggedItem.card?.suit}`,
      cardValue: draggedItem.card?.value,
      source: draggedItem.source,
      dropPosition: `${dropPosition?.x?.toFixed(1)}, ${dropPosition?.y?.toFixed(1)}`,
      playerNumber,
      isMyTurn
    });

    // Find contact using contact detection
    const contact = findContactAtPoint(dropPosition.x, dropPosition.y, 80);

    if (!contact) {
      console.log('[CAPTURED-DRAG] ❌ No contact found at drop position');
      return { validContact: false };
    }

    console.log(`[CAPTURED-DRAG] 🎯 Contact detected:`, {
      type: contact.type,
      id: contact.id,
      contactData: contact.data
    });

    // TODO: Implement captured card drop actions
    // This will be implemented once we determine the correct behavior

    console.log('[CAPTURED-DRAG] ⏳ Drop logic not yet implemented for captured cards');

  }, [playerNumber, isMyTurn]);

  return {
    handleCapturedCardDragStart,
    handleCapturedCardDragEnd
  };
}
