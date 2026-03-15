/**
 * Card Dimensions
 * Shared constants for uniform card sizing throughout the game.
 * 
 * All card components should use these values to ensure
 * consistent sizing across capture piles, table cards, and hands.
 */

// Standard card dimensions - middle ground between 56x84 and 70x105
export const CARD_WIDTH = 60;
export const CARD_HEIGHT = 90;

// Card aspect ratio (standard playing card ~1.5:1)
export const CARD_ASPECT_RATIO = CARD_HEIGHT / CARD_WIDTH; // 1.5

// Default card dimensions object for props
export const DEFAULT_CARD_DIMENSIONS = {
  width: CARD_WIDTH,
  height: CARD_HEIGHT,
};

export default {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_ASPECT_RATIO,
  DEFAULT_CARD_DIMENSIONS,
};
