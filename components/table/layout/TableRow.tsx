import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TableItem } from '../types';
import { CARD_GAP, CARD_HEIGHT } from './useTableLayout';

interface TableRowProps {
  items: TableItem[];
  rowIndex: number;
  rowGap: number;
  renderItem: (item: TableItem, index: number) => React.ReactNode;
}

export function TableRow({ items, rowIndex, rowGap, renderItem }: TableRowProps) {
  return (
    <View 
      style={[
        styles.row,
        rowIndex > 0 && { marginTop: rowGap }
      ]}
    >
      {items.map((item, index) => (
        <View key={`${index}`} style={index > 0 ? { marginLeft: CARD_GAP } : undefined}>
          {renderItem(item, index)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: CARD_HEIGHT + 20,
  },
});
