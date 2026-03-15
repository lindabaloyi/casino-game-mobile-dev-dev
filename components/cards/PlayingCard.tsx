/**
 * PlayingCard
 * Card component that renders images for ranks 1-10.
 * 
 * Renders cards at standard casino game size (56x84)
 * matching the capture pile dimensions for consistency.
 */

import React, { useEffect } from 'react';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { getCardImage, preloadCardImages } from './cardImageMap';
import { isRedSuit } from '../../types/card.types';
import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';

// ── Types ────────────────────────────────────────────────────────────────────

interface PlayingCardProps {
  rank: string | number;
  suit: string;
  /** Kept for API compatibility, but ignored (no back image available) */
  faceDown?: boolean;
  style?: any;
  /** Card width - defaults to 56 (matching capture pile) */
  width?: number;
  /** Card height - defaults to 84 (matching capture pile) */
  height?: number;
}

// Border colors - no longer used (borderless design)
// Keeping for reference
// const RED_BORDER = '#C62828';
// const BLACK_BORDER = '#1A1A1A';

// ── Component ─────────────────────────────────────────────────────────────

export function PlayingCard({
  rank,
  suit,
  faceDown = false,
  style,
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
}: PlayingCardProps) {
  const { width: screenWidth } = useWindowDimensions();

  // Preload images on mount
  useEffect(() => {
    preloadCardImages();
  }, []);

  // Calculate responsive dimensions that scale with screen but maintain aspect ratio
  const cardWidth = Math.min(width, screenWidth / 5); // Max 5 cards per row
  const cardHeight = cardWidth * (CARD_HEIGHT / CARD_WIDTH); // Maintain 1.5 ratio

  // Get image source for this card
  const imageSource = getCardImage(String(rank), suit);

  // If no image is available (invalid rank/suit)
  if (!imageSource) {
    return (
      <View 
        style={[
          styles.cardContainer,
          { width: cardWidth, height: cardHeight },
          style
        ]}
      >
        {/* Empty placeholder for missing images */}
      </View>
    );
  }

  // Render card without border - just rounded corners
  return (
    <View 
      style={[
        styles.cardContainer,
        { width: cardWidth, height: cardHeight },
        style
      ]}
    >
      <Image
        source={imageSource}
        style={styles.cardImage}
        resizeMode="stretch"
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Container - borderless with rounded corners
  cardContainer: {
    borderWidth: 0, // No border
    overflow: 'hidden', // Ensures image stays within rounded corners
    borderRadius: 8, // Rounded corners
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  // Image fills entire container
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8, // Rounded corners for image
  },
});

export default PlayingCard;
