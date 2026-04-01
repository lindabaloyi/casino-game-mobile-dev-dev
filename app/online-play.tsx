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

import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ActivityIndicator, 
  BackHandler,
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

export const options = {
  headerShown: false,
};

export default function OnlinePlayScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = (params.mode as GameMode) || 'party';
  const modeConfig = MODE_CONFIG[mode];

  // Handle hardware back button (Android)
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('[OnlinePlay] Hardware back button pressed');
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [router]);

  // NOTE: Web back button and beforeRemove handlers were removed because they
  // were causing infinite loops. Calling router.back() triggers more navigation
  // events which call router.back() again, creating an infinite loop.

  // Multiplayer game state
  const multiplayerResult = useMultiplayerGame({ mode });
  const { 
    gameState, 
    gameOverData,
    sendAction, 
    playerNumber,
    isConnected,
    playersInLobby,
    lobbyPlayers: serverLobbyPlayers,
    playerDisconnected,
    error,
    clearError,
    startNextRound,
    requestSync,
    opponentDrag,
    emitDragStart,
    emitDragMove,
    emitDragEnd,
  } = multiplayerResult;
  
  const { profile } = usePlayerProfile();
  
  // Tournament status
  const safePlayerNum = playerNumber ?? 0;
  const tournamentStatus = useTournamentStatus(gameState, safePlayerNum);
  
  // Set in-game mode for lower background music volume
  const { setInGameMode } = useSoundContext();
  
  // Set in-game mode when game starts
  useEffect(() => {
    if (gameState != null) {
      setInGameMode(true);
    }
    return () => {
      setInGameMode(false);
    };
  }, [gameState, setInGameMode]);
  
  // Mock lobby data (replace with real data in production)
  // FIXED: Use server's lobbyPlayers directly when available to ensure player names populate
  const useServerPlayers = serverLobbyPlayers && serverLobbyPlayers.length > 0;
  
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
  });

  // DEBUG: Log the player data flow
  console.log('[OnlinePlay] serverLobbyPlayers:', JSON.stringify(serverLobbyPlayers));
  console.log('[OnlinePlay] lobbyPlayers after useLobbyMock:', JSON.stringify(lobbyPlayers));

  // Not connected yet - show connecting screen
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectingCard}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.connectingTitle}>Connecting...</Text>
          <Text style={styles.connectingSubtitle}>{modeConfig.connectingSubtitle}</Text>
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
        onCopyRoomCode={() => {
          // Copy room code to clipboard - implement with Clipboard API
          console.log('Copy room code');
        }}
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
          qualifiedPlayers={tournamentStatus.qualifiedPlayers.map((playerIndex, idx) => ({
            playerIndex,
            score: {
              ...tournamentStatus.qualificationScores[playerIndex],
              rank: idx + 1
            }
          }))}
          eliminatedPlayers={Object.keys(tournamentStatus.playerStatuses)
            .map(Number)
            .filter(idx => 
              // Include players NOT in the qualified list (they didn't qualify)
              !tournamentStatus.qualifiedPlayers.includes(idx)
            )
            .map(playerIndex => ({
              playerIndex,
              score: tournamentStatus.qualificationScores[playerIndex] || {
                totalPoints: tournamentStatus.tournamentScores[playerIndex] || 0,
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
