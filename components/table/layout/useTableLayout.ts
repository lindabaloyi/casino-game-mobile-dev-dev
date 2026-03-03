import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

// ── Constants ─────────────────────────────────────────────────────────────────────

export const CARD_WIDTH = 56;
export const CARD_HEIGHT = 84;
export const CARD_GAP = 40;
export const ROW_GAP = 12;
export const MAX_ROWS = 3;

// ── Row Distribution Algorithm ────────────────────────────────────────────────

/**
 * Calculates how many cards should be in each row based on total card count.
 */
export function calculateRowDistribution(totalCards: number, maxCardsPerRow: number): number[] {
  if (totalCards === 0) return [];
  if (totalCards === 1) return [1];

  // Determine optimal number of rows based on card count
  let numRows: number;
  
  if (totalCards <= 4) {
    numRows = 1;
  } else if (totalCards <= 6) {
    numRows = 2;
  } else if (totalCards <= 9) {
    numRows = Math.min(3, totalCards);
  } else {
    numRows = 3;
  }
  
  numRows = Math.min(numRows, MAX_ROWS);
  numRows = Math.min(numRows, totalCards);
  
  const cardsPerRow = Math.ceil(totalCards / numRows);
  
  const distribution: number[] = [];
  let remaining = totalCards;
  
  for (let i = 0; i < numRows && remaining > 0; i++) {
    const cardsInThisRow = Math.min(cardsPerRow, remaining);
    distribution.push(cardsInThisRow);
    remaining -= cardsInThisRow;
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
  
  // Calculate max cards per row based on screen width
  const maxCardsPerRow = useMemo(() => {
    const availableWidth = screenWidth - 80;
    return Math.max(1, Math.floor(availableWidth / (CARD_WIDTH + CARD_GAP)));
  }, [screenWidth]);
  
  // Calculate row distribution
  const rowDistribution = useMemo(() => {
    return calculateRowDistribution(itemCount, maxCardsPerRow);
  }, [itemCount, maxCardsPerRow]);

  return {
    rowDistribution,
    maxCardsPerRow,
    CARD_WIDTH,
    CARD_GAP,
    ROW_GAP: 12,
    CARD_HEIGHT,
  };
}
