import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSocketConnection, useRoom } from '../hooks/multiplayer';
import type { GameMode } from '../hooks/multiplayer/useRoom';

export const options = {
  headerShown: false,
};

export default function CreateRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: GameMode }>();
  
  // Determine game mode from params - support all game modes
  const gameMode: GameMode = ((params.mode as string) || 'two-hands') as GameMode;
  
  // Map game mode to max players
  const maxPlayers = (gameMode === 'party' || gameMode === 'four-hands') 
    ? 4 
    : (gameMode === 'three-hands' ? 3 : 2);

  // Connect to server (use 'private' mode to skip auto-queue joining)
  const { socket, isConnected, error: connectionError } = useSocketConnection({ mode: 'private' });
  
  // Room management
  const { room, error: roomError, createRoom, leaveRoom } = useRoom(socket);

  // Track if we've already navigated to prevent double navigation
  const hasNavigatedRef = useRef(false);

  // Create room on mount if connected
  useEffect(() => {
    if (isConnected && room.status === 'none' && !hasNavigatedRef.current) {
      createRoom(gameMode, maxPlayers);
    }
  }, [isConnected, room.status, gameMode, maxPlayers, createRoom]);

  // Navigate to shared lobby once room is created
  useEffect(() => {
    if (room.roomCode && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.replace(`/online-play?mode=${gameMode}&roomCode=${room.roomCode}` as any);
    }
  }, [room.roomCode, gameMode, router]);

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
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [roomError, router]);

  const handleBack = () => {
    if (room.roomCode) {
      leaveRoom();
    }
    hasNavigatedRef.current = true;
    router.back();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <ActivityIndicator size="large" color="#FFD700" />
      <Text style={styles.loadingText}>
        {room.roomCode ? 'Joining lobby...' : 'Creating room...'}
      </Text>
      {room.roomCode && (
        <Text style={styles.roomCodeHint}>Room code: {room.roomCode}</Text>
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
  loadingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 16,
  },
  roomCodeHint: {
    color: 'rgba(255, 215, 0, 0.7)',
    fontSize: 14,
    marginTop: 8,
  },
});
