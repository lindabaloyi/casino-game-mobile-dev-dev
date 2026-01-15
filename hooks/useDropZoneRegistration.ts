/**
 * DEPRECATED: Drop zone system completely removed
 *
 * All drag/drop functionality now uses the contact detection system exclusively.
 * This file is kept for backwards compatibility but does nothing.
 *
 * Migration completed: Contact detection system is now the single source of truth
 * for all drag and drop interactions in the casino game.
 */

export interface DropZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DropZoneConfig {
  stackId: string;
  bounds: DropZoneBounds | null;
  priority?: number;
  onDrop?: (draggedItem: any) => boolean | any;
  zoneType?: string;
}

/**
 * DEPRECATED: This hook no longer does anything
 * All drop detection is now handled by src/utils/contactDetection.ts
 */
export const useDropZoneRegistration = (config: DropZoneConfig) => {
  // NO-OP: Drop zone system completely removed
  console.warn('[DEPRECATED] useDropZoneRegistration called but drop zones are no longer used. All drop detection now uses contact detection.');

  return {
    register: () => {},
    unregister: () => {},
    isRegistered: false
  };
};
