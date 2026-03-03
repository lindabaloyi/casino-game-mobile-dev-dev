import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TableItem } from '../types';
import { CARD_HEIGHT } from './useTableLayout';

interface TableRowProps {
  items: TableItem[];
  rowIndex: number;
  rowGap: number;
  renderItem: (item: TableItem, index: number) => React.ReactNode;
}

export function TableRow({ items, rowIndex, rowGap, renderItem }: TableRowProps) {
  console.log(`[TableRow] Rendering row ${rowIndex} with ${items.length} items`);
  
  return (
    <View 
      style={[
        styles.row,
        rowIndex > 0 && { marginTop: rowGap }
      ]}
    >
      {items.map((item, index) => {
        // Log item type for debugging
        const itemType = item && typeof item === 'object' && 'type' in item ? item.type : 'unknown';
        console.log(`[TableRow] Row ${rowIndex} item ${index}: ${itemType}`);
        return renderItem(item, index);
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: CARD_HEIGHT + 20,
    flexWrap: 'wrap', // Allow wrapping if needed
    width: '100%',
  },
});
