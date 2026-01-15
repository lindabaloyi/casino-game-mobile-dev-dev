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
  console.warn('[DEPRECATED] useDropResolver called - all drop resolution now uses contact detection');

  const resolveDrop = () => {
    // NO-OP: Contact detection handles all drop resolution now
    console.warn('[DEPRECATED] useDropResolver.resolveDrop called - this should not happen');
    return null;
  };

  return { resolveDrop };
}
