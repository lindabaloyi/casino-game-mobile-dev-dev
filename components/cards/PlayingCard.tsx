/**
 * PlayingCard
 * Card component that renders images for ranks 1-10.
 * 
 * Renders cards at standard casino game size (56x84)
 * matching the capture pile dimensions for consistency.
 */

import React, { useEffect, memo } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Image as RNImage } from 'react-native';
import FastImage from 'react-native-fast-image';
import { getCardImage, preloadCardImages } from './cardImageMap';
import { CARD_WIDTH, CARD_HEIGHT } from '../../constants/cardDimensions';

// ── Types ────────────────────────────────────────────────────────────────────

interface PlayingCardProps {
  rank: string | number;
  suit: string;
  faceDown?: boolean;
  style?: any;
  width?: number;
  height?: number;
}

// Keeping for reference
// const RED_BORDER = '#C62828';
// const BLACK_BORDER = '#1A1A1A';

// ── Component ─────────────────────────────────────────────────────────────

function PlayingCardImpl({
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

  // Platform-conditional image rendering with fallback
  const renderCardImage = () => {
    // Web: use standard RN Image (guaranteed to work with drag/drop)
    if (Platform.OS === 'web') {
      return (
        <RNImage
          source={imageSource}
          style={styles.cardImage}
          resizeMode="stretch"
        />
      );
    }
    
    // Native: try FastImage first, fallback to RN Image if it fails
    try {
      return (
        <FastImage
          source={imageSource}
          style={styles.cardImage}
          resizeMode={FastImage.resizeMode.stretch}
        />
      );
    } catch (error) {
      console.warn('[PlayingCard] FastImage failed, falling back to RN Image');
      return (
        <RNImage
          source={imageSource}
          style={styles.cardImage}
          resizeMode="stretch"
        />
      );
    }
  };

  // Render card without border - just rounded corners
  return (
    <View 
      style={[
        styles.cardContainer,
        { width: cardWidth, height: cardHeight },
        style
      ]}
    >
      {renderCardImage()}
    </View>
  );
}

export const PlayingCard = memo(PlayingCardImpl, (prevProps, nextProps) => {
  return (
    prevProps.rank === nextProps.rank &&
    prevProps.suit === nextProps.suit &&
    prevProps.faceDown === nextProps.faceDown &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height
  );
});

export default PlayingCard;

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
