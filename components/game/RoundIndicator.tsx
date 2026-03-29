/**
 * RoundIndicator
 * Minimal round number display integrated near the board edge (top-left).
 * Subtle styling that integrates seamlessly with the game board.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface RoundIndicatorProps {
  /** Current round number */
  round: number;
}

export function RoundIndicator({ round }: RoundIndicatorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.roundText}>R{round}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    left: 12,
    zIndex: 100,
  },
  roundText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default RoundIndicator;
