import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TempStackIndicatorProps {
  captureValue?: number;
  totalValue?: number;
}

/**
 * Indicators for temporary stacks (capture value and total value)
 */
export const TempStackIndicator: React.FC<TempStackIndicatorProps> = ({
  captureValue,
  totalValue
}) => {
  return (
    <>
      {/* Capture value indicator for temporary stacks */}
      {captureValue !== undefined && (
        <View style={styles.captureValueContainer}>
          <Text style={styles.captureValueText}>{captureValue}</Text>
        </View>
      )}

      {/* Total value indicator for temporary stacks */}
      {totalValue !== undefined && (
        <View style={styles.totalValueContainer}>
          <Text style={styles.totalValueText}>{totalValue}</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  captureValueContainer: {
    position: 'absolute',
    bottom: -8,
    right: -8,  // Opposite corner from card count
    backgroundColor: '#9C27B0', // Purple
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  captureValueText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  totalValueContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#9C27B0', // Purple
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  totalValueText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
