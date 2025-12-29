import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EmptyTablePlaceholder } from './index';

interface TableContainerProps {
  isEmpty: boolean;
  children: React.ReactNode;
}

export const TableContainer: React.FC<TableContainerProps> = ({ isEmpty, children }) => {
  return (
    <View style={styles.tableContainer}>
      <View style={styles.tableArea}>
        {isEmpty ? (
          <EmptyTablePlaceholder />
        ) : (
          <View style={styles.cardsContainer}>{children}</View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B5E20',
    padding: 10,
  },
  tableArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  cardsContainer: {
    flex: 1,
    minHeight: 180,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    flexWrap: 'wrap',
    gap: 30,
    alignSelf: 'center',
    overflow: 'visible',
  },
});
