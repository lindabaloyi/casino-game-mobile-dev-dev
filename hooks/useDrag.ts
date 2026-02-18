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
   *
   * Uses measureInWindow() — NOT measure() — because on Android,
   * measure()'s pageX/pageY are relative to the React Native root view
   * (which excludes the status bar), while Gesture Handler's absoluteX/Y
   * are relative to the full window (including status bar).
   * measureInWindow() uses the same coordinate space as absoluteX/Y on
   * both Android and iOS, so drop-zone hit testing is always accurate.
   */
  const onTableLayout = useCallback(() => {
    tableRef.current?.measureInWindow((x, y, width, height) => {
      dropBounds.current = { x, y, width, height };
      console.log('[useDrag] Table measured (measureInWindow):', { x, y, width, height });
    });
  }, []);

  return { tableRef, dropBounds, onTableLayout };
}

export default useDrag;
