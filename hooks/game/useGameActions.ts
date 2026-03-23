/**
 * useGameActions
 * Hook for all game action callbacks.
 */

import { useCallback } from 'react';

interface SendAction {
  (action: { type: string; payload?: Record<string, unknown> }): void;
}

export function useGameActions(sendAction: SendAction) {
  const createTemp = useCallback((card: any, targetCard: any, source: string = 'hand') => {
    sendAction({ 
      type: 'createTemp', 
      payload: { card, targetCard, source } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  const addToTemp = useCallback((card: any, stackId: string, source: string = 'hand') => {
    sendAction({ 
      type: 'addToTemp', 
      payload: { card, stackId, source } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  const acceptTemp = useCallback((stackId: string, buildValue: number, originalOwner?: number) => {
    sendAction({ 
      type: 'acceptTemp', 
      payload: { stackId, buildValue, originalOwner } as unknown as Record<string, unknown> 
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

  const dropToCapture = useCallback((stackOrPayload: any, source?: 'hand' | 'captured') => {
    // Support both old API (stack, source) and new API ({ stackId, stackType })
    let payload: { stackId: string; stackType?: string; source?: 'hand' | 'captured' };
    
    if (typeof stackOrPayload === 'object' && 'stackId' in stackOrPayload) {
      // New API: { stackId, stackType }
      payload = stackOrPayload;
    } else {
      // Old API: (stack, source)
      // Include source so server knows if temp stack came from hand or captured pile
      payload = { stackId: stackOrPayload.stackId, source };
    }
    
    sendAction({ 
      type: 'dropToCapture', 
      payload: payload as unknown as Record<string, unknown> 
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

  // Build extension actions
  // cardSource: 'table' (loose card from table), 'hand' (card from player's hand), 
  // 'captured' (card from player's captured pile), 'captured_<playerIndex>' (specific player's captures)
  type CardSource = 'table' | 'hand' | 'captured' | `captured_${number}`;
  
  const startBuildExtension = useCallback((buildId: string, card: any, cardSource: CardSource = 'table') => {
    sendAction({ 
      type: 'startBuildExtension', 
      payload: { stackId: buildId, card, cardSource } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  const acceptBuildExtension = useCallback((buildId: string) => {
    // No card/cardSource needed - pending cards are already stored on server
    sendAction({ 
      type: 'acceptBuildExtension', 
      payload: { stackId: buildId } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  const declineBuildExtension = useCallback((buildId: string) => {
    sendAction({ 
      type: 'declineBuildExtension', 
      payload: { stackId: buildId } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  // Single action that router uses to decide start vs accept
  const extendBuild = useCallback((card: any, buildId: string, cardSource: CardSource = 'table') => {
    sendAction({ 
      type: 'extendBuild', 
      payload: { card, stackId: buildId, cardSource } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  // Manual turn end - used after steal to allow player to continue or end turn
  const endTurn = useCallback(() => {
    sendAction({ 
      type: 'endTurn', 
      payload: {} as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  // Generic stack drop - SmartRouter decides what action to take
  const stackDrop = useCallback((card: any, stackId: string, stackOwner: number, stackType: 'temp_stack' | 'build_stack', cardSource: 'table' | 'hand' | 'captured' = 'hand') => {
    sendAction({ 
      type: 'stackDrop', 
      payload: { card, stackId, stackOwner, stackType, cardSource } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  // Shiya action - party mode only, capture teammate's build
  const shiya = useCallback((stackId: string) => {
    sendAction({ 
      type: 'shiya', 
      payload: { stackId } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  // Unified recall action - party mode only, only Shiya activator can recall
  // Uses recallId to identify which recall to use (supports multiple per player)
  const recall = useCallback((recallId: string) => {
    sendAction({ 
      type: 'recall', 
      payload: { recallId } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  // Set temp build value - for dual builds feature
  const setTempBuildValue = useCallback((stackId: string, value: number) => {
    sendAction({ 
      type: 'setTempBuildValue', 
      payload: { stackId, value } as unknown as Record<string, unknown> 
    });
  }, [sendAction]);

  // Start build capture - for capturing opponent's build with a captured card
  // cardSource: 'captured' (own captures) or 'captured_<playerIndex>' (specific opponent's captures)
  const startBuildCapture = useCallback((card: any, stackId: string, cardSource: CardSource = 'captured') => {
    sendAction({ 
      type: 'startBuildCapture', 
      payload: { card, stackId, cardSource } as unknown as Record<string, unknown> 
    });
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
    startBuildExtension,
    acceptBuildExtension,
    declineBuildExtension,
    extendBuild,
    endTurn,
    stackDrop,
    shiya,
    recall,
    setTempBuildValue,
    startBuildCapture,
  };
}

export default useGameActions;
