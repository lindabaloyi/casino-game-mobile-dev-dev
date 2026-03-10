/**
 * ReadyButton
 * 
 * Toggle button for ready/not ready state.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReadyButtonProps {
  isReady: boolean;
  onToggle: () => void;
}

export function ReadyButton({ isReady, onToggle }: ReadyButtonProps) {
  return (
    <TouchableOpacity 
      style={[
        styles.button,
        isReady && styles.buttonActive
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={isReady ? "checkmark-circle" : "hand-right"} 
        size={24} 
        color={isReady ? "#0f4d0f" : "#FFD700"} 
      />
      <Text style={[
        styles.buttonText,
        isReady && styles.buttonTextActive
      ]}>
        {isReady ? "I'm Ready!" : "Click When Ready"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  buttonActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  buttonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  buttonTextActive: {
    color: '#0f4d0f',
  },
});

export default ReadyButton;
