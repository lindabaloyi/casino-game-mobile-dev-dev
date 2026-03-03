/**
 * OpponentGhostCard
 * Renders a ghost card showing where an opponent is dragging
 * Used for real-time shared state - opponents see each other's drags
 * 
 * Features:
 * - Smooth animation using Reanimated shared values
 * - Snaps to target position on drag end
 * - Fades out after reaching final position
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue,
  withSpring,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../hooks/useGameState';
import { denormalizePosition, TableBounds } from '../../shared/coordinates';

interface OpponentGhostCardProps {
  card: Card;
  position: { x: number; y: number }; // normalized 0-1
  tableBounds: TableBounds;
  // Target info for accurate final position
  targetType?: 'card' | 'stack' | 'temp_stack' | 'capture' | 'table';
  targetId?: string;
  // Position registries to find target's actual position
  cardPositions?: Map<string, { x: number; y: number; width: number; height: number }>;
  stackPositions?: Map<string, { x: number; y: number; width: number; height: number }>;
}

const CARD_WIDTH = 56;
const CARD_HEIGHT = 84;

export function OpponentGhostCard({ 
  card, 
  position, 
  tableBounds, 
  targetType, 
  targetId,
  cardPositions,
  stackPositions,
}: OpponentGhostCardProps) {
  // Get initial position for shared values
  const initialBounds = {
    width: tableBounds.width > 0 ? tableBounds.width : 400,
    height: tableBounds.height > 0 ? tableBounds.height : 300,
  };
  const initialAbsPos = denormalizePosition(position.x, position.y, initialBounds);
  
  // Use shared values for animation - initialize to current position to avoid flash at (0,0)
  const translateX = useSharedValue(initialAbsPos.x - CARD_WIDTH / 2);
  const translateY = useSharedValue(initialAbsPos.y - CARD_HEIGHT / 2);
  const opacity = useSharedValue(0.8);
  
  // Track if this is the final position (for fade out)
  const isFinalPosition = useRef(false);

  useEffect(() => {
    console.log('[OpponentGhostCard] Position updated:', position);
    console.log('[OpponentGhostCard] Target info:', { targetType, targetId });
    console.log('[OpponentGhostCard] Table bounds:', tableBounds);
    
    // Get actual bounds being used (handles fallback case)
    const bounds = {
      width: tableBounds.width > 0 ? tableBounds.width : 400,
      height: tableBounds.height > 0 ? tableBounds.height : 300,
    };
    console.log('[OpponentGhostCard] Using bounds for denorm:', bounds);
    
    // Determine display position with target snapping
    let displayPosition = position;
    
    if (targetId && (cardPositions || stackPositions)) {
      if (targetType === 'card' && cardPositions) {
        const targetPos = cardPositions.get(targetId);
        if (targetPos) {
          displayPosition = {
            x: (targetPos.x + targetPos.width / 2) / bounds.width,
            y: (targetPos.y + targetPos.height / 2) / bounds.height,
          };
          isFinalPosition.current = true;
        }
      } else if ((targetType === 'stack' || targetType === 'temp_stack') && stackPositions) {
        const targetPos = stackPositions.get(targetId);
        if (targetPos) {
          displayPosition = {
            x: (targetPos.x + targetPos.width / 2) / bounds.width,
            y: (targetPos.y + targetPos.height / 2) / bounds.height,
          };
          isFinalPosition.current = true;
        }
      }
    }

    // Convert to absolute coordinates
    const absPos = denormalizePosition(displayPosition.x, displayPosition.y, bounds);
    console.log('[OpponentGhostCard] Normalized:', displayPosition, '→ Absolute:', absPos);

    // Animate to new position
    if (isFinalPosition.current) {
      // Final position: snap smoothly then fade out
      translateX.value = withSpring(absPos.x - CARD_WIDTH / 2, {
        damping: 15,
        stiffness: 150,
      });
      translateY.value = withSpring(absPos.y - CARD_HEIGHT / 2, {
        damping: 15,
        stiffness: 150,
      });
      
      // Start fade out after reaching target
      setTimeout(() => {
        opacity.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        });
      }, 100);
    } else {
      // During drag: smooth follow with slight lag for natural feel
      translateX.value = withSpring(absPos.x - CARD_WIDTH / 2, {
        damping: 20,
        stiffness: 200,
      });
      translateY.value = withSpring(absPos.y - CARD_HEIGHT / 2, {
        damping: 20,
        stiffness: 200,
      });
      opacity.value = 0.8; // Reset opacity if it was fading
    }
  }, [position.x, position.y, targetType, targetId, tableBounds.width, tableBounds.height]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value }
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ghost,
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <View style={styles.cardWrapper}>
        <PlayingCard rank={card.rank} suit={card.suit} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    left: 0, // Will be overwritten by transform, but needed as initial position
    top: 0,
    zIndex: 1000,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardWrapper: {
    opacity: 0.8,
    transform: [{ scale: 1.05 }],
  },
});

export default OpponentGhostCard;
