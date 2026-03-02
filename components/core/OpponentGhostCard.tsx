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
}

const CARD_WIDTH = 56;
const CARD_HEIGHT = 84;

export function OpponentGhostCard({ card, position, tableBounds }: OpponentGhostCardProps) {
  // Convert normalized coordinates to absolute
  const absPos = denormalizePosition(position.x, position.y, tableBounds);
  
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
