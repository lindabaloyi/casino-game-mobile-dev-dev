import { useEffect } from 'react';
import { DROP_ZONE_PRIORITIES } from '../constants/dropZonePriorities';

interface DropZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DropZoneConfig {
  stackId: string;
  bounds: DropZoneBounds | null;
  priority?: number;
  onDrop?: (draggedItem: any) => boolean | any;
  zoneType?: string;
}

/**
 * Hook for managing drop zone registration with global registry
 * Handles registration, updates, and cleanup automatically
 */
export const useDropZoneRegistration = ({
  stackId,
  bounds,
  priority = DROP_ZONE_PRIORITIES.LOOSE_CARD,
  onDrop,
  zoneType = 'OTHER'
}: DropZoneConfig) => {

  useEffect(() => {
    // Only register if we have valid bounds and drop handler
    if (!bounds || !onDrop) {
      console.log(`[useDropZoneRegistration] Skipping registration for ${stackId} - missing bounds or onDrop`);
      return;
    }

    // Initialize global registry if needed
    if (!(global as any).dropZones) {
      (global as any).dropZones = [];
    }

    const dropZone = {
      stackId,
      priority,
      bounds,
      zoneType,
      onDrop: (draggedItem: any) => {
        console.log('[DROP ZONE HIT]', {
          stackId,
          zoneType,
          priority,
          bounds,
          draggedCard: draggedItem?.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
          draggedSource: draggedItem?.source,
          timestamp: Date.now()
        });

        // Staging fix: track last active drop zone
        (global as any).lastDropZoneId = stackId;

        const result = onDrop(draggedItem);
        console.log(`[useDropZoneRegistration] ${stackId} drop result:`, result);
        return result;
      }
    };

    // Remove existing zone and add new one
    (global as any).dropZones = (global as any).dropZones.filter(
      (zone: any) => zone.stackId !== stackId
    );
    (global as any).dropZones.push(dropZone);

    console.log(`[useDropZoneRegistration] 📍 Drop zone registered for ${stackId}:`, bounds);

    // Cleanup function
    return () => {
      if ((global as any).dropZones) {
        (global as any).dropZones = (global as any).dropZones.filter(
          (zone: any) => zone.stackId !== stackId
        );
        console.log(`[useDropZoneRegistration] 🧹 Drop zone unregistered for ${stackId}`);
      }
    };
  }, [stackId, bounds, priority, onDrop, zoneType]);
};
