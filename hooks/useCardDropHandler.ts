/**
 * DEPRECATED: useCardDropHandler is no longer used
 *
 * All drop handling now goes through contact detection system:
 * - useHandCardDragHandler for hand cards
 * - TableDraggableCard for table cards
 * - Contact detection + determineActionFromContact
 *
 * This file is kept for backwards compatibility but should not be used.
 */

import { CardType } from '../components/card';

interface DropPosition {
  x: number;
  y: number;
  handled?: boolean;
  attempted?: boolean;
  targetType?: string;
  targetCard?: CardType;
  targetIndex?: number;
  draggedSource?: string;
  area?: string;
  tableZoneDetected?: boolean;
  needsServerValidation?: boolean;
}

interface CardDropHandlerProps {
  card: CardType;
  source: string;
  currentPlayer: number;
  stackId?: string | null;
}

/**
 * DEPRECATED: Use contact detection system instead
 * This hook is kept for backwards compatibility but does nothing
 */
export const useCardDropHandler = (props: CardDropHandlerProps) => {
  console.warn('[DEPRECATED] useCardDropHandler called - all drop handling now uses contact detection');

  const handleDrop = () => {
    // NO-OP: Contact detection handles all drops now
    console.warn('[DEPRECATED] useCardDropHandler.handleDrop called - this should not happen');
    return { handled: false, attempted: false } as DropPosition;
  };

  return { handleDrop };
};
