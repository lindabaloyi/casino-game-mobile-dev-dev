/**
 * BuildValueBadge
 * Renders the build value badge with color and display value.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BuildValueBadgeProps {
  /** Display value string */
  displayValue: string;
  /** Badge background color */
  badgeColor: string;
}

export function BuildValueBadge({ displayValue, badgeColor }: BuildValueBadgeProps) {
  return (
    <View style={[styles.valueBadge, { backgroundColor: badgeColor }]}>
      <Text style={styles.valueText}>{displayValue}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  valueBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -22 }, { translateY: -22 }],
    width: 44,
    height: 44,
    borderRadius: 10,  // Square with rounded corners
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  valueText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default BuildValueBadge;
