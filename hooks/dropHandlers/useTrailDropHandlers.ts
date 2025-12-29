import { useCallback } from 'react';
import { DROP_ZONE_PRIORITIES } from '../../constants/dropZonePriorities';
import { Card, GameState } from '../../multiplayer/server/game-logic/game-state';
import { determineActions } from '../../multiplayer/server/game-logic/shared-game-logic';

/**
 * useTrailDropHandlers - Specialized hook for trail action drop handling
 *
 * Handles the complete trail action flow:
 * - Drop zone registration for empty table area
 * - Trail action determination and validation
 * - Modal integration for trail confirmation
 * - Server action dispatching
 */

interface TrailDropHandlersConfig {
  gameState: GameState;
  playerNumber: number;
  sendAction: (action: any) => void;
  setTrailCard: (card: Card | null) => void;
  setErrorModal: (modal: { visible: boolean; title: string; message: string } | null) => void;
}

interface TrailDropZone {
  stackId: string;
  priority: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onDrop: (draggedItem: any) => any;
}

export function useTrailDropHandlers({
  gameState,
  playerNumber,
  sendAction,
  setTrailCard,
  setErrorModal
}: TrailDropHandlersConfig) {

  /**
   * Registers the trail drop zone for empty table area
   * This zone has the lowest priority and only activates when no other zones claim the drop
   */
  const registerTrailDropZone = useCallback((tableRef: any) => {
    if (!tableRef?.current) return;

    const registerZone = () => {
      tableRef.current.measureInWindow((pageX: number, pageY: number, width: number, height: number) => {
        const trailZone: TrailDropZone = {
          stackId: 'trail-table-area',
          priority: DROP_ZONE_PRIORITIES.TABLE_AREA, // 0 - lowest priority
          bounds: { x: pageX, y: pageY, width, height },
          onDrop: (draggedItem: any) => {
            console.log('[TRAIL_ZONE] Drop detected on empty table area:', {
              draggedCard: `${draggedItem.card?.rank}${draggedItem.card?.suit}`,
              draggedSource: draggedItem.source,
              priority: DROP_ZONE_PRIORITIES.TABLE_AREA
            });

            // Only allow trail drops from hand cards
            if (draggedItem.source !== 'hand') {
              console.log('[TRAIL_ZONE] ❌ Rejecting non-hand card for trail');
              return false;
            }

            // Check if it's the player's turn
            if (gameState.currentPlayer !== playerNumber) {
              setErrorModal({
                visible: true,
                title: 'Not Your Turn',
                message: 'Please wait for your turn to trail cards.'
              });
              return false;
            }

            // Determine available actions for this drop
            const actionResult = determineActions(
              draggedItem,
              { type: 'table', area: 'empty' },
              gameState
            );

            console.log('[TRAIL_ZONE] Action determination result:', {
              actionsCount: actionResult.actions.length,
              requiresModal: actionResult.requiresModal,
              actions: actionResult.actions.map(a => a.type)
            });

            if (actionResult.errorMessage) {
              console.log('[TRAIL_ZONE] ❌ Action determination failed:', actionResult.errorMessage);
              setErrorModal({
                visible: true,
                title: 'Invalid Action',
                message: actionResult.errorMessage
              });
              return false;
            }

            // Check if trail is the only available action
            const hasTrailAction = actionResult.actions.some(action => action.type === 'trail');

            if (!hasTrailAction) {
              console.log('[TRAIL_ZONE] ❌ No trail action available for this drop');
              // Don't show error modal - let other zones handle it or allow snap-back
              return false;
            }

            if (actionResult.requiresModal) {
              // Trail actions always require modal confirmation
              console.log('[TRAIL_ZONE] ✅ Trail action requires modal confirmation');

              // Set the trail card for modal display
              setTrailCard(draggedItem.card);

              // Return success to indicate this zone handled the drop
              return {
                type: 'table',
                area: 'empty',
                requiresModal: true,
                trailAction: actionResult.actions.find(a => a.type === 'trail')
              };
            }

            // This shouldn't happen for trail actions, but handle just in case
            console.log('[TRAIL_ZONE] ⚠️ Trail action determined but no modal required - unexpected');
            return false;
          }
        };

        // Register the trail zone globally
        if (!(global as any).dropZones) {
          (global as any).dropZones = [];
        }

        // Remove existing trail zone and add new one
        (global as any).dropZones = (global as any).dropZones.filter(
          (zone: any) => zone.stackId !== 'trail-table-area'
        );
        (global as any).dropZones.push(trailZone);

        console.log('[TRAIL_ZONE] Registered trail drop zone:', {
          stackId: trailZone.stackId,
          priority: trailZone.priority,
          bounds: trailZone.bounds
        });
      });
    };

    // Register after layout is complete
    setTimeout(registerZone, 100);

    // Return cleanup function
    return () => {
      if ((global as any).dropZones) {
        (global as any).dropZones = (global as any).dropZones.filter(
          (zone: any) => zone.stackId !== 'trail-table-area'
        );
      }
    };
  }, [gameState, playerNumber, setTrailCard, setErrorModal]);

  /**
   * Calculates card value from rank
   */
  const getCardValue = useCallback((rank: string): number => {
    if (rank === 'A') return 1;
    if (rank === '10') return 10;
    const parsed = parseInt(rank, 10);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  /**
   * Handles trail confirmation from the modal
   */
  const handleTrailConfirm = useCallback((cardData: { rank: string; suit: string }) => {
    console.log('[TRAIL_HANDLERS] Confirming trail for card:', `${cardData.rank}${cardData.suit}`);

    // Generate request ID for correlation
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Convert to full Card object
    const card: Card = {
      rank: cardData.rank,
      suit: cardData.suit,
      value: getCardValue(cardData.rank)
    };

    const actionPayload = {
      type: 'trail',
      payload: {
        card,
        requestId  // Include for server-side correlation
      }
    };

    console.log('[TRAIL_HANDLERS] Sending trail action to server:', actionPayload);
    sendAction(actionPayload);

    // Clear the trail card
    setTrailCard(null);
  }, [sendAction, setTrailCard, getCardValue]);

  /**
   * Handles trail cancellation from the modal
   */
  const handleTrailCancel = useCallback((cardData: { rank: string; suit: string }) => {
    console.log('[TRAIL_HANDLERS] Cancelling trail for card:', `${cardData.rank}${cardData.suit}`);

    // Convert to full Card object for consistency
    const card: Card = {
      rank: cardData.rank,
      suit: cardData.suit,
      value: getCardValue(cardData.rank)
    };

    const actionPayload = {
      type: 'cancel-trail',
      payload: { card }
    };

    console.log('[TRAIL_HANDLERS] Sending cancel-trail action to server:', actionPayload);
    sendAction(actionPayload);

    // Clear the trail card
    setTrailCard(null);
  }, [sendAction, setTrailCard, getCardValue]);

  /**
   * Validates if a trail action is currently valid for the given card
   * Useful for UI hints or pre-validation
   */
  const isTrailValid = useCallback((card: Card): boolean => {
    const draggedItem = { card, source: 'hand', player: playerNumber };
    const targetInfo = { type: 'table', area: 'empty' };

    const actionResult = determineActions(draggedItem, targetInfo, gameState);

    return actionResult.actions.some(action => action.type === 'trail') &&
           !actionResult.errorMessage;
  }, [gameState, playerNumber]);

  return {
    registerTrailDropZone,
    handleTrailConfirm,
    handleTrailCancel,
    isTrailValid
  };
}
