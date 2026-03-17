/**
 * GameButtons Component
 * Game mode selection buttons for HomeScreen
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GameButtonsProps {
  onCpuGame: () => void;
  onPlayOnline: () => void;
  onPrivateRoom: () => void;
}

export function GameButtons({ 
  onCpuGame, 
  onPlayOnline, 
  onPrivateRoom, 
}: GameButtonsProps) {
  const iconSize = 20;
  const buttonFontSize = 16;
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button} 
        onPress={onCpuGame}
        activeOpacity={0.7}
      >
        <Ionicons name="person" size={iconSize} color="white" />
        <Text style={[styles.buttonText, { fontSize: buttonFontSize }]}>Vs AI</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.playOnlineButton} 
        onPress={onPlayOnline}
        activeOpacity={0.7}
      >
        <Ionicons name="globe" size={iconSize + 4} color="#0f4d0f" />
        <Text style={[styles.playOnlineButtonText, { fontSize: buttonFontSize + 2 }]}>
          Play Online
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.privateRoomButton} 
        onPress={onPrivateRoom}
        activeOpacity={0.7}
      >
        <Ionicons name="key" size={iconSize + 2} color="#0f4d0f" />
        <Text style={[styles.privateRoomButtonText, { fontSize: buttonFontSize + 2 }]}>
          Private Room
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 300,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 10,
  },
  playOnlineButton: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  playOnlineButtonText: {
    color: '#0f4d0f',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  privateRoomButton: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  privateRoomButtonText: {
    color: '#0f4d0f',
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default GameButtons;
