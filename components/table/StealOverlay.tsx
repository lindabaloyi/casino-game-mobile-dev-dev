/**
 * StealOverlay
 * Shows a styled overlay with "STEAL" button when dragging over opponent's build.
 * 
 * This appears near the build stack when player is dragging a card over it.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';

interface StealOverlayProps {
  visible: boolean;
  stackValue: number;
  onStealPress: () => void;
  positionX: number;
  positionY: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function StealOverlay({
  visible,
  stackValue,
  onStealPress,
  positionX,
  positionY,
}: StealOverlayProps) {
  if (!visible) return null;

  // Position the overlay above the stack
  const overlayX = Math.max(10, Math.min(positionX - 60, SCREEN_WIDTH - 130));
  const overlayY = Math.max(10, positionY - 140);

  return (
    <View 
      style={[
        styles.container, 
        { 
          left: overlayX, 
          top: overlayY,
        }
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.bubble}>
        <Text style={styles.label}>Opponent's Build</Text>
        <Text style={styles.value}>Value: {stackValue}</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.stealButton}
        onPress={onStealPress}
        activeOpacity={0.8}
      >
        <Text style={styles.stealText}>STEAL</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 500,
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e94560',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  stealButton: {
    backgroundColor: '#e94560',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#ff6b8a',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  stealText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
});

export default StealOverlay;
