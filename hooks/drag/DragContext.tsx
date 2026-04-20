import React, { createContext, useContext } from 'react';
import { useSharedValue, SharedValue } from 'react-native-reanimated';

export interface Card {
  rank: string;
  suit: string;
  value: number;
}

export type DragSource = 'hand' | 'captured' | 'table' | null;

export interface DragContextValue {
  // Ghost state (UI thread - instant updates)
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  draggingCard: SharedValue<Card | null>;
  dragSource: SharedValue<DragSource>;
  isDragging: SharedValue<boolean>;
  isMyTurn: SharedValue<boolean>;

  // Pending drop state (optimistic UI - card dropped, server not confirmed)
  pendingDropCard: SharedValue<Card | null>;
  pendingDropSource: SharedValue<DragSource>;

  // Actions
  markPendingDrop: (card: Card, source: DragSource) => void;
  clearPendingDrop: () => void;
  isPendingDrop: (card: Card, source: DragSource) => boolean;
}

const DragContext = createContext<DragContextValue | null>(null);

export const DragProvider = ({ children }: { children: React.ReactNode }) => {
  // Ghost state
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const draggingCard = useSharedValue<Card | null>(null);
  const dragSource = useSharedValue<DragSource>(null);
  const isDragging = useSharedValue(false);
  const isMyTurn = useSharedValue(false);

  // Pending drop state
  const pendingDropCard = useSharedValue<Card | null>(null);
  const pendingDropSource = useSharedValue<DragSource>(null);

  const markPendingDrop = (card: Card, source: DragSource) => {
    pendingDropCard.value = card;
    pendingDropSource.value = source;
  };

  const clearPendingDrop = () => {
    pendingDropCard.value = null;
    pendingDropSource.value = null;
  };

  const isPendingDrop = (card: Card, source: DragSource): boolean => {
    const pCard = pendingDropCard.value;
    const pSource = pendingDropSource.value;
    if (!pCard || !pSource) return false;
    return pCard.rank === card.rank &&
           pCard.suit === card.suit &&
           pSource === source;
  };

  return (
    <DragContext.Provider value={{
      dragX,
      dragY,
      draggingCard,
      dragSource,
      isDragging,
      isMyTurn,
      pendingDropCard,
      pendingDropSource,
      markPendingDrop,
      clearPendingDrop,
      isPendingDrop,
    }}>
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
