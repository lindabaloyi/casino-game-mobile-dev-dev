/**
 * Drop Zone Priority Constants
 * Defines priority levels for drop zone resolution
 * Higher numbers = higher priority (checked first)
 */

export const DROP_ZONE_PRIORITIES = {
  TEMP_STACK: 100,      // ✅ HIGHEST - Easy to add cards to temp stacks!
  LOOSE_CARD: 80,       // Individual loose cards on table
  BUILD: 60,            // Build card stacks
  TABLE_AREA: 0         // Empty table area (fallback only)
} as const;

export type DropZonePriority = typeof DROP_ZONE_PRIORITIES[keyof typeof DROP_ZONE_PRIORITIES];
