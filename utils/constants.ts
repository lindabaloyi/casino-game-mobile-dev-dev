// Card dimensions
export const CARD_WIDTH = 56;
export const CARD_HEIGHT = 84;

// Screen dimensions (fallback)
export const DEFAULT_TABLE_WIDTH = 400;
export const DEFAULT_TABLE_HEIGHT = 300;

/**
 * Get responsive card dimensions based on screen width
 * This ensures cards scale properly on smaller screens (like Android devices)
 * @param screenWidth - The current screen width
 * @returns Object with responsive width and height
 */
export function getResponsiveCardDimensions(screenWidth: number): { width: number; height: number } {
  // Scale card width based on screen width
  // On small screens, cards should be smaller
  // Use 7 cards as baseline (typical hand size)
  const responsiveWidth = Math.min(CARD_WIDTH, screenWidth / 7);
  
  // Maintain aspect ratio (1:1.5 is standard card ratio)
  const responsiveHeight = responsiveWidth * 1.5;
  
  return {
    width: Math.max(32, responsiveWidth), // Minimum 32px width
    height: Math.max(48, responsiveHeight) // Minimum 48px height
  };
}
