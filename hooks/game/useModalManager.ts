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

  // Extend build modal
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendTargetBuild, setExtendTargetBuild] = useState<BuildStack | null>(null);

  // Confirm Temp Build Value Modal (for double-click on temp stacks)
  const [showConfirmTempBuild, setShowConfirmTempBuild] = useState(false);
  const [confirmTempBuildStack, setConfirmTempBuildStack] = useState<TempStack | null>(null);

  // Capture Or Steal Modal (for small builds when player has choice)
  const [showCaptureOrStealModal, setShowCaptureOrStealModal] = useState(false);
  const [captureOrStealData, setCaptureOrStealData] = useState<{
    card: Card;
    buildValue: number;
    buildCards: Card[];
    extendedTarget: number;
    stackId: string;
  } | null>(null);

  // Track when a steal happened - for showing end turn button
  const [showEndTurnButton, setShowEndTurnButton] = useState(false);

  // Callbacks
  const openPlayModal = useCallback((stack: TempStack) => {
    console.log('[Debug] openPlayModal START, stack:', stack?.stackId);
    setShowPlayModal(true);
    setSelectedTempStack(stack);
    console.log('[Debug] openPlayModal complete, showPlayModal:', true);
  }, []);

  const closePlayModal = useCallback(() => {
    console.log('[Debug] closePlayModal START');
    setShowPlayModal(false);
    setSelectedTempStack(null);
    console.log('[Debug] closePlayModal complete, showPlayModal:', false);
  }, []);

  const openStealModal = useCallback((card: Card, stack: BuildStack) => {
    setShowStealModal(true);
    setStealTargetCard(card);
    setStealTargetStack(stack);
  }, []);

  const closeStealModal = useCallback(() => {
    setShowStealModal(false);
    setStealTargetCard(null);
    setStealTargetStack(null);
  }, []);

  const openExtendModal = useCallback((stack: BuildStack) => {
    setShowExtendModal(true);
    setExtendTargetBuild(stack);
  }, []);

  const closeExtendModal = useCallback(() => {
    setShowExtendModal(false);
    setExtendTargetBuild(null);
  }, []);

  const openConfirmTempBuildModal = useCallback((stack: TempStack) => {
    setShowConfirmTempBuild(true);
    setConfirmTempBuildStack(stack);
  }, []);

  const closeConfirmTempBuildModal = useCallback(() => {
    setShowConfirmTempBuild(false);
    setConfirmTempBuildStack(null);
  }, []);

  const openCaptureOrStealModal = useCallback((data: {
    card: Card;
    buildValue: number;
    buildCards: Card[];
    extendedTarget: number;
    stackId: string;
    showStealOnly?: boolean;
  }) => {
    setCaptureOrStealData(data);
    setShowCaptureOrStealModal(true);
  }, []);

  const closeCaptureOrStealModal = useCallback(() => {
    setShowCaptureOrStealModal(false);
    setCaptureOrStealData(null);
  }, []);

  const onStealCompleted = useCallback(() => {
    setShowEndTurnButton(true);
  }, []);

  const hideEndTurnButton = useCallback(() => {
    setShowEndTurnButton(false);
  }, []);

  const clearPendingChoice = useCallback(() => {
    setCaptureOrStealData(null);
  }, []);

  const setAutoCapture = useCallback((stackId: string, captureValue: number) => {
    setPendingAutoCapture({ stackId, captureValue });
  }, []);
  
  const clearAutoCapture = useCallback(() => {
    setPendingAutoCapture(null);
  }, []);
  
  return {
    showPlayModal,
    selectedTempStack,
    openPlayModal,
    closePlayModal,
    pendingAutoCapture,
    setAutoCapture,
    clearAutoCapture,
    showStealModal,
    stealTargetCard,
    stealTargetStack,
    openStealModal,
    closeStealModal,
    showExtendModal,
    extendTargetBuild,
    openExtendModal,
    closeExtendModal,
    showConfirmTempBuild,
    confirmTempBuildStack,
    openConfirmTempBuildModal,
    closeConfirmTempBuildModal,
    showEndTurnButton,
    onStealCompleted,
    hideEndTurnButton,
    clearPendingChoice,
    showCaptureOrStealModal,
    captureOrStealData,
    openCaptureOrStealModal,
    closeCaptureOrStealModal,
  };
}

export default useModalManager;