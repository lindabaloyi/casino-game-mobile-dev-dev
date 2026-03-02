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

  // Extend build modal
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendTargetBuild, setExtendTargetBuild] = useState<BuildStack | null>(null);

  const openExtendModal = useCallback((stack: BuildStack) => {
    setExtendTargetBuild(stack);
    setShowExtendModal(true);
  }, []);

  const closeExtendModal = useCallback(() => {
    setShowExtendModal(false);
    setExtendTargetBuild(null);
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
    // Extend build modal
    showExtendModal,
    extendTargetBuild,
    openExtendModal,
    closeExtendModal,
  };
}
