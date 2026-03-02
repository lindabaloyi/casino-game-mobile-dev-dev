/**
 * Throttle utility for limiting function execution rate
 * Useful for drag-move events to prevent flooding the network
 */

/**
 * Creates a throttled version of a function
 * @param fn The function to throttle
 * @param delay Minimum delay between executions in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    lastArgs = args;

    if (remaining <= 0) {
      // Enough time has passed, execute immediately
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      // Schedule execution for later
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        if (lastArgs) {
          fn(...lastArgs);
        }
      }, remaining);
    }
  }) as T;
}

/**
 * Creates a throttled version using requestAnimationFrame
 * Best for UI-related throttling
 * @param fn The function to throttle
 * @returns Throttled function
 */
export function throttleRAF<T extends (...args: any[]) => void>(
  fn: T
): T {
  let scheduled = false;
  let lastArgs: Parameters<T> | null = null;

  return ((...args: Parameters<T>) => {
    lastArgs = args;

    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        if (lastArgs) {
          fn(...lastArgs);
        }
      });
    }
  }) as T;
}
