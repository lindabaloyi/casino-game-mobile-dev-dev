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
import { ConfirmTempBuildModal } from '../modals/ConfirmTempBuildModal';

interface GameModalsProps {
  // Play Options Modal (for accepting temp stacks)
  showPlayModal: boolean;
  selectedTempStack: TempStack | null;
  playerHand: Card[];
  teamCapturedBuilds?: { [playerIndex: number]: { value: number; originalOwner: number; capturedBy: number; stackId: string; cards: any[] }[] };
  playerNumber: number;
  // Players array - needed for capture validation in team builds
  players?: { captures: Card[] }[];
  onConfirmPlay: (buildValue: number) => void;
  onCancelPlay: () => void;
  /** Optional callback for button click sound */
  onPlayButtonSound?: () => void;
  
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
  
  // Confirm Temp Build Value Modal (for double-click on temp stacks)
  showConfirmTempBuild?: boolean;
  confirmTempBuildStack?: TempStack | null;
  onConfirmTempBuild?: (value: number) => void;
  onCancelConfirmTempBuild?: () => void;
}

export function GameModals({
  showPlayModal,
  selectedTempStack,
  playerHand,
  teamCapturedBuilds,
  playerNumber,
  players,
  onConfirmPlay,
  onCancelPlay,
  onPlayButtonSound,
  
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
  
  showConfirmTempBuild,
  confirmTempBuildStack,
  onConfirmTempBuild,
  onCancelConfirmTempBuild,
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
          players={players}
          onConfirm={onConfirmPlay}
          onCancel={onCancelPlay}
          onPlayButtonSound={onPlayButtonSound}
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

      {/* Confirm Temp Build Value Modal - for double-click on temp stacks */}
      {showConfirmTempBuild && confirmTempBuildStack && (
        <ConfirmTempBuildModal
          visible={showConfirmTempBuild ?? false}
          stack={confirmTempBuildStack}
          onConfirm={onConfirmTempBuild ?? (() => {})}
          onCancel={onCancelConfirmTempBuild ?? (() => {})}
        />
      )}
    </>
  );
}

export default GameModals;
