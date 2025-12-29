import React from 'react';
import { StyleSheet, View } from 'react-native';

export const EmptyTablePlaceholder: React.FC = () => {
  return <View style={styles.emptyTable} />;
};

const styles = StyleSheet.create({
  emptyTable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
    minWidth: 200,
  },
});
