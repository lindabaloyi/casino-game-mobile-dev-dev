/**
 * Coordinate utilities for real-time drag sharing
 * 
 * Uses normalized coordinates (0-1) for cross-device consistency
 * so that drag positions work correctly on different screen sizes
 */

export interface Position {
  x: number;
  y: number;
}

export interface TableBounds {
  width: number;
  height: number;
}

/**
 * Convert absolute coordinates to normalized (0-1) coordinates
 */
export function normalizePosition(absX: number, absY: number, bounds: TableBounds): Position {
  return {
    x: Math.max(0, Math.min(1, absX / bounds.width)),
    y: Math.max(0, Math.min(1, absY / bounds.height)),
  };
}

/**
 * Convert normalized coordinates back to absolute coordinates
 */
export function denormalizePosition(normX: number, normY: number, bounds: TableBounds): Position {
  return {
    x: normX * bounds.width,
    y: normY * bounds.height,
  };
}

/**
 * Get center point of a card/stack at normalized position
 */
export function getNormalizedCenter(
  normX: number, 
  normY: number, 
  bounds: TableBounds,
  itemWidth: number = 56,
  itemHeight: number = 84
): Position {
  return {
    x: (normX * bounds.width) + itemWidth / 2,
    y: (normY * bounds.height) + itemHeight / 2,
  };
}
