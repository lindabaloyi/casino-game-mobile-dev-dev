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
    console.log(`[GameBoard] Staging accept for stack: ${stackId}`);
    const stack = findStackById(stackId);
    if (stack && 'stackId' in stack) {
      sendAction({
        type: 'finalizeStagingStack',
        payload: { stack }
      });
    } else {
      console.error(`[GameBoard] Cannot accept staging - stack not found: ${stackId}`);
    }
  }, [findStackById, sendAction]);

  const handleStagingReject = useCallback((stackId: string) => {
    console.log(`[GameBoard] Staging reject for stack: ${stackId}`);
    const stackToCancel = findStackById(stackId);
    if (stackToCancel && 'stackId' in stackToCancel) {
      sendAction({
        type: 'cancelStagingStack',
        payload: { stackToCancel }
      });
    } else {
      console.error(`[GameBoard] Cannot reject staging - stack not found: ${stackId}`);
    }
  }, [findStackById, sendAction]);

  return {
    handleFinalizeStack,
    handleCancelStack,
    handleStagingAccept,
    handleStagingReject
  };
}
