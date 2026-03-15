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
    transform: [{ translateX: -18 }, { translateY: -18 }],
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  valueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});

export default BuildValueBadge;
