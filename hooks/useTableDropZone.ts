import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { DROP_ZONE_PRIORITIES } from '../constants/dropZonePriorities';

/**
 * Custom hook to manage table drop zone registration and positioning
 * Handles the global drop zone registry for table area drops
 */
export function useTableDropZone(onDrop: (draggedItem: any, targetInfo: any) => boolean) {
  const tableSectionRef = useRef<View>(null);

  // Register table section as drop zone
  useEffect(() => {
    const registerDropZone = () => {
      if (tableSectionRef.current) {
        tableSectionRef.current.measureInWindow((pageX, pageY, width, height) => {
          const dropZone = {
            stackId: 'table-section',
            priority: DROP_ZONE_PRIORITIES.TABLE_AREA,
            bounds: {
              x: pageX,
              y: pageY,
              width: width,
              height: height
            },
            onDrop: (draggedItem: any) => {
              console.log(`[DROP ZONE HIT] Table zone received drop:`, {
                draggedCard: `${draggedItem.card?.rank}${draggedItem.card?.suit}`,
                draggedSource: draggedItem.source,
                priority: DROP_ZONE_PRIORITIES.TABLE_AREA,
                willReturn: { type: 'table', area: 'empty' }
              });
              // Handle trail action
              return onDrop(draggedItem, {
                type: 'table',
                area: 'empty'
              });
            }
          };

          // Initialize global registry if needed
          if (!(global as any).dropZones) {
            (global as any).dropZones = [];
          }

          // Remove existing table zone and add new one
          (global as any).dropZones = (global as any).dropZones.filter(
            (zone: any) => zone.stackId !== 'table-section'
          );
          (global as any).dropZones.push(dropZone);
        });
      }
    };

    // Register after a short delay to ensure layout is complete
    const timer = setTimeout(registerDropZone, 100);

    return () => {
      clearTimeout(timer);
      // Clean up drop zone on unmount
      if ((global as any).dropZones) {
        (global as any).dropZones = (global as any).dropZones.filter(
          (zone: any) => zone.stackId !== 'table-section'
        );
      }
    };
  }, [onDrop]);

  return tableSectionRef;
}
