/**
 * TypeBadge
 * Displays the stack type label (e.g., "TEMP", "BUILD").
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TypeBadgeProps {
  /** Label text to display */
  label: string;
  /** Badge background color */
  color?: string;
}

export function TypeBadge({ label, color = '#17a2b8' }: TypeBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={[styles.badgeText, { backgroundColor: color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
});

export default TypeBadge;
