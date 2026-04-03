/**
 * Online Play Screen - Unified Multiplayer Lobby
 * 
 * A unified networked game mode lobby that supports:
 * - 2 players (two-hands)
 * - 3 players (three-hands)
 * - 4 players (four-hands, party, freeforall, tournament)
 * 
 * Refactored to use separated components:
 * - useOnlinePlayConnection hook for connection abstraction
 * - Lobby component for UI
 * - GameRoomContainer for game rendering with tournament support
 * - ErrorScreen for error states
 */

import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ActivityIndicator, 
  BackHandler,
  Clipboard,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Lobby } from '../components/lobby/Lobby';
import { GameRoomContainer } from '../components/lobby/GameRoomContainer';
import { ErrorScreen } from '../components/lobby/ErrorScreen';
import { useOnlinePlayConnection } from '../hooks/useOnlinePlayConnection';
import { useLobbyMock } from '../hooks/useLobbyMock';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { useSoundContext } from '../hooks/useSoundContext';
import { MODE_CONFIG, GameMode } from '../utils/modeConfig';

export const options = {
  headerShown: false,
};

export default function OnlinePlayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; roomCode?: string }>();
  const mode = (params.mode as GameMode) || 'party';
  const roomCodeParam = params.roomCode || null;
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

  // Unified connection hook - handles both private room and matchmaking
  const connection = useOnlinePlayConnection({
    mode,
    roomCode: roomCodeParam,
  });

  // Debug logging to help track game mode
  useEffect(() => {
    console.log('[OnlinePlay] Screen params:', JSON.stringify({ mode, roomCode: roomCodeParam }));
    console.log('[OnlinePlay] Connection state:', JSON.stringify({
      mode: mode,
      roomCode: roomCodeParam,
      isPrivateRoom: connection.isPrivateRoom,
    }));
  }, [mode, roomCodeParam, connection.isPrivateRoom]);

  // Set in-game mode when game starts
  useEffect(() => {
    if (connection.gameState != null) {
      setInGameMode(true);
    }
    return () => {
      setInGameMode(false);
    };
  }, [connection.gameState, setInGameMode]);

// Mock lobby data (for display while waiting)
  const {
    lobbyPlayers,
    notification,
    notificationAnim,
    isReady,
    setIsReady,
  } = useLobbyMock({
    modeConfig,
    playersInLobby: connection.playersInLobby,
    profile,
    serverLobbyPlayers: connection.lobbyPlayers,
    initialReady: false,
    roomPlayers: connection.isPrivateRoom ? undefined : undefined,
    roomPlayerCount: connection.isPrivateRoom ? undefined : undefined,
  });

  // DEBUG: Log connection state and lobby data
  console.log('[OnlinePlay] ========== DEBUG LOBBY DATA ==========');
  console.log('[OnlinePlay] Connection state:', JSON.stringify({
    mode,
    roomCode: connection.roomCode,
    isPrivateRoom: connection.isPrivateRoom,
    isConnected: connection.isConnected,
    playersInLobby: connection.playersInLobby,
    gameState: connection.gameState,
    playerDisconnected: connection.playerDisconnected,
    error: connection.error,
  }, null, 2));
  console.log('[OnlinePlay] Lobby data from useLobbyMock:', JSON.stringify({
    lobbyPlayers: lobbyPlayers.map(p => ({ id: p.id, username: p.username, avatar: p.avatar, isReady: p.isReady })),
    playersInLobby: lobbyPlayers.length,
  }, null, 2));
  console.log('[OnlinePlay] Lobby props passed to Lobby component:', JSON.stringify({
    mode,
    modeConfig: modeConfig.title,
    playersInLobby: connection.playersInLobby,
    lobbyPlayers: lobbyPlayers.length,
    isReady,
    roomCode: connection.roomCode,
  }, null, 2));

  // Copy room code to clipboard
  const handleCopyRoomCode = () => {
    const code = connection.roomCode;
    if (code) {
      Clipboard.setString(code);
      Alert.alert('Copied!', `Room code "${code}" copied to clipboard`);
    }
  };

  // Not connected yet - show connecting screen
  if (!connection.isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectingCard}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.connectingTitle}>Connecting...</Text>
          <Text style={styles.connectingSubtitle}>
            {connection.isPrivateRoom ? 'Joining private room...' : modeConfig.connectingSubtitle}
          </Text>
        </View>
      </View>
    );
  }

  // Player disconnected - show reconnection prompt
  if (connection.playerDisconnected) {
    return <ErrorScreen type="disconnected" />;
  }

  // Show lobby if game hasn't started OR if game isn't fully ready
  // This ensures all players' games are initialized before navigation
  if (connection.gameState == null || !connection.gameReady || !connection.allClientsReady) {
    return (
      <Lobby
        mode={mode}
        modeConfig={modeConfig}
        playersInLobby={connection.playersInLobby}
        lobbyPlayers={lobbyPlayers}
        isReady={isReady}
        setIsReady={setIsReady}
        notification={notification}
        notificationAnim={notificationAnim}
        onCopyRoomCode={handleCopyRoomCode}
        roomCode={connection.roomCode}
        // Show loading state when game is initializing
        isGameStarting={connection.gameState != null && (!connection.gameReady || !connection.allClientsReady)}
      />
    );
  }

  // Show game with tournament support
  return (
    <GameRoomContainer
      gameState={connection.gameState as any}
      gameOverData={connection.gameOverData}
      playerNumber={connection.playerNumber}
      sendAction={connection.sendAction}
      startNextRound={connection.startNextRound}
      onRestart={() => {
        connection.requestSync();
      }}
      onBackToMenu={() => {
        console.log('[OnlinePlay] onBackToMenu called - navigating to /(tabs)');
        router.replace('/(tabs)');
      }}
      error={connection.error}
      clearError={connection.clearError}
      opponentDrag={connection.opponentDrag as any}
      emitDragStart={connection.emitDragStart as any}
      emitDragMove={connection.emitDragMove as any}
      emitDragEnd={connection.emitDragEnd as any}
    />
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
});