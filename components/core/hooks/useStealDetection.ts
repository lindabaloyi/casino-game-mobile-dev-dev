/**
 * useStealDetection
 * Hook for managing steal overlay state when dragging over opponent's builds.
 */

import { useState, useCallback } from 'react';
import { BuildStack } from '../../table/types';

export interface StealDetectionState {
  showStealOverlay: boolean;
  stealOverlayStack: BuildStack | null;
  stealOverlayPosition: { x: number; y: number };
}

export function useStealDetection(playerNumber: number) {
  const [showStealOverlay, setShowStealOverlay] = useState(false);
  const [stealOverlayStack, setStealOverlayStack] = useState<BuildStack | null>(null);
  const [stealOverlayPosition, setStealOverlayPosition] = useState({ x: 0, y: 0 });

  const showOverlay = useCallback((stack: BuildStack, x: number, y: number) => {
    if (stack.owner !== playerNumber) {
      console.log('[useStealDetection] Showing overlay for opponent build:', stack.stackId);
      setStealOverlayStack(stack);
      setStealOverlayPosition({ x, y });
      setShowStealOverlay(true);
    }
  }, [playerNumber]);

  const hideOverlay = useCallback(() => {
    setShowStealOverlay(false);
    setStealOverlayStack(null);
  }, []);

  return {
    showStealOverlay,
    stealOverlayStack,
    stealOverlayPosition,
    showOverlay,
    hideOverlay,
  };
}
