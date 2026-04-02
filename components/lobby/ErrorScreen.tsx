/**
 * ErrorScreen
 * 
 * Displays error states for the online play screen.
 * Handles disconnected player state and connection errors.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ErrorScreenProps {
  /** Type of error to display */
  type: 'disconnected' | 'error';
  /** Custom title (overrides default) */
  title?: string;
  /** Custom message (overrides default) */
  message?: string;
  /** Additional hint text */
  hint?: string;
  /** Icon name */
  icon?: keyof typeof Ionicons.glyphMap;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  type,
  title,
  message,
  hint,
  icon,
}) => {
  const defaults = {
    disconnected: {
      title: 'Player Disconnected',
      message: 'A player has disconnected from the game.',
      hint: 'Waiting for reconnection or refresh to continue...',
      icon: 'person-remove' as const,
    },
    error: {
      title: 'Error',
      message: 'An error occurred.',
      hint: 'Please try again.',
      icon: 'alert-circle' as const,
    },
  };

  const config = defaults[type];

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons 
          name={icon || config.icon} 
          size={48} 
          color={type === 'disconnected' ? '#ff6b6b' : '#ffc107'} 
        />
        <Text style={styles.title}>{title || config.title}</Text>
        <Text style={styles.message}>{message || config.message}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f4d0f',
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});

export default ErrorScreen;