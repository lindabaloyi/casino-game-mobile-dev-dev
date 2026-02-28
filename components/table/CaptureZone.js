/**
 * CaptureZone
 * Drop zone overlay for player's capture pile.
 * 
 * - Highlights when dragged item is over it
 * - On drop, calls onDrop callback with dragged item info
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const DROP_TOLERANCE = 30;

export function CaptureZone({
  x,
  y,
  width,
  height,
  isActive = true,
  onDrop,
}) {
  const isHighlighted = useSharedValue(false);
  const viewRef = useRef(null);

  // Expose a method to check if a point is within bounds
  const checkDrop = useCallback(
    (absX, absY) => {
      if (!isActive) return false;
      
      const inX = absX >= x - DROP_TOLERANCE && absX <= x + width + DROP_TOLERANCE;
      const inY = absY >= y - DROP_TOLERANCE && absY <= y + height + DROP_TOLERANCE;
      
      return inX && inY;
    },
    [x, y, width, height, isActive],
  );

  // Highlight style
  const highlightStyle = useAnimatedStyle(() => ({
    borderColor: isHighlighted.value ? '#4CAF50' : 'rgba(255,255,255,0.3)',
    borderWidth: isHighlighted.value ? 3 : 2,
    backgroundColor: isHighlighted.value ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.05)',
  }));

  // Update highlight state
  const updateHighlight = useCallback(
    (absX, absY) => {
      if (!isActive) {
        isHighlighted.value = false;
        return;
      }
      
      const inX = absX >= x - DROP_TOLERANCE && absX <= x + width + DROP_TOLERANCE;
      const inY = absY >= y - DROP_TOLERANCE && absY <= y + height + DROP_TOLERANCE;
      isHighlighted.value = inX && inY;
    },
    [x, y, width, height, isActive, isHighlighted],
  );

  // Handle drop
  const handleDrop = useCallback(
    (draggedItem) => {
      if (onDrop && isActive) {
        onDrop(draggedItem);
      }
    },
    [onDrop, isActive],
  );

  return (
    <Animated.View
      ref={viewRef}
      style={[
        styles.container,
        {
          left: x,
          top: y,
          width,
          height,
        },
        highlightStyle,
      ]}
      pointerEvents="box-none"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
});

export default CaptureZone;
