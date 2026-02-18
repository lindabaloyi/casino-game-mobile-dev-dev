/**
 * useDrag
 * Manages the table drop zone for trail drag interactions.
 *
 * Usage:
 *   const { tableRef, dropBounds, onTableLayout } = useDrag();
 *
 *   // On the table View:
 *   <View ref={tableRef} onLayout={onTableLayout} ...>
 *
 *   // Pass dropBounds to each DraggableHandCard
 */

import { useCallback, useRef } from 'react';
import { View } from 'react-native';

export interface DropBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useDrag() {
  const tableRef   = useRef<View>(null);
  const dropBounds = useRef<DropBounds>({ x: 0, y: 0, width: 0, height: 0 });

  /**
   * Attach to the table View's onLayout.
   * Uses measure() to get absolute (screen) coordinates — these match
   * the absoluteX/absoluteY values from Gesture Handler.
   */
  const onTableLayout = useCallback(() => {
    tableRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      dropBounds.current = { x: pageX, y: pageY, width, height };
    });
  }, []);

  return { tableRef, dropBounds, onTableLayout };
}

export default useDrag;
