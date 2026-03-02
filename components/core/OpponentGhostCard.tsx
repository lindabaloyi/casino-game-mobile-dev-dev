/**
 * OpponentGhostCard
 * Renders a ghost card showing where an opponent is dragging
 * Used for real-time shared state - opponents see each other's drags
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
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
  // If target info is provided, try to use local registry to find exact position
  let displayPosition = position;
  
  if (targetId && (cardPositions || stackPositions)) {
    if (targetType === 'card' && cardPositions) {
      const targetPos = cardPositions.get(targetId);
      if (targetPos) {
        // Convert target's absolute position back to normalized for display
        displayPosition = {
          x: targetPos.x / tableBounds.width,
          y: targetPos.y / tableBounds.height,
        };
      }
    } else if ((targetType === 'stack' || targetType === 'temp_stack') && stackPositions) {
      const targetPos = stackPositions.get(targetId);
      if (targetPos) {
        displayPosition = {
          x: targetPos.x / tableBounds.width,
          y: targetPos.y / tableBounds.height,
        };
      }
    }
  }

  // Convert normalized coordinates to absolute
  const absPos = denormalizePosition(displayPosition.x, displayPosition.y, tableBounds);
  
  return (
    <Animated.View
      style={[
        styles.ghost,
        {
          left: absPos.x,
          top: absPos.y,
        },
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
    zIndex: 1000, // Above everything
  },
  cardWrapper: {
    opacity: 0.8, // Slightly transparent to indicate it's not a real card
    transform: [{ scale: 1.05 }], // Slightly larger to stand out
  },
});

export default OpponentGhostCard;
