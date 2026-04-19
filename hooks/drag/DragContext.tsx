/**
 * DragContext - UI-thread drag position for instant ghost movement
 * No React state, no JS callbacks - pure shared values on UI thread
 * 
 * DEBUG: Added logging to track UI-thread drag state
 */

import { createContext, useContext } from 'react';
import { useSharedValue, SharedValue, runOnJS } from 'react-native-reanimated';

interface Card {
  rank: string;
  suit: string;
  value: number;
}

export type DragSource = 'hand' | 'captured' | 'table' | null;

interface DragContextValue {
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  draggingCard: SharedValue<Card | null>;
  dragSource: SharedValue<DragSource>;
}

const DragContext = createContext<DragContextValue | null>(null);

// Debug logging helper that can be called from UI thread
function logDragContextUpdate(card: Card | null, source: DragSource, x: number, y: number) {
  console.log('[DragContext:update]', {
    card: card ? `${card.rank}${card.suit}` : null,
    source,
    x: Math.round(x),
    y: Math.round(y)
  });
}

export const DragProvider = ({ children }: { children: React.ReactNode }) => {
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const draggingCard = useSharedValue<Card | null>(null);
  const dragSource = useSharedValue<DragSource>(null);

  return (
    <DragContext.Provider value={{ dragX, dragY, draggingCard, dragSource }}>
      {children}
    </DragContext.Provider>
  );
};

export const useDragContext = (): DragContextValue => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDragContext must be used within DragProvider');
  }
  return context;
};

export default DragContext;