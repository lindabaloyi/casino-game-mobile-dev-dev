/**
 * ConnectingScreen
 * 
 * Displays a loading screen while connecting to the server.
 * Used by both multiplayer and party game screens.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface ConnectingScreenProps {
  title: string;
  subtitle: string;
}

export function ConnectingScreen({ title, subtitle }: ConnectingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ConnectingScreen;
