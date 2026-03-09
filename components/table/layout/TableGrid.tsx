import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { TableItem } from '../types';
import { TableRow } from './TableRow';
import { useTableLayout } from './useTableLayout';

interface TableGridProps {
  items: TableItem[];
  renderItem: (item: TableItem, index: number) => React.ReactNode;
}

export function TableGrid({ items, renderItem }: TableGridProps) {
  const { rowDistribution, ROW_GAP, CARD_GAP, CARD_HEIGHT, maxCardsPerRow, CARD_WIDTH } = useTableLayout(items.length);
  
  // Debug: Log layout calculations
  console.log('[TableGrid] Layout:', {
    itemCount: items.length,
    rowDistribution,
    maxCardsPerRow,
    CARD_WIDTH: CARD_WIDTH?.toFixed(1),
    CARD_GAP: CARD_GAP?.toFixed(1),
    CARD_HEIGHT: CARD_HEIGHT?.toFixed(1)
  });
  
  // Build rows based on distribution
  const rows = useMemo(() => {
    const result: TableItem[][] = [];
    let itemIndex = 0;
    
    for (const cardsInRow of rowDistribution) {
      const row: TableItem[] = [];
      for (let i = 0; i < cardsInRow && itemIndex < items.length; i++) {
        row.push(items[itemIndex]);
        itemIndex++;
      }
      result.push(row);
    }
    return result;
  }, [items, rowDistribution]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={styles.grid}>
      {rows.map((row, index) => (
        <TableRow 
          key={`row-${index}`}
          items={row}
          rowIndex={index}
          rowGap={ROW_GAP}
          cardGap={CARD_GAP}
          cardHeight={CARD_HEIGHT}
          renderItem={renderItem}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 12,
  },
});
