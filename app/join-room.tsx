import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSocketConnection, useRoom, useGameStateSync } from '../hooks/multiplayer';
import type { GameMode } from '../hooks/multiplayer';

export const options = {
  headerShown: false,
};

export default function JoinRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: GameMode; code?: string }>();
  
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

  const [roomCode, setRoomCode] = useState(params.code || '');
  const [isJoining, setIsJoining] = useState(!!params.code);

  // Connect to server
  const { socket, isConnected, error: connectionError } = useSocketConnection({ mode: gameMode });
  
  // Room management
  const { room, error: roomError, joinRoom, leaveRoom } = useRoom(socket);
  
  // Game state sync (for when game starts)
  const gameSync = useGameStateSync(socket);

  // Auto-join when code is provided and connected
  useEffect(() => {
    if (isConnected && params.code && !room.roomCode && !roomError) {
      joinRoom(params.code.toUpperCase());
    }
  }, [isConnected, params.code]);

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
        { text: 'OK', onPress: () => {} }
      ]);
      setIsJoining(false);
    }
  }, [roomError]);

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

  const handleBack = () => {
    if (room.roomCode) {
      leaveRoom();
    }
    router.back();
  };

  const handleJoin = () => {
    if (!roomCode.trim()) {
      Alert.alert('Error', 'Please enter a room code');
      return;
    }
    if (roomCode.length !== 6) {
      Alert.alert('Error', 'Room code must be 6 characters');
      return;
    }
    
    setIsJoining(true);
    joinRoom(roomCode.trim().toUpperCase());
  };

  // Auto-navigate to lobby when joined
  useEffect(() => {
    if (room.roomCode && isJoining) {
      setIsJoining(false);
    }
  }, [room.roomCode]);

  // Show room lobby if joined
  if (room.roomCode) {
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
          {room.status === 'ready' 
            ? 'Room is full! Game starting...' 
            : room.isHost 
              ? 'Waiting for host to start game...'
              : 'Waiting for players...'}
        </Text>

        {/* Waiting indicator */}
        <ActivityIndicator size="small" color="#FFD700" style={styles.loader} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>Join Private Room</Text>
      <Text style={styles.subtitle}>{modeLabel}</Text>

      {/* Room Code Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Enter Room Code</Text>
        <TextInput
          style={styles.roomCodeInput}
          value={roomCode}
          onChangeText={(text) => setRoomCode(text.toUpperCase().slice(0, 6))}
          placeholder="ABC123"
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          autoCapitalize="characters"
          maxLength={6}
          autoCorrect={false}
          autoFocus
        />
      </View>

      {/* Join Button */}
      <TouchableOpacity
        style={[styles.joinButton, isJoining && styles.disabledButton]}
        onPress={handleJoin}
        disabled={isJoining || !isConnected}
      >
        {isJoining ? (
          <ActivityIndicator size="small" color="#0f4d0f" />
        ) : (
          <Text style={styles.joinButtonText}>Join Room</Text>
        )}
      </TouchableOpacity>

      {/* Loading state */}
      {!isConnected && (
        <Text style={styles.connectingText}>Connecting to server...</Text>
      )}
    </KeyboardAvoidingView>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 40,
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  inputLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginBottom: 10,
  },
  roomCodeInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 4,
    textAlign: 'center',
    width: '70%',
  },
  joinButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
  },
  joinButtonText: {
    color: '#0f4d0f',
    fontSize: 20,
    fontWeight: 'bold',
  },
  connectingText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginTop: 20,
  },
  // Lobby styles
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
  loader: {
    marginTop: 10,
  },
});
