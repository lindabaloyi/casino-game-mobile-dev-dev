/**
 * Card Image Map
 * Maps rank/suit combinations to their corresponding image assets.
 * 
 * Images are stored in: assets/images/cards/
 * Naming convention: {rank}{suit}.png (e.g., 1C.png, 10S.png)
 * 
 * NOTE: 
 * - The game uses Unicode suits internally (♥♦♠♣) but image files use ASCII (C/D/H/S)
 * - The game uses 'A' for Ace but image files use '1'
 * This map handles all the translations.
 */

import { Image, ImageRequireSource, Platform } from 'react-native';

// Unicode to ASCII suit mapping
const SUIT_MAP: Record<string, string> = {
  '♣': 'C',  // Clubs
  '♦': 'D',  // Diamonds
  '♥': 'H',  // Hearts
  '♠': 'S',  // Spades
};

// Rank mapping - game uses 'A' for Ace, images use '1'
const RANK_MAP: Record<string, string> = {
  'A': '1',  // Ace -> 1
  'J': '11', // Jack -> 11 (if needed)
  'Q': '12', // Queen -> 12 (if needed)
  'K': '13', // King -> 13 (if needed)
};

// Card image require map (uses ASCII suits: C, D, H, S and numeric ranks: 1-10)
const cardImages: Record<string, ImageRequireSource> = {
  // Ace (1) - images are named 1C.png, 1D.png, etc.
  '1C': require('../../assets/images/cards/1C.png'),
  '1D': require('../../assets/images/cards/1D.png'),
  '1H': require('../../assets/images/cards/1H.png'),
  '1S': require('../../assets/images/cards/1S.png'),
  
  // 2
  '2C': require('../../assets/images/cards/2C.png'),
  '2D': require('../../assets/images/cards/2D.png'),
  '2H': require('../../assets/images/cards/2H.png'),
  '2S': require('../../assets/images/cards/2S.png'),
  
  // 3
  '3C': require('../../assets/images/cards/3C.png'),
  '3D': require('../../assets/images/cards/3D.png'),
  '3H': require('../../assets/images/cards/3H.png'),
  '3S': require('../../assets/images/cards/3S.png'),
  
  // 4
  '4C': require('../../assets/images/cards/4C.png'),
  '4D': require('../../assets/images/cards/4D.png'),
  '4H': require('../../assets/images/cards/4H.png'),
  '4S': require('../../assets/images/cards/4S.png'),
  
  // 5
  '5C': require('../../assets/images/cards/5C.png'),
  '5D': require('../../assets/images/cards/5D.png'),
  '5H': require('../../assets/images/cards/5H.png'),
  '5S': require('../../assets/images/cards/5S.png'),
  
  // 6
  '6C': require('../../assets/images/cards/6C.png'),
  '6D': require('../../assets/images/cards/6D.png'),
  '6H': require('../../assets/images/cards/6H.png'),
  '6S': require('../../assets/images/cards/6S.png'),
  
  // 7
  '7C': require('../../assets/images/cards/7C.png'),
  '7D': require('../../assets/images/cards/7D.png'),
  '7H': require('../../assets/images/cards/7H.png'),
  '7S': require('../../assets/images/cards/7S.png'),
  
  // 8
  '8C': require('../../assets/images/cards/8C.png'),
  '8D': require('../../assets/images/cards/8D.png'),
  '8H': require('../../assets/images/cards/8H.png'),
  '8S': require('../../assets/images/cards/8S.png'),
  
  // 9
  '9C': require('../../assets/images/cards/9C.png'),
  '9D': require('../../assets/images/cards/9D.png'),
  '9H': require('../../assets/images/cards/9H.png'),
  '9S': require('../../assets/images/cards/9S.png'),
  
  // 10
  '10C': require('../../assets/images/cards/10C.png'),
  '10D': require('../../assets/images/cards/10D.png'),
  '10H': require('../../assets/images/cards/10H.png'),
  '10S': require('../../assets/images/cards/10S.png'),
};

/**
 * Convert Unicode suit to ASCII for image lookup
 * @param suit - Unicode suit (♥♦♠♣) or ASCII suit (C/D/H/S)
 * @returns ASCII suit (C, D, H, or S)
 */
function unicodeToAscii(suit: string): string {
  return SUIT_MAP[suit] || suit; // Return as-is if already ASCII
}

/**
 * Convert game rank to image rank
 * @param rank - Game rank (A, 2-10, J, Q, K)
 * @returns Image rank (1-10)
 */
function gameRankToImageRank(rank: string): string {
  return RANK_MAP[rank] || rank; // Return as-is if already numeric
}

/**
 * Get the image source for a specific card
 * @param rank - Card rank from game (A, 2-10, J, Q, K)
 * @param suit - Card suit (Unicode: ♥♦♠♣ or ASCII: C/D/H/S)
 * @returns Image source object or null if no image available
 */
export function getCardImage(rank: string, suit: string): ImageRequireSource | null {
  // Convert Unicode suit to ASCII
  const asciiSuit = unicodeToAscii(suit);
  // Convert game rank to image rank (A -> 1)
  const imageRank = gameRankToImageRank(rank);
  const key = `${imageRank}${asciiSuit}`;
  

  
  return cardImages[key] || null;
}

/**
 * Check if an image exists for a specific card
 * @param rank - Card rank
 * @param suit - Card suit
 * @returns true if image exists, false otherwise
 */
export function hasCardImage(rank: string, suit: string): boolean {
  const asciiSuit = unicodeToAscii(suit);
  const imageRank = gameRankToImageRank(rank);
  const key = `${imageRank}${asciiSuit}`;
  return !!cardImages[key];
}

/**
 * Preload all card images for smoother rendering
 * Only works on native (mobile) - no-op on web
 */
export function preloadCardImages(): void {
  if (Platform.OS === 'web') return;
  
  try {
    const FastImage = require('react-native-fast-image').default;
    const sources = Object.values(cardImages) as any[];
    FastImage.preload(sources);
  } catch (error) {
    console.warn('[cardImageMap] FastImage.preload failed:', error);
  }
}

/**
 * Get list of all supported ranks
 */
export const SUPPORTED_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

/**
 * Get list of all supported suits (Unicode)
 */
export const SUPPORTED_SUITS = ['♣', '♦', '♥', '♠'];

export default {
  getCardImage,
  hasCardImage,
  preloadCardImages,
  SUPPORTED_RANKS,
  SUPPORTED_SUITS,
};
