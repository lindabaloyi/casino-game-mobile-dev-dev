/**
 * useDragMoveThrottle
 * Throttles drag move callbacks to max 60fps to reduce JS thread overhead.
 * 
 * Usage:
 *   const throttledMove = useDragMoveThrottle();
 *   const handleDragMove = (x: number, y: number) => {
 *     throttledMove(x, y, (x, y) => {
 *       // Your existing logic
 *       onDragMove?.(x, y);
 *     });
 *   };
 */

import { useRef, useCallback } from 'react';

const THROTTLE_MS = 16; // 60fps = 16ms per frame

export function useDragMoveThrottle() {
  const lastMoveTime = useRef(0);

  const throttledMove = useCallback(
    (x: number, y: number, callback: (x: number, y: number) => void) => {
      const now = Date.now();
      if (now - lastMoveTime.current >= THROTTLE_MS) {
        lastMoveTime.current = now;
        callback(x, y);
      }
    },
    []
  );

  return throttledMove;
}

export default useDragMoveThrottle;