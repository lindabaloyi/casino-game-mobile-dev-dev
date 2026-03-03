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
  const { rowDistribution, ROW_GAP } = useTableLayout(items.length);
  
  console.log(`[TableGrid] ===== GRID RENDERING =====`);
  console.log(`[TableGrid] Total items: ${items.length}`);
  console.log(`[TableGrid] Row distribution: [${rowDistribution.join(', ')}]`);
  
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
      console.log(`[TableGrid] Row ${result.length}: ${row.length} items`);
      result.push(row);
    }
    
    console.log(`[TableGrid] Total rows created: ${result.length}`);
    return result;
  }, [items, rowDistribution]);

  // If no rows, don't render anything
  if (rows.length === 0) {
    console.log(`[TableGrid] No rows to render`);
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
    backgroundColor: 'rgba(0,255,0,0.05)', // Very subtle debug background
  },
});
