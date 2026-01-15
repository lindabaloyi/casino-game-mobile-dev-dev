/**
 * DEPRECATED: Drop resolver is no longer used
 *
 * All drop resolution now happens through contact detection system:
 * - Contact detection finds touched elements
 * - determineActionFromContact routes to appropriate handlers
 * - Handlers return server actions directly
 *
 * This file is kept for backwards compatibility but does nothing.
 */

/**
 * DEPRECATED: Use contact detection system instead
 */
export function useDropResolver() {
  const resolveDrop = () => {
    // NO-OP: Contact detection handles all drop resolution now
    return null;
  };

  return { resolveDrop };
}
