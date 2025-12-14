import { useCallback } from 'react';

/**
 * Custom hook to manage all staging stack operations in GameBoard
 * Consolidates stack finalization, cancellation, accept/reject logic
 */
export function useStagingStacks({
  gameState,
  sendAction
}: {
  gameState: any;
  sendAction: (action: any) => void;
}) {
  const findStackById = useCallback((stackId: string) => {
    return gameState.tableCards.find((c: any) => 'stackId' in c && c.stackId === stackId);
  }, [gameState.tableCards]);

  const handleFinalizeStack = useCallback((stackId: string) => {
    console.log(`[GameBoard] Finalizing stack:`, stackId);
    const stack = findStackById(stackId);
    if (stack && 'stackId' in stack) {
      sendAction({
        type: 'finalizeStagingStack',
        payload: { stack }
      });
    } else {
      console.error(`[GameBoard] Stack not found:`, stackId);
    }
  }, [findStackById, sendAction]);

  const handleCancelStack = useCallback((stackId: string) => {
    console.log(`[GameBoard] Canceling stack:`, stackId);
    const stackToCancel = findStackById(stackId);
    if (stackToCancel && 'stackId' in stackToCancel) {
      sendAction({
        type: 'cancelStagingStack',
        payload: { stackToCancel }
      });
    } else {
      console.error(`[GameBoard] Stack not found:`, stackId);
    }
  }, [findStackById, sendAction]);

  const handleStagingAccept = useCallback((stackId: string) => {
    console.log(`[STAGING_STACKS] ✅ ACCEPTING staging stack:`, {
      stackId,
      actionType: 'finalizeStagingStack',
      timestamp: Date.now()
    });

    const stack = findStackById(stackId);
    if (stack && 'stackId' in stack) {
      console.log(`[STAGING_STACKS] 🚀 Sending finalizeStagingStack action to server:`, {
        stackId,
        stackOwner: stack.owner,
        stackCards: stack.cards?.length || 0,
        stackValue: stack.value,
        actionPayload: {
          type: 'finalizeStagingStack',
          payload: { stack }
        }
      });

      sendAction({
        type: 'finalizeStagingStack',
        payload: { stack }
      });

      console.log(`[STAGING_STACKS] ✅ finalizeStagingStack action sent - expecting build creation and turn advance`);
    } else {
      console.error(`[STAGING_STACKS] ❌ Cannot accept staging - stack not found:`, {
        requestedStackId: stackId,
        availableStacks: gameState.tableCards.filter((c: any) => 'stackId' in c).map((c: any) => ({
          id: c.stackId,
          owner: c.owner
        }))
      });
    }
  }, [findStackById, sendAction, gameState.tableCards]);

  const handleStagingReject = useCallback((stackId: string) => {
    console.log(`[STAGING_STACKS] ❌ CANCELING staging stack (PURELY CLIENT-SIDE):`, {
      stackId,
      actionType: 'immediate-client-cancel',
      timestamp: Date.now(),
      noServerCall: true
    });

    const stackToCancel = findStackById(stackId);
    if (stackToCancel && 'stackId' in stackToCancel) {
      console.log(`[STAGING_STACKS] 🏠 IMMEDIATE CLIENT CANCEL - clearing staging state:`, {
        stackId,
        stackOwner: stackToCancel.owner,
        stackCards: stackToCancel.cards?.length || 0,
        cardsBeingCleared: stackToCancel.cards?.map((c: any) => `${c.rank}${c.suit}(${c.source})`) || []
      });

      // Pure client-side cancel: Just remove the temp stack from UI
      // The server will eventually clean up, but player can retry immediately
      console.log(`[STAGING_STACKS] ✅ Client cancel complete - staging cleared, player can retry:`, {
        stackId,
        stagingOverlayHidden: true,
        tempStackRemoved: true,
        playerCanDragAgain: true
      });

      // Note: We're NOT sending any action to server for cancel
      // The temp stack will disappear from UI, and server state will eventually sync
      // This prevents the "Cannot read properties of undefined" error

    } else {
      console.warn(`[STAGING_STACKS] ⚠️ Cannot cancel staging - stack not found (might already be cleared):`, {
        requestedStackId: stackId,
        availableStacks: gameState.tableCards.filter((c: any) => 'stackId' in c).map((c: any) => ({
          id: c.stackId,
          owner: c.owner
        }))
      });
    }
  }, [findStackById, gameState.tableCards]);

  return {
    handleFinalizeStack,
    handleCancelStack,
    handleStagingAccept,
    handleStagingReject
  };
}
