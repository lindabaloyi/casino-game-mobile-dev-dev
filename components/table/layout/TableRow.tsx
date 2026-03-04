import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TableItem } from '../types';

interface TableRowProps {
  items: TableItem[];
  rowIndex: number;
  rowGap: number;
  cardGap?: number;
  cardHeight?: number;
  renderItem: (item: TableItem, index: number) => React.ReactNode;
}

export function TableRow({ items, rowIndex, rowGap, cardGap = 40, cardHeight = 84, renderItem }: TableRowProps) {
  return (
    <View 
      style={[
        styles.row,
        { marginTop: rowGap, minHeight: (cardHeight || 84) + 20 }
      ]}
    >
      {items.map((item, index) => (
        <View key={`${index}`} style={index > 0 ? { marginLeft: cardGap } : undefined}>
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
  },
});
