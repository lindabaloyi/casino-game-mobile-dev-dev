/**
 * useModalManager
 * Hook for managing all modal state in GameBoard.
 */

import { useState, useCallback } from 'react';
import { TempStack, BuildStack, Card } from '../../table/types';

export function useModalManager() {
  // Play modal (for accepting temp stacks)
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [selectedTempStack, setSelectedTempStack] = useState<TempStack | null>(null);

  // Steal modal (for stealing opponent's builds)
  const [showStealModal, setShowStealModal] = useState(false);
  const [stealTargetCard, setStealTargetCard] = useState<Card | null>(null);
  const [stealTargetStack, setStealTargetStack] = useState<BuildStack | null>(null);

  // Play modal
  const openPlayModal = useCallback((stack: TempStack) => {
    setSelectedTempStack(stack);
    setShowPlayModal(true);
  }, []);

  const closePlayModal = useCallback(() => {
    setShowPlayModal(false);
    setSelectedTempStack(null);
  }, []);

  // Steal modal
  const openStealModal = useCallback((card: Card, stack: BuildStack) => {
    setStealTargetCard(card);
    setStealTargetStack(stack);
    setShowStealModal(true);
  }, []);

  const closeStealModal = useCallback(() => {
    setShowStealModal(false);
    setStealTargetCard(null);
    setStealTargetStack(null);
  }, []);

  return {
    // Play modal
    showPlayModal,
    selectedTempStack,
    openPlayModal,
    closePlayModal,
    // Steal modal
    showStealModal,
    stealTargetCard,
    stealTargetStack,
    openStealModal,
    closeStealModal,
  };
}
