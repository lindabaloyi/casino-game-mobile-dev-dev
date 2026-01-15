export type CardType = 'loose' | 'temporary_stack' | 'build';

export interface TableCard {
  type?: CardType;
  [key: string]: any;
}

/**
 * Pure function to detect card type
 */
export const getCardType = (card: TableCard): CardType => {
  if (!card) return 'loose';
  if ('type' in card) return card.type as CardType;
  return 'loose';
};

/**
 * Expand cancelled stack into individual cards with position metadata
 */
export const expandCancelledStack = (stack: any, originalIndex: number): any[] => {
  const cards = stack.cards || [];

  if (cards.length === 0) {
    console.warn(`[cardTypeUtils] Cancelled stack ${stack.stackId} has no cards`);
    return [];
  }

  return cards.map((card: any, cardIndex: number) => ({
    ...card,
    _cancelledStackId: stack.stackId,
    _pos: originalIndex,
    _inStackIdx: cardIndex
  }));
};

/**
 * Transform table cards, expanding cancelled stacks while preserving order
 */
export const transformTableCards = (
  tableCards: TableCard[],
  cancelledStacks: Set<string>
): TableCard[] => {
  return tableCards.flatMap((tableItem, originalIndex) => {
    if (!tableItem) return [];

    const itemType = getCardType(tableItem);

    // Expand cancelled temp stacks
    if (itemType === 'temporary_stack') {
      const stackId = (tableItem as any).stackId;
      const isCancelled = cancelledStacks.has(stackId);

      if (isCancelled) {
        return expandCancelledStack(tableItem, originalIndex);
      }
    }

    return [tableItem];
  });
};
