/**
 * Online Play Screen - Simplified for Private Rooms
 * 
 * Clean separation:
 * - useSocketConnection: connection lifecycle
 * - useRoom: room lifecycle (create/join/leave)
 * - useGameState: game state (game-start, game-update)
 */

import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  BackHandler,
  Clipboard,
  Alert,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Lobby } from '../components/lobby/Lobby';
import { GameRoomContainer } from '../components/lobby/GameRoomContainer';
import { ErrorScreen } from '../components/lobby/ErrorScreen';
import { useSocketConnection, useOpponentDrag } from '../hooks/multiplayer';
import { useRoom } from '../hooks/useRoom';
import { useGameState } from '../hooks/useGameSession';
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

  const { setInGameMode } = useSoundContext();

  // Connection - handles both public matchmaking and private room detection
  const { socket, isConnected } = useSocketConnection({ 
    mode, 
    roomCode: roomCodeParam 
  });

  // Room - handles room lifecycle (create/join/leave)
  // Auto-joins when roomCode is provided
  const room = useRoom(socket, { roomCode: roomCodeParam });

  // Game state - listens for game-start, game-update
  const game = useGameState(socket);

  const opponentDrag = useOpponentDrag(socket);

  useEffect(() => {
    if (game.gameState != null) {
      setInGameMode(true);
    } else {
      setInGameMode(false);
    }
  }, [game.gameState, setInGameMode]);

  const handleCopyRoomCode = () => {
    const code = roomCodeParam || room.room.roomCode;
    if (code) {
      Clipboard.setString(code);
      Alert.alert('Copied!', `Room code "${code}" copied to clipboard`);
    }
  };

  // Not connected - show connecting
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectingCard}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.connectingTitle}>Connecting...</Text>
          <Text style={styles.connectingSubtitle}>
            {roomCodeParam ? 'Joining private room...' : modeConfig.connectingSubtitle}
          </Text>
        </View>
      </View>
    );
  }

  // Room error
  if (room.error) {
    return <ErrorScreen type="error" message={room.error} />;
  }

  // Private room - show lobby while waiting for players
  if (roomCodeParam && (room.room.status === 'waiting' || room.room.status === 'ready')) {
    return (
      <Lobby
        mode={mode}
        modeConfig={modeConfig}
        socket={socket}
        playersInLobby={room.room.playerCount}
        isConnected={true}
        onCopyRoomCode={handleCopyRoomCode}
        roomCode={roomCodeParam}
      />
    );
  }

  // No game state - show lobby
  if (!game.gameState) {
    return (
      <Lobby
        mode={mode}
        modeConfig={modeConfig}
        socket={socket}
        playersInLobby={0}
        isConnected={true}
        onCopyRoomCode={handleCopyRoomCode}
      />
    );
  }

  // Game state exists - show game board
  return (
    <GameRoomContainer
      gameState={game.gameState}
      gameOverData={game.gameOverData}
      playerNumber={game.playerNumber}
      sendAction={game.sendAction}
      startNextRound={() => {}}
      onRestart={() => {
        game.requestSync();
      }}
      onBackToMenu={() => {
        router.replace('/(tabs)');
      }}
      error={null}
      clearError={() => {}}
      opponentDrag={opponentDrag?.opponentDrag}
      emitDragStart={opponentDrag?.emitDragStart}
      emitDragMove={opponentDrag?.emitDragMove}
      emitDragEnd={opponentDrag?.emitDragEnd}
      emitDragStackStart={opponentDrag?.emitDragStackStart}
      emitDragStackMove={opponentDrag?.emitDragStackMove}
      emitDragStackEnd={opponentDrag?.emitDragStackEnd}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
  },
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