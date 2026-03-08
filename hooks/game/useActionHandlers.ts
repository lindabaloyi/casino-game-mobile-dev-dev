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
      // Check if player has an active build (blocks trailing)
      const hasActiveBuild = table.some(
        (tc: any) => tc.type === 'build_stack' && tc.owner === playerNumber
      );
      
      // Check if player has an unresolved temp stack (also blocks trailing)
      const hasUnresolvedTemp = table.some(
        (tc: any) => tc.type === 'temp_stack' && tc.owner === playerNumber
      );
      
      if (hasActiveBuild) {
        console.log(`[GameBoard] Cannot trail - player ${playerNumber} has an active build`);
        onDragEndWrapper();
        return;
      }
      
      if (hasUnresolvedTemp) {
        console.log(`[GameBoard] Cannot trail - player ${playerNumber} has an unresolved temp stack`);
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
      const targetStack = modals.stealTargetStack as any;
      console.log(`[useActionHandlers] handleConfirmSteal called:`);
      console.log(`  - handCard: ${modals.stealTargetCard.rank}${modals.stealTargetCard.suit}`);
      console.log(`  - targetStack: ${modals.stealTargetStack.stackId}`);
      console.log(`  - targetStack.hasBase: ${modals.stealTargetStack.hasBase}`);
      console.log(`  - targetStack.buildType: ${targetStack.buildType}`);
      
      actions.stealBuild(modals.stealTargetCard, modals.stealTargetStack.stackId);
    }
    modals.closeStealModal();
  }, [modals, actions]);

  const handleExtendBuild = useCallback((card: any, buildStackId: string, cardSource: 'table' | 'hand' | 'captured' = 'table') => {
    console.log(`[GameBoard] extendBuild - card: ${card.rank}${card.suit}, stackId: ${buildStackId}, cardSource: ${cardSource}`);
    actions.extendBuild(card, buildStackId, cardSource);
    // End the drag to clear ghost overlay
    onDragEndWrapper();
  }, [actions, onDragEndWrapper]);

  const handleExtendAcceptClick = useCallback((stackId: string) => {
    const stack = table.find((tc: any) => tc.stackId === stackId) as BuildStack | undefined;
    if (stack?.pendingExtension?.looseCard || stack?.pendingExtension?.cards) {
      console.log(`[GameBoard] Extend Accept clicked for ${stackId}`);
      // Just pass stackId - server already has the pending cards
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
