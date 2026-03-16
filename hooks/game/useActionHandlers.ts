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

  const handleTrail = useCallback(
    (card: any) => {
      // In PARTY mode: allow trailing anytime (no restrictions)
      // In DUEL mode:
      //   - Round 1: prevent trailing if player has active build or temp stack
      //   - Round 2: allow trailing even with active build or temp stack
      const isDuelMode = !isPartyMode;
      const isRound2 = roundNumber >= 2;
      
      if (isDuelMode && !isRound2) {
        // Check if player has an active build (blocks trailing in duel mode only, round 1)
        const hasActiveBuild = table.some(
          (tc: any) => tc.type === 'build_stack' && tc.owner === playerNumber
        );
        
        // Check if player has an unresolved temp stack (also blocks trailing in duel mode only, round 1)
        const hasUnresolvedTemp = table.some(
          (tc: any) => tc.type === 'temp_stack' && tc.owner === playerNumber
        );
        
        if (hasActiveBuild) {
          onDragEndWrapper();
          return;
        }
        
        if (hasUnresolvedTemp) {
          onDragEndWrapper();
          return;
        }
      }
      
      // In round 2 or party mode, allow trailing without restrictions
      actions.trail(card);
    },
    [actions, table, playerNumber, onDragEndWrapper, isPartyMode, roundNumber],
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

  const handleConfirmSteal = useCallback(() => {
    if (modals.stealTargetCard && modals.stealTargetStack) {
      actions.stealBuild(modals.stealTargetCard, modals.stealTargetStack.stackId);
    }
    modals.closeStealModal();
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
