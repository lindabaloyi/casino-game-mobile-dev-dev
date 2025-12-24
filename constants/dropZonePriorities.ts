/**
 * Drop Zone Priority Constants
 * Defines priority levels for drop zone resolution
 * Higher numbers = higher priority (checked first)
 */

export const DROP_ZONE_PRIORITIES = {
  BUILD: 1000,          // ✅ HIGHEST - Builds get priority for augmentation!
  TEMP_STACK: 500,      // Medium-high - Temp stacks for staging
  LOOSE_CARD: 100,      // Medium-low - Individual loose cards
  TABLE_AREA: 0         // Empty table area (fallback only)
} as const;

export type DropZonePriority = typeof DROP_ZONE_PRIORITIES[keyof typeof DROP_ZONE_PRIORITIES];
