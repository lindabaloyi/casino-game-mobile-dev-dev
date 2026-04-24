/**
 * useGhostVisibility
 *
 * Unified hook for determining which cards should be hidden
 * when an opponent is dragging. Handles single card sources:
 * - Hand cards (from PlayerHandArea)
 * - Table cards (from TableArea)
 * - Captured cards (from CapturedCardsView)
 *
 * Note: Stack sources (temp_stack, build_stack) do NOT use ghost overlay.
 * This hook only handles single card visibility.
 */

import { useCallback } from 'react';
import { OpponentDragState } from '../../hooks/multiplayer/useOpponentDrag';

export function useGhostVisibility(opponentDrag: OpponentDragState | null) {
  const isHandCardHidden = useCallback((cardId: string): boolean => {
    if (!opponentDrag?.isDragging) return false;
    return opponentDrag.source === 'hand' && opponentDrag.cardId === cardId;
  }, [opponentDrag]);

  const isTableCardHidden = useCallback((cardId: string): boolean => {
    if (!opponentDrag?.isDragging) return false;
    return opponentDrag.source === 'table' && opponentDrag.cardId === cardId;
  }, [opponentDrag]);

  const isCapturedCardHidden = useCallback((cardId: string): boolean => {
    if (!opponentDrag?.isDragging) return false;
    return opponentDrag.source === 'captured' && opponentDrag.cardId === cardId;
  }, [opponentDrag]);

  const isAnyCardHidden = useCallback((cardId: string, source: 'hand' | 'table' | 'captured'): boolean => {
    if (!opponentDrag?.isDragging) return false;
    return opponentDrag.cardId === cardId && opponentDrag.source === source;
  }, [opponentDrag]);

  return {
    isHandCardHidden,
    isTableCardHidden,
    isCapturedCardHidden,
    isAnyCardHidden,
  };
}

export default useGhostVisibility;