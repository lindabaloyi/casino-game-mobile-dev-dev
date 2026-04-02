/**
 * Online Play Screen - Unified Multiplayer Lobby
 * 
 * A unified networked game mode lobby that supports:
 * - 2 players (two-hands)
 * - 3 players (three-hands)
 * - 4 players (four-hands, party, freeforall, tournament)
 * 
 * Refactored to use separated components:
 * - Lobby component for UI
 * - useLobbyMock hook for mock data
 * - modeConfig for game mode settings
 */

import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ActivityIndicator, 
  BackHandler,
  Clipboard,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard } from '../components/game/GameBoard';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { useTournamentStatus } from '../hooks/useTournamentStatus';
import { SpectatorView, QualificationReviewModal } from '../components/tournament';
import { Lobby } from '../components/lobby/Lobby';
import { useLobbyMock } from '../hooks/useLobbyMock';
import { MODE_CONFIG, GameMode } from '../utils/modeConfig';
import { useSoundContext } from '../hooks/useSoundContext';
import { useRoom } from '../hooks/multiplayer';
import { useSocketConnection } from '../hooks/multiplayer';
import { useGameStateSync } from '../hooks/multiplayer';

export const options = {
  headerShown: false,
};

export default function OnlinePlayScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ mode?: string; roomCode?: string }>();
  const mode = (params.mode as GameMode) || 'party';
  const roomCodeParam = params.roomCode || null;
  const isPrivateRoom = !!roomCodeParam;
  const modeConfig = MODE_CONFIG[mode];

  // Handle hardware back button (Android)
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('[OnlinePlay] Hardware back button pressed');
      if (router.canGoBack()) {
        router.back();
      } else {
        console.log('[OnlinePlay] No back history - navigating to home');
        router.replace('/(tabs)');
      }
      return true;
    });

    return () => backHandler.remove();
  }, [router]);

  // Set in-game mode for lower background music volume
  const { setInGameMode } = useSoundContext();
  
  const { profile } = usePlayerProfile();

  // ── Private Room Path ─────────────────────────────────────────────────────
  // When a roomCode is provided, use useRoom for room state management
  // instead of the matchmaking queue system.
  const roomSocket = isPrivateRoom ? useSocketConnection({ mode: 'private' }) : null;
  const room = isPrivateRoom ? useRoom(roomSocket?.socket ?? null) : null;
  const roomGameSync = isPrivateRoom ? useGameStateSync(roomSocket?.socket ?? null) : null;

  // Navigate to game when private room game starts
  useEffect(() => {
    if (isPrivateRoom && room?.room.status === 'started' && roomGameSync?.gameState) {
      console.log('[OnlinePlay] Private room game started, transitioning to game board');
    }
  }, [isPrivateRoom, room?.room.status, roomGameSync?.gameState]);

  // ── Matchmaking Path ──────────────────────────────────────────────────────
  // Multiplayer game state (for matchmaking modes)
  const multiplayerResult = !isPrivateRoom ? useMultiplayerGame({ mode }) : null;
  const gameState = isPrivateRoom 
    ? (roomGameSync?.gameState ?? null) 
    : (multiplayerResult?.gameState ?? null);
  const gameOverData = multiplayerResult?.gameOverData ?? null;
  const sendAction = multiplayerResult?.sendAction ?? (() => {});
  const playerNumber = isPrivateRoom 
    ? (roomGameSync?.playerNumber ?? null) 
    : (multiplayerResult?.playerNumber ?? null);
  const isConnected = isPrivateRoom 
    ? (roomSocket?.isConnected ?? false) 
    : (multiplayerResult?.isConnected ?? false);
  const playersInLobby = isPrivateRoom 
    ? (room?.room.playerCount ?? 0) 
    : (multiplayerResult?.playersInLobby ?? 0);
  const serverLobbyPlayers = multiplayerResult?.lobbyPlayers ?? null;
  const matchmakingRoomCode = multiplayerResult?.roomCode ?? null;
  const playerDisconnected = multiplayerResult?.playerDisconnected ?? false;
  const error = multiplayerResult?.error ?? null;
  const clearError = multiplayerResult?.clearError ?? (() => {});
  const startNextRound = multiplayerResult?.startNextRound ?? (() => {});
  const requestSync = multiplayerResult?.requestSync ?? (() => {});
  const opponentDrag = multiplayerResult?.opponentDrag ?? null;
  const emitDragStart = multiplayerResult?.emitDragStart ?? (() => {});
  const emitDragMove = multiplayerResult?.emitDragMove ?? (() => {});
  const emitDragEnd = multiplayerResult?.emitDragEnd ?? (() => {});
  
  // Tournament status (only for tournament mode)
  const safePlayerNum = playerNumber ?? 0;
  const tournamentStatus = useTournamentStatus(gameState, safePlayerNum);
  
  // Set in-game mode when game starts
  useEffect(() => {
    if (gameState != null) {
      setInGameMode(true);
    }
    return () => {
      setInGameMode(false);
    };
  }, [gameState, setInGameMode]);
  
  // Mock lobby data
  const {
    lobbyPlayers,
    notification,
    notificationAnim,
    isReady,
    setIsReady,
  } = useLobbyMock({
    modeConfig,
    playersInLobby,
    profile,
    serverLobbyPlayers,
    initialReady: false,
    // Pass room data for private rooms
    roomPlayers: isPrivateRoom ? room?.room.players : undefined,
    roomPlayerCount: isPrivateRoom ? room?.room.playerCount : undefined,
  });

  // Copy room code to clipboard
  const handleCopyRoomCode = () => {
    const code = isPrivateRoom ? room?.room.roomCode : null;
    if (code) {
      Clipboard.setString(code);
      Alert.alert('Copied!', `Room code "${code}" copied to clipboard`);
    }
  };

  // Not connected yet - show connecting screen
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectingCard}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.connectingTitle}>Connecting...</Text>
          <Text style={styles.connectingSubtitle}>
            {isPrivateRoom ? 'Joining private room...' : modeConfig.connectingSubtitle}
          </Text>
        </View>
      </View>
    );
  }
  
  // Show game only when gameState exists
  const showGame = gameState != null;
  
  if (!showGame) {
    // Use the Lobby component
    return (
      <Lobby
        mode={mode}
        modeConfig={modeConfig}
        playersInLobby={playersInLobby}
        lobbyPlayers={lobbyPlayers}
        isReady={isReady}
        setIsReady={setIsReady}
        notification={notification}
        notificationAnim={notificationAnim}
        onCopyRoomCode={handleCopyRoomCode}
        roomCode={isPrivateRoom ? (room?.room.roomCode ?? null) : matchmakingRoomCode}
      />
    );
  }
  
  // Player disconnected - show reconnection prompt
  if (playerDisconnected) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Ionicons name="person-remove" size={48} color="#ff6b6b" />
          <Text style={styles.errorTitle}>Player Disconnected</Text>
          <Text style={styles.errorText}>
            A player has disconnected from the game.
          </Text>
          <Text style={styles.errorHint}>
            Waiting for reconnection or refresh to continue...
          </Text>
        </View>
      </View>
    );
  }
  
  // Handle null playerNumber
  const safePlayerNumber = playerNumber ?? 0;
  
  // Format error for GameBoard
  const serverErrorObj = error ? { message: error } : null;
  
  // Show game
  return (
    <View style={styles.container}>
      {/* Qualification Review Modal */}
      {tournamentStatus.isInQualificationReview && (
        <QualificationReviewModal
          visible={true}
          currentPlayerIndex={safePlayerNumber}
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
            console.log('[OnlinePlay] Qualification countdown complete, advancing to next phase');
            sendAction({ type: 'advanceFromQualificationReview', payload: {} });
          }}
        />
      )}

      {/* Spectator View for eliminated players */}
      {tournamentStatus.isSpectator && !tournamentStatus.isInQualificationReview ? (
        <SpectatorView
          tournamentPhase={tournamentStatus.tournamentPhase}
          tournamentRound={tournamentStatus.tournamentRound}
          finalShowdownHandsPlayed={tournamentStatus.finalShowdownHandsPlayed}
          eliminationOrder={tournamentStatus.eliminationOrder}
          playerStatuses={tournamentStatus.playerStatuses}
          tournamentScores={tournamentStatus.tournamentScores}
          playerCount={gameState?.playerCount || modeConfig.playerCount}
          qualifiedPlayers={tournamentStatus.qualifiedPlayers}
        />
      ) : !tournamentStatus.isInQualificationReview ? (
        <GameBoard
          gameState={gameState as any}
          gameOverData={gameOverData}
          playerNumber={safePlayerNumber}
          sendAction={sendAction}
          startNextRound={startNextRound}
          onRestart={() => {
            requestSync();
          }}
          onBackToMenu={() => {
            console.log('[OnlinePlay] onBackToMenu called - navigating to /(tabs)');
            router.replace('/(tabs)');
          }}
          serverError={serverErrorObj}
          onServerErrorClose={clearError}
          opponentDrag={opponentDrag}
          emitDragStart={emitDragStart}
          emitDragMove={emitDragMove}
          emitDragEnd={emitDragEnd}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
  },
  // Connecting Screen
  connectingCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  connectingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 20,
  },
  connectingSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  // Error Screen
  errorCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});