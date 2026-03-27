/**
 * GameButtons Component
 * Game mode selection buttons for HomeScreen
 * Updated design matching the new HTML mockup
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GameButtonsProps {
  onCpuGame: () => void;
  onPlayOnline: () => void;
  onPrivateRoom: () => void;
  onTournament: () => void;
}

export function GameButtons({ 
  onCpuGame, 
  onPlayOnline, 
  onPrivateRoom, 
  onTournament, 
}: GameButtonsProps) {
  return (
    <View style={styles.container}>
      {/* Vs AI Button */}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.vsAiButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={onCpuGame}
      >
        <Ionicons name="person" size={20} color="#f5f5f5" style={styles.icon} />
        <Text style={styles.vsAiButtonText}>Vs AI</Text>
      </Pressable>
      
      {/* Tournament Button */}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.tournamentButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={onTournament}
      >
        <Ionicons name="trophy" size={20} color="#f5c842" style={styles.icon} />
        <Text style={styles.tournamentButtonText}>Tournament</Text>
      </Pressable>
      
      {/* Play Online Button */}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.onlineButton,
          pressed && styles.onlineButtonPressed,
        ]}
        onPress={onPlayOnline}
      >
        <Ionicons name="globe" size={20} color="#0f3318" style={styles.icon} />
        <Text style={styles.onlineButtonText}>Play Online</Text>
      </Pressable>
      
      {/* Private Room Button */}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.privateButton,
          pressed && styles.onlineButtonPressed,
        ]}
        onPress={onPrivateRoom}
      >
        <Ionicons name="key" size={20} color="#0f3318" style={styles.icon} />
        <Text style={styles.onlineButtonText}>Private Room</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },
  // Vs AI - Dark with green border
  vsAiButton: {
    backgroundColor: '#0f3318',
    borderWidth: 1.5,
    borderColor: '#2a6632',
  },
  vsAiButtonText: {
    color: '#f5f5f5',
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    flexShrink: 0,
  },
  // Tournament - Dark with gold border
  tournamentButton: {
    backgroundColor: '#0f3318',
    borderWidth: 1.5,
    borderColor: '#f5c842',
  },
  tournamentButtonText: {
    color: '#f5c842',
    fontSize: 16,
    fontWeight: '600',
  },
  // Play Online - Gold filled
  onlineButton: {
    backgroundColor: '#f5c842',
    borderWidth: 0,
    borderColor: '#f5c842',
  },
  onlineButtonPressed: {
    backgroundColor: '#fad84a',
  },
  onlineButtonText: {
    color: '#0f3318',
    fontSize: 16,
    fontWeight: '600',
  },
  // Private Room - Gold filled
  privateButton: {
    backgroundColor: '#f5c842',
    borderWidth: 0,
    borderColor: '#f5c842',
  },
});

export default GameButtons;
