import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CardCountIndicatorProps {
  count: number;
}

/**
 * Card count indicator for stacks with multiple cards
 */
export const CardCountIndicator: React.FC<CardCountIndicatorProps> = ({
  count
}) => {
  if (count <= 1) return null;

  return (
    <View style={styles.cardCountContainer}>
      <Text style={styles.cardCountText}>{count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cardCountContainer: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    backgroundColor: '#2196F3', // Blue
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  cardCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
