import { useCallback } from 'react';
import { TempStack, BuildStack } from '../../types';
import { useGameActions } from './useGameActions';
import { useModalManager } from './useModalManager';

export function useActionHandlers(
  actions: ReturnType<typeof useGameActions>,
  modals: ReturnType<typeof useModalManager>,
  table: any[],
  playerNumber: number,
  onDragEndWrapper: (...args: any[]) => void
) {
  const handleCapture = useCallback(
    (card: any, targetType: 'loose' | 'build', targetRank?: string, targetSuit?: string, targetStackId?: string) => {
      actions.capture(card, targetType, targetRank, targetSuit, targetStackId);
    },
    [actions],
  );

  const handleTrail = useCallback(
    (card: any) => {
      const hasActiveBuild = table.some(
        (tc: any) => tc.type === 'build_stack' && tc.owner === playerNumber
      );
      
      if (hasActiveBuild) {
        console.log(`[GameBoard] Cannot trail - player ${playerNumber} has an active build`);
        onDragEndWrapper();
        return;
      }
      
      actions.trail(card);
    },
    [actions, table, playerNumber, onDragEndWrapper],
  );

  const handleAcceptClick = useCallback((stackId: string) => {
    const stack = table.find((tc: any) => tc.stackId === stackId) as TempStack | undefined;
    if (stack) {
      modals.openPlayModal(stack);
    }
  }, [table, modals]);

  const handleConfirmPlay = useCallback((buildValue: number) => {
    if (modals.selectedTempStack) {
      actions.acceptTemp(modals.selectedTempStack.stackId, buildValue);
    }
    modals.closePlayModal();
  }, [modals, actions]);

  const handleConfirmSteal = useCallback(() => {
    if (modals.stealTargetCard && modals.stealTargetStack) {
      actions.stealBuild(modals.stealTargetCard, modals.stealTargetStack.stackId);
    }
    modals.closeStealModal();
  }, [modals, actions]);

  const handleExtendBuild = useCallback((card: any, buildStackId: string, cardSource: 'table' | 'hand' | 'captured' = 'table') => {
    console.log(`[GameBoard] extendBuild - card: ${card.rank}${card.suit}, stackId: ${buildStackId}, cardSource: ${cardSource}`);
    actions.extendBuild(card, buildStackId, cardSource);
  }, [actions]);

  const handleExtendAcceptClick = useCallback((stackId: string) => {
    const stack = table.find((tc: any) => tc.stackId === stackId) as BuildStack | undefined;
    if (stack?.pendingExtension?.looseCard || stack?.pendingExtension?.cards) {
      console.log(`[GameBoard] Extend Accept clicked for ${stackId}`);
      // Get the last card from pending (the one to add with)
      const pendingCards = stack.pendingExtension.cards;
      if (pendingCards && pendingCards.length > 0) {
        const lastPending = pendingCards[pendingCards.length - 1];
        console.log(`[GameBoard] Accepting with card: ${lastPending.card.rank}${lastPending.card.suit} from ${lastPending.source}`);
        // Cast source to the expected type
        const cardSource = lastPending.source as 'table' | 'hand' | 'captured';
        actions.acceptBuildExtension(stackId, lastPending.card, cardSource);
      } else if (stack.pendingExtension.looseCard) {
        // Legacy format
        console.log(`[GameBoard] Accepting with loose card: ${stack.pendingExtension.looseCard.rank}${stack.pendingExtension.looseCard.suit}`);
        actions.acceptBuildExtension(stackId, stack.pendingExtension.looseCard, stack.pendingExtension.looseCard.source || 'table');
      }
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
