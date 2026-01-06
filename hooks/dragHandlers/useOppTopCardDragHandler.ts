/**
 * Opponent Top Card Drag Handler
 * Clean, simple implementation for opponent card dragging
 */

import { useCallback } from 'react';
import { GameState } from '../../multiplayer/server/game-logic/game-state';
import { findContactAtPoint } from '../../src/utils/contactDetection';

interface OppTopCardDragHandlerProps {
  gameState: GameState;
  playerNumber: number;
  isMyTurn: boolean;
  sendAction: (action: any) => void;
  handleDragStart: (card: any) => void;
}

/**
 * Hook for handling opponent top card drag operations
 */
export function useOppTopCardDragHandler({
  gameState,
  playerNumber,
  isMyTurn,
  sendAction,
  handleDragStart
}: OppTopCardDragHandlerProps) {

  /**
   * Handle opponent top card drag start
   */
  const handleOppTopCardDragStart = useCallback((card: any, metadata: any = {}) => {
    console.log(`[🎯 OPP-DRAG-START] Opponent card drag started:`, {
      card: `${card.rank}${card.suit}`,
      opponentId: metadata.opponentId
    });
    handleDragStart(card);
  }, [handleDragStart]);

  /**
   * Handle opponent top card drag end - CLEAN DIRECT LOGIC
   */
  const handleOppTopCardDragEnd = useCallback((draggedItem: any, dropPosition: any) => {
    console.log(`[🏁 OPP-DRAG-END] Processing drop at:`, dropPosition);

    // Find contact using contact detection system
    const contact = findContactAtPoint(dropPosition.x, dropPosition.y, 80);

    if (!contact) {
      console.log('[❌ OPP-DRAG-END] No contact found');
      return { validContact: false };
    }

    const opponentId = draggedItem.metadata?.opponentId;
    console.log(`[🎯 OPP-CONTACT] Contact detected:`, {
      type: contact.type,
      opponentId,
      card: `${draggedItem.card.rank}${draggedItem.card.suit}`
    });

    // DIRECT ACTION MAPPING - Same pattern as hand/table cards
    if (contact.type === 'card') {
      // Drop on loose card → Create temp stack
      console.log('[✅ OPP-ACTION] Creating temp stack with loose card');
      sendAction({
        type: 'createTemp',
        payload: {
          source: 'oppTopCard',
          card: draggedItem.card,
          targetIndex: contact.data?.index,
          opponentId: opponentId,
          isTableToTable: false,
          canAugmentBuilds: true
        }
      });
      return { validContact: true };
    }

    if (contact.type === 'build') {
      // Drop on build → Add to build
      console.log('[✅ OPP-ACTION] Adding to build');
      sendAction({
        type: 'addToOwnBuild',
        payload: {
          buildId: contact.data?.buildId,
          card: draggedItem.card,
          source: 'oppTopCard',
          opponentId: opponentId
        }
      });
      return { validContact: true };
    }

    if (contact.type === 'tempStack') {
      // Drop on temp stack → Add to temp stack
      console.log('[✅ OPP-ACTION] Adding to temp stack');
      sendAction({
        type: 'addToOwnTemp',
        payload: {
          stackId: contact.data?.stackId,
          card: draggedItem.card,
          source: 'oppTopCard',
          opponentId: opponentId
        }
      });
      return { validContact: true };
    }

    console.log(`[⚠️ OPP-UNKNOWN] Unknown contact type: ${contact.type}`);
    return { validContact: false };

  }, [sendAction]);

  return {
    handleOppTopCardDragStart,
    handleOppTopCardDragEnd
  };
}
