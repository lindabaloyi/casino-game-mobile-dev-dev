import { useCallback } from 'react';
import { TempStack, BuildStack } from '../../types';
import { useGameActions } from './useGameActions';
import { useModalManager } from './useModalManager';

export function useActionHandlers(
  actions: ReturnType<typeof useGameActions>,
  modals: ReturnType<typeof useModalManager>,
  table: any[],
  playerNumber: number,
  onDragEndWrapper: (...args: any[]) => void,
  isPartyMode: boolean = false
) {
  const handleCapture = useCallback(
    (card: any, targetType: 'loose' | 'build', targetRank?: string, targetSuit?: string, targetStackId?: string) => {
      actions.capture(card, targetType, targetRank, targetSuit, targetStackId);
    },
    [actions],
  );

  const handleTrail = useCallback(
    (card: any) => {
      // In DUEL mode (not party): prevent trailing if player has active build or temp stack
      // In PARTY mode: allow trailing anytime (no restrictions)
      const isDuelMode = !isPartyMode;
      
      console.log(`[handleTrail] isPartyMode: ${isPartyMode}, isDuelMode: ${isDuelMode}, playerNumber: ${playerNumber}`);
      
      if (isDuelMode) {
        // Check if player has an active build (blocks trailing in duel mode only)
        const hasActiveBuild = table.some(
          (tc: any) => tc.type === 'build_stack' && tc.owner === playerNumber
        );
        
        // Check if player has an unresolved temp stack (also blocks trailing in duel mode only)
        const hasUnresolvedTemp = table.some(
          (tc: any) => tc.type === 'temp_stack' && tc.owner === playerNumber
        );
        
        if (hasActiveBuild) {
          console.log(`[GameBoard] Cannot trail - player ${playerNumber} has an active build (duel mode)`);
          onDragEndWrapper();
          return;
        }
        
        if (hasUnresolvedTemp) {
          console.log(`[GameBoard] Cannot trail - player ${playerNumber} has an unresolved temp stack (duel mode)`);
          onDragEndWrapper();
          return;
        }
      } else {
        console.log(`[handleTrail] PARTY MODE - allowing trail without restrictions`);
      }
      // In party mode, always allow trailing - no restrictions
      
      actions.trail(card);
    },
    [actions, table, playerNumber, onDragEndWrapper, isPartyMode],
  );

  const handleAcceptClick = useCallback((stackId: string) => {
    const stack = table.find((tc: any) => tc.stackId === stackId) as TempStack | undefined;
    if (stack) {
      modals.openPlayModal(stack);
    }
  }, [table, modals]);

  const handleConfirmPlay = useCallback((buildValue: number, originalOwner?: number) => {
    if (modals.selectedTempStack) {
      actions.acceptTemp(modals.selectedTempStack.stackId, buildValue, originalOwner);
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

  const handleExtendBuild = useCallback((card: any, buildStackId: string, cardSource: 'table' | 'hand' | 'captured' | `captured_${number}` = 'table') => {
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
