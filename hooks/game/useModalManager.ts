/**
 * useModalManager
 * Hook for managing all modal state in GameBoard.
 */

import { useState, useCallback } from 'react';
import { TempStack, BuildStack, Card } from '../../types';

export function useModalManager() {
  // Play modal (for accepting temp stacks)
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [selectedTempStack, setSelectedTempStack] = useState<TempStack | null>(null);
  
  // Auto-capture state - for automatic temp stack capture
  const [pendingAutoCapture, setPendingAutoCapture] = useState<{
    stackId: string;
    captureValue: number;
  } | null>(null);

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

  // Confirm Temp Build Value Modal (for double-click on temp stacks)
  const [showConfirmTempBuild, setShowConfirmTempBuild] = useState(false);
  const [confirmTempBuildStack, setConfirmTempBuildStack] = useState<TempStack | null>(null);

  const openConfirmTempBuildModal = useCallback((stack: TempStack) => {
    console.log('[useModalManager] Opening confirm temp build modal for stack:', stack.stackId, 'value:', stack.value);
    setConfirmTempBuildStack(stack);
    setShowConfirmTempBuild(true);
  }, []);

  const closeConfirmTempBuildModal = useCallback(() => {
    console.log('[useModalManager] Closing confirm temp build modal');
    setShowConfirmTempBuild(false);
    setConfirmTempBuildStack(null);
  }, []);

  // Track when a steal happened - for showing end turn button
  const [showEndTurnButton, setShowEndTurnButton] = useState(false);

  const onStealCompleted = useCallback(() => {
    setShowEndTurnButton(true);
  }, []);

  const hideEndTurnButton = useCallback(() => {
    setShowEndTurnButton(false);
  }, []);

  // Auto-capture helper
  const setAutoCapture = useCallback((stackId: string, captureValue: number) => {
    setPendingAutoCapture({ stackId, captureValue });
  }, []);
  
  const clearAutoCapture = useCallback(() => {
    setPendingAutoCapture(null);
  }, []);
  
  return {
    // Play modal
    showPlayModal,
    selectedTempStack,
    openPlayModal,
    closePlayModal,
    // Auto-capture
    pendingAutoCapture,
    setAutoCapture,
    clearAutoCapture,
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
    // Confirm temp build modal (double-click)
    showConfirmTempBuild,
    confirmTempBuildStack,
    openConfirmTempBuildModal,
    closeConfirmTempBuildModal,
    // End turn button (shown after steal)
    showEndTurnButton,
    onStealCompleted,
    hideEndTurnButton,
  };
}

export default useModalManager;
