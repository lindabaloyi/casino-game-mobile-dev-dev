/**
 * GameModals
 * Orchestrator for all game modals.
 * 
 * This component keeps GameBoard clean by consolidating all modal
 * rendering logic in one place.
 */

import React from 'react';
import { TempStack, Card, BuildStack } from '../../types';
import { PlayOptionsModal } from '../modals/PlayOptionsModal';
import { StealBuildModal } from '../modals/StealBuildModal';
import { ExtendBuildModal } from '../modals/ExtendBuildModal';

interface GameModalsProps {
  // Play Options Modal (for accepting temp stacks)
  showPlayModal: boolean;
  selectedTempStack: TempStack | null;
  playerHand: Card[];
  teamCapturedBuilds?: { 0: { value: number; originalOwner: number; capturedBy: number }[]; 1: { value: number; originalOwner: number; capturedBy: number }[] };
  playerNumber: number;
  onConfirmPlay: (buildValue: number) => void;
  onCancelPlay: () => void;
  
  // Steal Build Modal (for stealing opponent builds)
  showStealModal: boolean;
  stealTargetCard: Card | null;
  stealTargetStack: BuildStack | null;
  onConfirmSteal: () => void;
  onCancelSteal: () => void;
  onStealCompleted?: () => void;
  
  // Extend Build Modal (optional - not used in drag-drop flow)
  showExtendModal?: boolean;
  extendTargetBuild?: BuildStack | null;
  onAcceptExtend?: (handCard: Card) => void;
  onDeclineExtend?: () => void;
}

export function GameModals({
  showPlayModal,
  selectedTempStack,
  playerHand,
  teamCapturedBuilds,
  playerNumber,
  onConfirmPlay,
  onCancelPlay,
  
  showStealModal,
  stealTargetCard,
  stealTargetStack,
  onConfirmSteal,
  onCancelSteal,
  onStealCompleted,
  
  showExtendModal,
  extendTargetBuild,
  onAcceptExtend,
  onDeclineExtend,
}: GameModalsProps) {
  // Wrapper to call onStealCompleted when steal is confirmed
  const handleConfirmSteal = () => {
    onConfirmSteal();
    if (onStealCompleted) {
      onStealCompleted();
    }
  };
  return (
    <>
      {/* Play Options Modal - for accepting temp stacks */}
      {showPlayModal && selectedTempStack && (
        <PlayOptionsModal
          visible={showPlayModal}
          cards={selectedTempStack.cards}
          playerHand={playerHand}
          teamCapturedBuilds={teamCapturedBuilds}
          playerNumber={playerNumber}
          onConfirm={onConfirmPlay}
          onCancel={onCancelPlay}
        />
      )}

      {/* Steal Build Modal - for stealing opponent builds */}
      {showStealModal && stealTargetCard && stealTargetStack && (
        <StealBuildModal
          visible={showStealModal}
          handCard={stealTargetCard}
          buildCards={stealTargetStack.cards}
          buildValue={stealTargetStack.value}
          buildOwner={stealTargetStack.owner}
          playerNumber={playerNumber}
          onConfirm={handleConfirmSteal}
          onCancel={onCancelSteal}
        />
      )}

      {/* Extend Build Modal - not used in drag-drop flow but available */}
      {showExtendModal && extendTargetBuild && (
        <ExtendBuildModal
          visible={showExtendModal ?? false}
          buildStack={extendTargetBuild}
          playerHand={playerHand}
          onAccept={onAcceptExtend ?? (() => {})}
          onCancel={onDeclineExtend ?? (() => {})}
        />
      )}
    </>
  );
}

export default GameModals;
