import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BuildIndicatorProps {
  value?: number;
  owner?: number;
}

/**
 * Build value and owner indicator for build stacks
 */
export const BuildIndicator: React.FC<BuildIndicatorProps> = ({
  value,
  owner
}) => {
  if (value === undefined) return null;

  return (
    <>
      {/* Build value indicator */}
      <View style={styles.buildValueContainer}>
        <Text style={styles.buildValueText}>{value}</Text>
      </View>

      {/* Owner tag for builds */}
      {owner !== undefined && (
        <View style={styles.ownerTagContainer}>
          <Text style={styles.ownerTagText}>P{owner + 1}</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  buildValueContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFD700', // Gold
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#B8860B',
  },
  buildValueText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ownerTagContainer: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: '#4CAF50', // Green for player ownership
    borderRadius: 10,
    minWidth: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  ownerTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
