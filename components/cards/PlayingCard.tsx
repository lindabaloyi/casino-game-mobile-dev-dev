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

// Border colors
const RED_BORDER = '#C62828';
const BLACK_BORDER = '#1A1A1A';

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

  // Determine border color based on suit
  const borderColor = isRedSuit(suit) ? RED_BORDER : BLACK_BORDER;

  // If no image is available (invalid rank/suit or faceDown without back image)
  if (!imageSource) {
    return (
      <View 
        style={[
          styles.cardContainer,
          { width: cardWidth, height: cardHeight, borderColor: borderColor },
          style
        ]}
      >
        {/* Error placeholder - red box to indicate missing image */}
      </View>
    );
  }

  // Render card with border container - no gaps between border and content
  return (
    <View 
      style={[
        styles.cardContainer,
        { width: cardWidth, height: cardHeight, borderColor: borderColor },
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
  // Container with border - eliminates gaps between border and content
  cardContainer: {
    borderWidth: 2,
    overflow: 'hidden', // Ensures image stays within border
    // No borderRadius - original rectangular shape
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  // Image fills entire container - no gaps
  cardImage: {
    width: '100%',
    height: '100%',
  },
});

export default PlayingCard;
