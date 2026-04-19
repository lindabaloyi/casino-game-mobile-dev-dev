import { useCallback } from 'react';
import { TempStack, BuildStack, Card } from '../../types';
import { useGameActions } from './useGameActions';
import { useModalManager } from './useModalManager';

export function useActionHandlers(
  actions: ReturnType<typeof useGameActions>,
  modals: ReturnType<typeof useModalManager>,
  table: any[],
  playerNumber: number,
  onDragEndWrapper: (...args: any[]) => void,
  isPartyMode: boolean = false,
  roundNumber: number = 1,
  playerHand: Card[] = [],
  buildStacks: BuildStack[] = []
) {
  const handleCapture = useCallback(
    (card: any, targetType: 'loose' | 'build', targetRank?: string, targetSuit?: string, targetStackId?: string) => {
      actions.capture(card, targetType, targetRank, targetSuit, targetStackId);
    },
    [actions],
  );

  // Trail handler - all validation done server-side by TrailRouter
  // The server validates:
  // - Party mode: no restrictions
  // - Duel mode Round 1: cannot trail if player has active build
  // - Duel mode Round 2: allowed
  const handleTrail = useCallback(
    (card: any) => {
      // Simply forward to server - all business logic is handled by TrailRouter
      actions.trail(card);
    },
    [actions],
  );

  // Cleanup drag state before opening modal to prevent viewState conflicts
  const cleanupBeforeModal = useCallback(() => {
    console.log('[Modal:cleanup] Cleaning up drag before modal open');
    if (onDragEndWrapper) {
      onDragEndWrapper();
    }
  }, [onDragEndWrapper]);

  const handleAcceptClick = useCallback((stackId: string) => {
    const stack = table.find((tc: any) => tc.stackId === stackId) as TempStack | undefined;
    if (stack) {
      // Cleanup drag before showing modal
      cleanupBeforeModal();
      // Always show modal - no auto-capture (user must choose build value)
      modals.openPlayModal(stack);
    }
  }, [table, modals, cleanupBeforeModal]);

  const handleConfirmPlay = useCallback((buildValue: number, originalOwner?: number) => {
    if (modals.selectedTempStack) {
      actions.acceptTemp(modals.selectedTempStack.stackId, buildValue, originalOwner);
    }
    modals.closePlayModal();
  }, [modals, actions]);

  const handleConfirmSteal = useCallback((playerHand: Card[]) => {
    if (!modals.stealTargetCard || !modals.stealTargetStack) {
      modals.closeStealModal();
      return;
    }
    
    // Verify card is in player's hand
    const cardInHand = playerHand?.some(
      (c: Card) => c.rank === modals.stealTargetCard?.rank && c.suit === modals.stealTargetCard?.suit
    );
    
    if (!cardInHand) {
      modals.closeStealModal();
      return;
    }
    
    actions.stealBuild(modals.stealTargetCard, modals.stealTargetStack.stackId);
    modals.closeStealModal();
    modals.onStealCompleted();
  }, [modals, actions]);

  const handleExtendBuild = useCallback((card: any, buildStackId: string, cardSource: 'table' | 'hand' | 'captured' | `captured_${number}` = 'table') => {
    console.log('[useActionHandlers] handleExtendBuild:', { card: `${card?.rank}${card?.suit}`, buildStackId, cardSource });
    actions.extendBuild(card, buildStackId, cardSource);
    // End the drag to clear ghost overlay
    onDragEndWrapper();
  }, [actions, onDragEndWrapper]);

  // Open extend modal when player clicks Accept button on pending extension
  const handleExtendAcceptClick = useCallback((stackId: string) => {
    const stack = table.find((tc: any) => tc.stackId === stackId) as BuildStack | undefined;
    if (stack?.pendingExtension?.looseCard || stack?.pendingExtension?.cards) {
      // Cleanup drag before showing modal
      cleanupBeforeModal();
      modals.openExtendModal(stack);
    }
  }, [table, modals, cleanupBeforeModal]);

  // Player confirms the extension in modal
  const handleConfirmExtendAccept = useCallback(() => {
    const stack = modals.extendTargetBuild;
    if (stack) {
      actions.acceptBuildExtension(stack.stackId);
      modals.closeExtendModal();
    }
  }, [modals, actions]);

  // Player cancels the extension in modal
  const handleCancelExtendAccept = useCallback(() => {
    const stack = modals.extendTargetBuild;
    if (stack) {
      actions.declineBuildExtension(stack.stackId);
      modals.closeExtendModal();
    }
  }, [modals, actions]);

  // Legacy handler - kept for backward compatibility
  const handleDeclineExtend = useCallback((stackId: string) => {
    actions.declineBuildExtension(stackId);
  }, [actions]);

  // Capture or Steal modal handlers
  const handleConfirmCaptureChoice = useCallback((choiceData: {
    card: Card;
    buildValue: number;
    buildCards: Card[];
    extendedTarget: number;
    stackId: string;
  }) => {
    // Send choice action with selectedOption: 'capture'
    // This clears pendingChoice on the server and processes the capture
    actions.choice(
      'capture',
      choiceData.card,
      choiceData.stackId,
      choiceData.buildValue,
      choiceData.extendedTarget
    );
    
    // Close the modal
    modals.closeCaptureOrStealModal();
    
    // Show end turn button after capture
    modals.onStealCompleted();
  }, [actions, modals]);


  const handleConfirmExtendChoice = useCallback((choiceData: {
    card: Card;
    buildValue: number;
    buildCards: Card[];
    extendedTarget: number;
    stackId: string;
  }) => {
    // Send stealBuild action directly - bypasses choice/extend router
    // This routes straight to stealBuild.js backend handler
    actions.stealBuild(choiceData.card, choiceData.stackId);
    
    // Close the modal
    modals.closeCaptureOrStealModal();
    
    // Show end turn button after successful steal
    modals.onStealCompleted();
  }, [actions, modals]);

  return {
    handleCapture,
    handleTrail,
    handleAcceptClick,
    handleConfirmPlay,
    handleConfirmSteal,
    handleExtendBuild,
    handleExtendAcceptClick,
    handleConfirmExtendAccept,
    handleCancelExtendAccept,
    handleDeclineExtend,
    handleConfirmCaptureChoice,
    handleConfirmExtendChoice,
  };
}
