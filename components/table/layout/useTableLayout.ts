import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { CARD_WIDTH, CARD_HEIGHT, CARD_ASPECT_RATIO } from '../../../constants/cardDimensions';

// ── Constants ─────────────────────────────────────────────────────────────────────

// Default card dimensions - using shared constants
const DEFAULT_CARD_WIDTH = CARD_WIDTH;  // 70
const DEFAULT_CARD_HEIGHT = CARD_HEIGHT; // 105

export const CARD_GAP = 40;
export const ROW_GAP = 12;

// Maximum of 2 rows for all card counts
export const MAX_ROWS = 2;

// ── Row Distribution Algorithm ────────────────────────────────────────────────

/**
 * Calculates how many cards should be in each row based on total card count.
 * 
 * Requirements:
 * - 1-3 cards: 1 row
 * - 4+ cards: 2 rows with first row = ceil(n/2), second row = floor(n/2)
 *   - 4 cards → 2+2
 *   - 5 cards → 3+2
 *   - 6 cards → 3+3
 *   - 7 cards → 4+3
 *   - 8 cards → 4+4
 */
export function calculateRowDistribution(totalCards: number, maxCardsPerRow: number): number[] {
  if (totalCards === 0) return [];
  if (totalCards <= 3) return [totalCards];
  
  // For 4+ cards: always use 2 rows
  // First row gets ceil(n/2), second row gets floor(n/2)
  const firstRow = Math.ceil(totalCards / 2);
  const secondRow = Math.floor(totalCards / 2);
  
  let distribution = [firstRow, secondRow];
  
  // Ensure no row exceeds maxCardsPerRow (for responsive fitting)
  if (maxCardsPerRow > 0) {
    const canFit = distribution.every(c => c <= maxCardsPerRow);
    
    // If distribution doesn't fit, redistribute to fit within maxCardsPerRow
    if (!canFit) {
      const adjustedDistribution: number[] = [];
      let remaining = totalCards;
      const numRows = 2;
      
      for (let i = 0; i < numRows; i++) {
        // Give each row as many cards as possible without exceeding maxCardsPerRow
        // Leave at least 1 card for each remaining row
        const minForRemainingRows = numRows - i - 1;
        const cardsForThisRow = Math.min(maxCardsPerRow, remaining - minForRemainingRows);
        adjustedDistribution.push(cardsForThisRow);
        remaining -= cardsForThisRow;
      }
      
      return adjustedDistribution;
    }
  }
  
  return distribution;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface TableLayoutResult {
  rowDistribution: number[];
  maxCardsPerRow: number;
  CARD_WIDTH: number;
  CARD_GAP: number;
  ROW_GAP: number;
  CARD_HEIGHT: number;
}

/**
 * Hook for calculating table layout based on card count and screen size
 */
export function useTableLayout(itemCount: number): TableLayoutResult {
  const { width: screenWidth } = useWindowDimensions();
  
  // Calculate responsive card dimensions based on screen width
  const responsiveCardWidth = useMemo(() => {
    return Math.min(DEFAULT_CARD_WIDTH, screenWidth / 5);
  }, [screenWidth]);
  
  const responsiveCardHeight = useMemo(() => {
    return responsiveCardWidth * CARD_ASPECT_RATIO; // Maintain aspect ratio
  }, [responsiveCardWidth]);
  
  // Calculate responsive gap based on card width
  const responsiveGap = useMemo(() => {
    return Math.min(CARD_GAP, responsiveCardWidth * 0.7);
  }, [responsiveCardWidth]);
  
  // Calculate max cards per row based on screen width
  const maxCardsPerRow = useMemo(() => {
    const availableWidth = screenWidth - 80;
    return Math.max(1, Math.floor(availableWidth / (responsiveCardWidth + responsiveGap)));
  }, [screenWidth, responsiveCardWidth, responsiveGap]);
  
  // Calculate row distribution
  const rowDistribution = useMemo(() => {
    return calculateRowDistribution(itemCount, maxCardsPerRow);
  }, [itemCount, maxCardsPerRow]);

  return {
    rowDistribution,
    maxCardsPerRow,
    CARD_WIDTH: responsiveCardWidth,
    CARD_GAP: responsiveGap,
    ROW_GAP: 12,
    CARD_HEIGHT: responsiveCardHeight,
  };
}
