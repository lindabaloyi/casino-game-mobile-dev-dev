import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSocketConnection, useRoom } from '../hooks/multiplayer';
import type { GameMode } from '../hooks/multiplayer';

export const options = {
  headerShown: false,
};

export default function JoinRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: GameMode; code?: string }>();
  
  // Determine game mode from params
  const gameMode: GameMode = params.mode === 'party' ? 'party' : (params.mode === 'three-hands' ? 'three-hands' : 'two-hands');

  const [roomCode, setRoomCode] = useState(params.code || '');
  const [isJoining, setIsJoining] = useState(!!params.code);

  // Connect to server (use 'private' mode to skip auto-queue joining)
  const { socket, isConnected, error: connectionError } = useSocketConnection({ mode: 'private' });
  
  // Room management
  const { room, error: roomError, joinRoom, leaveRoom } = useRoom(socket);

  // Track if we've already navigated to prevent double navigation
  const hasNavigatedRef = useRef(false);

  // Auto-join when code is provided and connected
  useEffect(() => {
    if (isConnected && params.code && !room.roomCode && !roomError && !hasNavigatedRef.current) {
      joinRoom(params.code.toUpperCase());
    }
  }, [isConnected, params.code, room.roomCode, roomError]);

  // Handle connection error
  useEffect(() => {
    if (connectionError) {
      Alert.alert('Connection Error', connectionError, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [connectionError, router]);

  // Handle room error
  useEffect(() => {
    if (roomError) {
      Alert.alert('Room Error', roomError, [
        { text: 'OK', onPress: () => {} }
      ]);
      setIsJoining(false);
    }
  }, [roomError]);

  // Navigate to shared lobby once room is joined
  useEffect(() => {
    if (room.roomCode && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      console.log('[JoinRoom] Room joined, navigating to shared lobby:', room.roomCode);
      router.replace(`/online-play?mode=${gameMode}&roomCode=${room.roomCode}` as any);
    }
  }, [room.roomCode, gameMode, router]);

  const handleBack = () => {
    if (room.roomCode) {
      leaveRoom();
    }
    hasNavigatedRef.current = true;
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

  // Show loading state while joining
  if (isJoining && !room.roomCode) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Joining room...</Text>
      </View>
    );
  }

  // If already in room (shouldn't happen since we navigate to lobby)
  if (room.roomCode) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Entering lobby...</Text>
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
      <Text style={styles.subtitle}>Enter a room code to join</Text>

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
  loadingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 16,
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
});
