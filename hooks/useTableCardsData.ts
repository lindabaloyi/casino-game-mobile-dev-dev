import { useMemo, useState } from 'react';
import { TableCard, transformTableCards } from '../utils/cardTypeUtils';

export const useTableCardsData = (tableCards: TableCard[] = []) => {
  const [cancelledStacks] = useState<Set<string>>(new Set());

  const transformedCards = useMemo(() => {
    return transformTableCards(tableCards, cancelledStacks);
  }, [tableCards, cancelledStacks]);

  return { transformedCards, cancelledStacks };
};
