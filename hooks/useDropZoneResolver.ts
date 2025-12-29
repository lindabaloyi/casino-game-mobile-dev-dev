import { useCallback } from 'react';

interface DropZone {
  stackId: string;
  priority: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zoneType?: string;
  onDrop?: (draggedItem: any) => boolean | any;
}

interface DropPosition {
  x: number;
  y: number;
}

interface DropZoneResolutionResult {
  bestZone: DropZone | null;
  bestZoneType: string;
  priority: number;
  totalZones: number;
  dropPosition: DropPosition;
}

/**
 * Hook for pure drop zone resolution logic
 * Handles priority-based collision detection and zone selection
 * No drag mechanics, animation, or business logic - just zone finding
 */
export const useDropZoneResolver = () => {

  const resolveDropZone = useCallback((
    dropPosition: DropPosition,
    source?: string
  ): DropZoneResolutionResult => {

    const dropZones = (global as any).dropZones as DropZone[] || [];

    console.log(`[useDropZoneResolver] 🔍 Checking ${source || 'unknown'} drop against ${dropZones.length} zones at (${dropPosition.x.toFixed(1)}, ${dropPosition.y.toFixed(1)})`);

    let bestZone: DropZone | null = null;
    let highestPriority = -1;

    for (const zone of dropZones) {
      const { x, y, width, height } = zone.bounds;

      // Direct bounds check - no tolerance expansion for precision
      const inBounds = dropPosition.x >= x &&
          dropPosition.x <= x + width &&
          dropPosition.y >= y &&
          dropPosition.y <= y + height;

      console.log(`[useDropZoneResolver] Zone ${zone.stackId}:`, {
        zoneType: zone.zoneType,
        priority: zone.priority,
        bounds: { x: x.toFixed(1), y: y.toFixed(1), width: width.toFixed(1), height: height.toFixed(1) },
        inBounds,
        dropPos: { x: dropPosition.x.toFixed(1), y: dropPosition.y.toFixed(1) }
      });

      if (inBounds) {
        // PRIORITY-BASED: Higher priority wins
        const zonePriority = zone.priority || 0;
        if (zonePriority > highestPriority) {
          highestPriority = zonePriority;
          bestZone = zone;
          console.log(`[useDropZoneResolver] 🎯 NEW BEST ZONE: ${zone.stackId} (${zone.zoneType}, priority: ${zonePriority})`);
        } else {
          console.log(`[useDropZoneResolver] ❌ Lower priority zone rejected: ${zone.stackId} (${zone.zoneType}, priority: ${zonePriority} < ${highestPriority})`);
        }
      }
    }

    const result: DropZoneResolutionResult = {
      bestZone,
      bestZoneType: bestZone?.zoneType || 'NONE',
      priority: highestPriority,
      totalZones: dropZones.length,
      dropPosition
    };

    console.log(`[useDropZoneResolver] 🏆 FINAL RESULT:`, {
      bestZone: bestZone?.stackId || 'NONE',
      bestZoneType: result.bestZoneType,
      priority: highestPriority,
      totalZones: dropZones.length
    });

    return result;
  }, []);

  return { resolveDropZone };
};
