/**
 * Drop Zone Priority Constants
 * Defines priority levels for drop zone resolution
 * Higher numbers = higher priority (checked first)
 */

export const DROP_ZONE_PRIORITIES = {
  LOOSE_CARD: 100,      // Individual loose cards on table
  TEMP_STACK: 80,       // Temporary staging stacks
  BUILD: 60,            // Build card stacks
  TABLE_AREA: 0         // Empty table area (fallback only)
} as const;

export type DropZonePriority = typeof DROP_ZONE_PRIORITIES[keyof typeof DROP_ZONE_PRIORITIES];
