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
 * 
 * Data flow:
 * - useLobbyState (via useMultiplayerGame) is the single source of truth for lobbyPlayers
 * - Server events drive lobby state, no mock data
 */

import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  BackHandler,
  Clipboard,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Lobby } from '../components/lobby/Lobby';
import { GameRoomContainer } from '../components/lobby/GameRoomContainer';
import { ErrorScreen } from '../components/lobby/ErrorScreen';
import { useOnlinePlayConnection } from '../hooks/useOnlinePlayConnection';
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
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
      return true;
    });

    return () => backHandler.remove();
  }, [router]);

  // Set in-game mode for lower background music volume
  const { setInGameMode } = useSoundContext();

  // Unified connection hook - single source of truth for lobby state
  const connection = useOnlinePlayConnection({
    mode,
    roomCode: roomCodeParam,
  });

  // Set in-game mode when game starts
  useEffect(() => {
    if (connection.gameState != null) {
      setInGameMode(true);
    }
    return () => {
      setInGameMode(false);
    };
  }, [connection.gameState, setInGameMode]);

  // Copy room code to clipboard
  const handleCopyRoomCode = () => {
    const code = connection.roomCode;
    if (code) {
      Clipboard.setString(code);
      Alert.alert('Copied!', `Room code "${code}" copied to clipboard`);
    }
  };

  // Player disconnected - show reconnection prompt
  if (connection.playerDisconnected) {
    return <ErrorScreen type="disconnected" />;
  }

  // Show lobby while waiting for game to start (always - no separate connecting screen)
  if (connection.gameState == null || !connection.gameReady || !connection.allClientsReady) {
    return (
      <Lobby
        mode={mode}
        modeConfig={modeConfig}
        playersInLobby={connection.playersInLobby}
        lobbyPlayers={connection.lobbyPlayers}
        displayPlayers={connection.displayPlayers}
        isReady={connection.isReady || false}
        setIsReady={connection.toggleReady || (() => {})}
        notification={connection.newPlayerNotification}
        onCopyRoomCode={handleCopyRoomCode}
        roomCode={connection.roomCode}
        isGameStarting={connection.gameState != null && (!connection.gameReady || !connection.allClientsReady)}
        onNotificationDismiss={connection.clearNotification}
        isConnected={connection.isConnected}
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
});