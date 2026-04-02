/**
 * GameRoomContainer
 * 
 * Handles the game rendering with tournament support.
 * Encapsulates:
 * - Tournament qualification review modal
 * - Spectator view for eliminated players
 * - GameBoard rendering
 * - Tournament status computation
 */

import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { GameBoard } from '../game/GameBoard';
import { useTournamentStatus } from '../../hooks/useTournamentStatus';
import { SpectatorView, QualificationReviewModal } from '../tournament';
import type { GameState, GameOverData, OpponentDragState } from '../../hooks/useMultiplayerGame';

export interface GameRoomContainerProps {
  gameState: GameState;
  gameOverData: GameOverData | null;
  playerNumber: number;
  sendAction: (action: { type: string; payload?: Record<string, unknown> }) => void;
  startNextRound: () => void;
  onRestart: () => void;
  onBackToMenu: () => void;
  error: string | null;
  clearError: () => void;
  opponentDrag: OpponentDragState | null;
  emitDragStart: (card: any, source: any, position: { x: number; y: number }) => void;
  emitDragMove: (card: any, position: { x: number; y: number }) => void;
  emitDragEnd: (card: any, position: { x: number; y: number }, outcome: any, targetType?: string, targetId?: string) => void;
  /** Number of players in the game (for spectator view) */
  playerCount?: number;
}

export const GameRoomContainer: React.FC<GameRoomContainerProps> = ({
  gameState,
  gameOverData,
  playerNumber,
  sendAction,
  startNextRound,
  onRestart,
  onBackToMenu,
  error,
  clearError,
  opponentDrag,
  emitDragStart,
  emitDragMove,
  emitDragEnd,
  playerCount = 4,
}) => {
  const router = useRouter();

  // Tournament status
  const tournamentStatus = useTournamentStatus(gameState, playerNumber);

  // Format error for GameBoard
  const serverErrorObj = error ? { message: error } : null;

  // Spectator view for eliminated players
  if (tournamentStatus.isSpectator && !tournamentStatus.isInQualificationReview) {
    return (
      <View style={styles.container}>
        <SpectatorView
          tournamentPhase={tournamentStatus.tournamentPhase}
          tournamentRound={tournamentStatus.tournamentRound}
          finalShowdownHandsPlayed={tournamentStatus.finalShowdownHandsPlayed}
          eliminationOrder={tournamentStatus.eliminationOrder}
          playerStatuses={tournamentStatus.playerStatuses}
          tournamentScores={tournamentStatus.tournamentScores}
          playerCount={gameState?.playerCount || playerCount}
          qualifiedPlayers={tournamentStatus.qualifiedPlayers}
        />
      </View>
    );
  }

  if (tournamentStatus.isInQualificationReview) {
    return (
      <View style={styles.container}>
        <QualificationReviewModal
          visible={true}
          currentPlayerIndex={playerNumber}
          qualifiedPlayers={tournamentStatus.qualifiedPlayers.map((playerId) => ({
            playerIndex: parseInt(playerId.replace('player_', '')),
            score: {
              ...tournamentStatus.qualificationScores[playerId],
              rank: tournamentStatus.qualifiedPlayers.indexOf(playerId) + 1
            }
          }))}
          eliminatedPlayers={Object.keys(tournamentStatus.playerStatuses)
            .filter(playerId => 
              !tournamentStatus.qualifiedPlayers.includes(playerId)
            )
            .map(playerId => ({
              playerIndex: parseInt(playerId.replace('player_', '')),
              score: tournamentStatus.qualificationScores[playerId] || {
                totalPoints: tournamentStatus.tournamentScores[playerId] || 0,
                cardPoints: 0,
                tenDiamondPoints: 0,
                twoSpadePoints: 0,
                acePoints: 0,
                spadeBonus: 0,
                cardCountBonus: 0,
              }
            }))}
          countdownSeconds={tournamentStatus.qualificationCountdown}
          onCountdownComplete={() => {
            console.log('[GameRoomContainer] Qualification countdown complete, advancing to next phase');
            sendAction({ type: 'advanceFromQualificationReview', payload: {} });
          }}
        />
        <GameBoard
          gameState={gameState as any}
          gameOverData={gameOverData}
          playerNumber={playerNumber}
          sendAction={sendAction}
          startNextRound={startNextRound}
          onRestart={onRestart}
          onBackToMenu={onBackToMenu}
          serverError={serverErrorObj}
          onServerErrorClose={clearError}
          opponentDrag={opponentDrag}
          emitDragStart={emitDragStart}
          emitDragMove={emitDragMove}
          emitDragEnd={emitDragEnd}
        />
      </View>
    );
  }

  // Normal game view
  return (
    <View style={styles.container}>
      <GameBoard
        gameState={gameState as any}
        gameOverData={gameOverData}
        playerNumber={playerNumber}
        sendAction={sendAction}
        startNextRound={startNextRound}
        onRestart={onRestart}
        onBackToMenu={onBackToMenu}
        serverError={serverErrorObj}
        onServerErrorClose={clearError}
        opponentDrag={opponentDrag}
        emitDragStart={emitDragStart}
        emitDragMove={emitDragMove}
        emitDragEnd={emitDragEnd}
      />
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
  } as const,
};

export default GameRoomContainer;