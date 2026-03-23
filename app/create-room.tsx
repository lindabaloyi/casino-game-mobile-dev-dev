import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSocketConnection, useRoom, useGameStateSync } from '../hooks/multiplayer';
import type { GameMode } from '../hooks/multiplayer';

export const options = {
  headerShown: false,
};

export default function CreateRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: GameMode }>();
  
  // Determine game mode from params
<<<<<<< HEAD
  const gameMode: GameMode = params.mode === 'party' ? 'party' : (params.mode === 'three-hands' ? 'three-hands' : 'two-hands');
  const maxPlayers = gameMode === 'party' ? 4 : (gameMode === 'three-hands' ? 3 : 2);
  const modeLabel = gameMode === 'party' ? 'Party Mode (4 Players)' : (gameMode === 'three-hands' ? 'Three Hands (3 Players)' : 'Two Hands (2 Players)');
=======
  const gameMode: GameMode = params.mode === 'party' ? 'party' : '2-hands';
  const maxPlayers = gameMode === 'party' ? 4 : 2;
  const modeLabel = gameMode === 'party' ? 'Party Mode (4 Players)' : '2 Hands (2 Players)';
>>>>>>> sort-building

  // Connect to server
  const { socket, isConnected, error: connectionError } = useSocketConnection({ mode: gameMode });
  
  // Room management
  const { room, error: roomError, createRoom, leaveRoom, startGame } = useRoom(socket);
  
  // Game state sync (for when game starts)
  const gameSync = useGameStateSync(socket);

  // Create room on mount if connected
  useEffect(() => {
    if (isConnected && room.status === 'none') {
      createRoom(gameMode, maxPlayers);
    }
  }, [isConnected]);

  // Navigate to game when room game starts
  useEffect(() => {
    if (room.status === 'started' && gameSync.gameState) {
<<<<<<< HEAD
      router.replace(gameMode === 'party' ? '/party-game' : '/2-hands');
=======
      router.replace('/online-play');
>>>>>>> feat-multi
    }
  }, [room.status, gameSync.gameState]);

  // Handle connection error
  useEffect(() => {
    if (connectionError) {
      Alert.alert('Connection Error', connectionError, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [connectionError]);

  // Handle room error
  useEffect(() => {
    if (roomError) {
      Alert.alert('Room Error', roomError, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [roomError]);

  const handleBack = () => {
    if (room.roomCode) {
      leaveRoom();
    }
    router.back();
  };

  const handleStartGame = () => {
    // For 2-hands mode, can start with 2 players
    // For party mode, need 4 players
<<<<<<< HEAD
    // For three-hands mode, need 3 players
    if (gameMode === 'two-hands' && room.playerCount < 2) {
=======
    if (gameMode === '2-hands' && room.playerCount < 2) {
>>>>>>> sort-building
      Alert.alert('Cannot Start', 'Need at least 2 players to start');
      return;
    }
    if (gameMode === 'party' && room.playerCount < 4) {
      Alert.alert('Cannot Start', 'Need 4 players to start party mode');
      return;
    }
    if (gameMode === 'three-hands' && room.playerCount < 3) {
      Alert.alert('Cannot Start', 'Need 3 players to start three-hands mode');
      return;
    }
    startGame();
  };

  // Loading state
  if (!isConnected || room.status === 'none') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Creating room...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>{modeLabel}</Text>

      {/* Room Code Display */}
      <View style={styles.roomCodeContainer}>
        <Text style={styles.roomCodeLabel}>Room Code</Text>
        <Text style={styles.roomCode}>{room.roomCode}</Text>
      </View>

      {/* Players List */}
      <View style={styles.playersContainer}>
        <Text style={styles.playersTitle}>
          Players ({room.playerCount}/{room.maxPlayers})
        </Text>
        {room.players.map((player, index) => (
          <View key={player.socketId} style={styles.playerRow}>
            <Text style={styles.playerName}>
              {player.isHost ? '👑 ' : ''}Player {index + 1}
            </Text>
            {player.isHost && <Text style={styles.hostBadge}>HOST</Text>}
          </View>
        ))}
        {/* Empty slots */}
        {Array.from({ length: room.maxPlayers - room.playerCount }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.playerRow}>
            <Text style={styles.emptySlot}>Waiting for player...</Text>
          </View>
        ))}
      </View>

      {/* Status */}
      <Text style={styles.statusText}>
        {room.status === 'ready' ? 'Room is full! Press Start Game.' : 'Waiting for players to join...'}
      </Text>

      {/* Start Button (Host only) */}
      {room.isHost && (
        <TouchableOpacity
          style={[
            styles.startButton,
            (room.playerCount < 2 || (gameMode === 'party' && room.playerCount < 4)) && styles.disabledButton
          ]}
          onPress={handleStartGame}
          disabled={room.playerCount < 2 || (gameMode === 'party' && room.playerCount < 4)}
        >
          <Text style={styles.startButtonText}>
            {gameMode === 'party' && room.playerCount < 4 
              ? `Need ${4 - room.playerCount} more player(s)` 
              : 'Start Game'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Waiting indicator */}
      {room.status !== 'ready' && (
        <ActivityIndicator size="small" color="#FFD700" style={styles.loader} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 30,
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 16,
  },
  roomCodeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  roomCodeLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  roomCode: {
    color: '#FFD700',
    fontSize: 42,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  playersContainer: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  playersTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerName: {
    color: 'white',
    fontSize: 16,
  },
  hostBadge: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptySlot: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 16,
    fontStyle: 'italic',
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
  },
  startButtonText: {
    color: '#0f4d0f',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 20,
  },
});
