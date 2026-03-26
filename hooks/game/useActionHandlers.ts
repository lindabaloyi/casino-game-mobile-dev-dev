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

  const handleAcceptClick = useCallback((stackId: string) => {
    const stack = table.find((tc: any) => tc.stackId === stackId) as TempStack | undefined;
    if (stack) {
      // Always show modal - no auto-capture (user must choose build value)
      modals.openPlayModal(stack);
    }
  }, [table, modals]);

  const handleConfirmPlay = useCallback((buildValue: number, originalOwner?: number) => {
    if (modals.selectedTempStack) {
      actions.acceptTemp(modals.selectedTempStack.stackId, buildValue, originalOwner);
    }
    modals.closePlayModal();
  }, [modals, actions]);

  const handleConfirmSteal = useCallback((playerHand: Card[]) => {
    // Validate that the target card is in the player's hand (steal can only use hand cards)
    if (!modals.stealTargetCard || !modals.stealTargetStack) {
      console.log('[handleConfirmSteal] No steal target - closing modal');
      modals.closeStealModal();
      return;
    }
    
    // Verify card is in player's hand
    const cardInHand = playerHand?.some(
      (c: Card) => c.rank === modals.stealTargetCard?.rank && c.suit === modals.stealTargetCard?.suit
    );
    
    if (!cardInHand) {
      console.log('[handleConfirmSteal] Card not in hand - cannot steal');
      // Card is not in hand - cannot proceed with steal
      modals.closeStealModal();
      return;
    }
    
    console.log('[handleConfirmSteal] Confirming steal with card:', modals.stealTargetCard.rank, modals.stealTargetCard.suit);
    actions.stealBuild(modals.stealTargetCard, modals.stealTargetStack.stackId);
    modals.closeStealModal();
    // Show end turn button after successful steal
    modals.onStealCompleted();
  }, [modals, actions]);

  const handleExtendBuild = useCallback((card: any, buildStackId: string, cardSource: 'table' | 'hand' | 'captured' | `captured_${number}` = 'table') => {
    actions.extendBuild(card, buildStackId, cardSource);
    // End the drag to clear ghost overlay
    onDragEndWrapper();
  }, [actions, onDragEndWrapper]);

  const handleExtendAcceptClick = useCallback((stackId: string) => {
    const stack = table.find((tc: any) => tc.stackId === stackId) as BuildStack | undefined;
    if (stack?.pendingExtension?.looseCard || stack?.pendingExtension?.cards) {
      // Pass stackId - server already has the pending cards
      actions.acceptBuildExtension(stackId);
    }
  }, [table, actions]);

  const handleDeclineExtend = useCallback((stackId: string) => {
    actions.declineBuildExtension(stackId);
  }, [actions]);

  return {
    handleCapture,
    handleTrail,
    handleAcceptClick,
    handleConfirmPlay,
    handleConfirmSteal,
    handleExtendBuild,
    handleExtendAcceptClick,
    handleDeclineExtend,
  };
}
