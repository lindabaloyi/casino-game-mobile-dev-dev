import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DropHintProps {
  visible: boolean;
}

export function DropHint({ visible }: DropHintProps) {
  if (!visible) return null;
  
  return (
    <View style={styles.hintContainer}>
      <Text style={styles.hintText}>Drop a card here to trail</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hintContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintText: {
    color: '#81C784',
    fontSize: 14,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
});
