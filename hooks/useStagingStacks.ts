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
    console.log(`[STAGING_STACKS] ❌ REJECTING staging stack:`, {
      stackId,
      actionType: 'cancelStagingStack',
      timestamp: Date.now()
    });

    const stackToCancel = findStackById(stackId);
    if (stackToCancel && 'stackId' in stackToCancel) {
      console.log(`[STAGING_STACKS] 🚀 Sending cancelStagingStack action to server:`, {
        stackId,
        stackOwner: stackToCancel.owner,
        stackCards: stackToCancel.cards?.length || 0,
        actionPayload: {
          type: 'cancelStagingStack',
          payload: { stackToCancel }
        }
      });

      sendAction({
        type: 'cancelStagingStack',
        payload: { stackToCancel }
      });

      console.log(`[STAGING_STACKS] ✅ cancelStagingStack action sent - expecting cards to return to table without turn advance`);
    } else {
      console.error(`[STAGING_STACKS] ❌ Cannot reject staging - stack not found:`, {
        requestedStackId: stackId,
        availableStacks: gameState.tableCards.filter((c: any) => 'stackId' in c).map((c: any) => ({
          id: c.stackId,
          owner: c.owner
        }))
      });
    }
  }, [findStackById, sendAction, gameState.tableCards]);

  return {
    handleFinalizeStack,
    handleCancelStack,
    handleStagingAccept,
    handleStagingReject
  };
}
