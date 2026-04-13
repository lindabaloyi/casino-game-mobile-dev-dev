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
import { DisqualifiedPlayerModal } from '../modals/DisqualifiedPlayerModal';
import { CaptureOrStealModal } from '../modals/CaptureOrStealModal';

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
  
  // Game state info for modals
  /** Player count (2, 3, or 4) */
  playerCount?: number;
  /** Whether party mode is enabled */
  isPartyMode?: boolean;
  
  // Extend Build Modal (for confirming pending extensions)
  showExtendModal?: boolean;
  extendTargetBuild?: BuildStack | null;
  onConfirmExtend?: () => void;
  onDeclineExtend?: () => void;
  onPlayButtonSoundExtend?: () => void;
  
  // Confirm Temp Build Value Modal (for double-click on temp stacks)
  showConfirmTempBuild?: boolean;
  confirmTempBuildStack?: TempStack | null;
  onConfirmTempBuild?: (value: number) => void;
  onCancelConfirmTempBuild?: () => void;
  
  // Disqualified Player Modal (shown when player is eliminated from tournament)
  showDisqualifiedModal?: boolean;
  disqualifiedPlayerIndex?: number;
  disqualifiedTournamentScore?: number;
  disqualifiedFinalRank?: number;
  disqualifiedTotalPlayers?: number;
  disqualifiedEliminationRound?: string;
  disqualifiedRoundsSurvived?: number;
  onReturnToLobby?: () => void;
  onWatchTournament?: () => void;
  
  // Capture Or Steal Modal (shown when player has choice for small builds)
  showCaptureOrStealModal?: boolean;
  captureOrStealCard?: Card;
  captureOrStealBuildValue?: number;
  captureOrStealBuildCards?: Card[];
  captureOrStealExtendedTarget?: number;
  captureOrStealShowStealOnly?: boolean;
  onConfirmCapture?: () => void;
  onConfirmExtendChoice?: () => void;
  onCancelCaptureOrSteal?: () => void;
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
  
  playerCount = 2,
  isPartyMode = false,
  
  showExtendModal,
  extendTargetBuild,
  onConfirmExtend,
  onDeclineExtend,
  onPlayButtonSoundExtend,
  
  showConfirmTempBuild,
  confirmTempBuildStack,
  onConfirmTempBuild,
  onCancelConfirmTempBuild,
  
  showDisqualifiedModal,
  disqualifiedPlayerIndex,
  disqualifiedTournamentScore,
  disqualifiedFinalRank,
  disqualifiedTotalPlayers,
  disqualifiedEliminationRound,
  disqualifiedRoundsSurvived,
  onReturnToLobby,
  onWatchTournament,
  
  showCaptureOrStealModal,
  captureOrStealCard,
  captureOrStealBuildValue,
  captureOrStealBuildCards,
  captureOrStealExtendedTarget,
  captureOrStealShowStealOnly,
  onConfirmCapture,
  onConfirmExtendChoice,
  onCancelCaptureOrSteal,
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
          playerCount={playerCount}
          isPartyMode={isPartyMode}
          onConfirm={handleConfirmSteal}
          onCancel={onCancelSteal}
          onPlayButtonSound={onPlayButtonSound}
        />
      )}

      {/* Extend Build Modal - for confirming pending extensions */}
      {showExtendModal && extendTargetBuild && (
        <ExtendBuildModal
          visible={showExtendModal}
          buildStack={extendTargetBuild}
          playerHand={playerHand}
          onConfirm={onConfirmExtend ?? (() => {})}
          onCancel={onDeclineExtend ?? (() => {})}
          onPlayButtonSound={onPlayButtonSoundExtend}
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

      {/* Disqualified Player Modal - shown when player is eliminated from tournament */}
      {showDisqualifiedModal && (
        <DisqualifiedPlayerModal
          visible={showDisqualifiedModal}
          playerIndex={disqualifiedPlayerIndex ?? 0}
          tournamentScore={disqualifiedTournamentScore ?? 0}
          finalRank={disqualifiedFinalRank ?? 0}
          totalPlayers={disqualifiedTotalPlayers ?? 0}
          eliminationRound={disqualifiedEliminationRound ?? 'Unknown'}
          roundsSurvived={disqualifiedRoundsSurvived ?? 0}
          onReturnToLobby={onReturnToLobby ?? (() => {})}
          onWatchTournament={onWatchTournament}
        />
      )}

      {/* Capture Or Steal Modal - shown for small builds when player has choice */}
      {showCaptureOrStealModal && captureOrStealCard && (
        <CaptureOrStealModal
          visible={showCaptureOrStealModal ?? false}
          card={captureOrStealCard}
          buildValue={captureOrStealBuildValue ?? 0}
          buildCards={captureOrStealBuildCards ?? []}
          extendedTarget={captureOrStealExtendedTarget ?? 0}
          showStealOnly={captureOrStealShowStealOnly ?? false}
          onCapture={onConfirmCapture ?? (() => {})}
          onExtend={onConfirmExtendChoice ?? (() => {})}
          onCancel={onCancelCaptureOrSteal ?? (() => {})}
        />
      )}
    </>
  );
}

export default GameModals;