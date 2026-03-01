/**
 * useGameActions
 * Hook for all game action callbacks.
 */

import { useCallback } from 'react';

interface SendAction {
  (action: { type: string; payload?: Record<string, unknown> }): void;
}

export function useGameActions(sendAction: SendAction) {
  const createTemp = useCallback((card: any, targetCard: any) => {
    sendAction({ 
      type: 'createTemp', 
      payload: { card, targetCard } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  const addToTemp = useCallback((card: any, stackId: string) => {
    sendAction({ 
      type: 'addToTemp', 
      payload: { tableCard: card, stackId } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  const acceptTemp = useCallback((stackId: string, buildValue: number) => {
    sendAction({ 
      type: 'acceptTemp', 
      payload: { stackId, buildValue } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  const cancelTemp = useCallback((stackId: string) => {
    sendAction({ 
      type: 'cancelTemp', 
      payload: { stackId } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  const capture = useCallback((
    card: any, 
    targetType: 'loose' | 'build', 
    targetRank?: string, 
    targetSuit?: string, 
    targetStackId?: string
  ) => {
    sendAction({ 
      type: 'capture', 
      payload: { card, targetType, targetRank, targetSuit, targetStackId } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  const stealBuild = useCallback((card: any, stackId: string) => {
    sendAction({ 
      type: 'capture', 
      payload: { card, targetType: 'build', targetStackId: stackId } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  const trail = useCallback((card: any) => {
    sendAction({ 
      type: 'trail', 
      payload: { card } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  const dropToCapture = useCallback((card: any, source: 'hand' | 'captured', stackId?: string) => {
    sendAction({ 
      type: 'dropToCapture', 
      payload: { card, source, stackId } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  const playFromCaptures = useCallback((capturedCard: any, targetCard?: any, targetStackId?: string) => {
    if (targetCard) {
      sendAction({ 
        type: 'playFromCaptures', 
        payload: { capturedCard, targetCard } as unknown as Record<string, unknown> 
      });
    } else if (targetStackId) {
      sendAction({ 
        type: 'playFromCaptures', 
        payload: { capturedCard, targetStackId } as unknown as Record<string, unknown> 
      });
    }
  }, [sendAction]);

  return {
    createTemp,
    addToTemp,
    acceptTemp,
    cancelTemp,
    capture,
    stealBuild,
    trail,
    dropToCapture,
    playFromCaptures,
  };
}
