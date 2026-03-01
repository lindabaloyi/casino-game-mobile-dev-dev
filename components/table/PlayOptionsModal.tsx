/**
 * PlayOptionsModal
 * Shows dynamic build options based on player's hand.
 * 
 * Logic:
 * - Normal stacks (like [5,3]): Only 1 possible value (5+3=8)
 * - Pair stacks (like [4,4]): 2 possible values (4 and 4+4=8)
 * - Show only options where player has matching card in hand
 */

import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from './types';

interface PlayOptionsModalProps {
  visible: boolean;
  cards: Card[];
  playerHand: Card[];
  onConfirm: (buildValue: number) => void;
  onCancel: () => void;
}

export function PlayOptionsModal({
  visible,
  cards,
  playerHand,
  onConfirm,
  onCancel,
}: PlayOptionsModalProps) {
  // Calculate available build options based on cards and player's hand
  const options = useMemo(() => {
    if (!cards || cards.length === 0) return [];
    
    const handValues = new Set(playerHand.map(c => c.value));
    const cardValues = cards.map(c => c.value);
    const opts: number[] = [];
    
    // Check: total sum (e.g., [5,3] → 8)
    const totalSum = cardValues.reduce((sum, v) => sum + v, 0);
    if (handValues.has(totalSum)) {
      opts.push(totalSum);
    }
    
    // Check for pairs: if all cards have same rank, also allow single card value
    // e.g., [4,4] → can build 4 (single 4) or 8 (4+4)
    const allSameRank = cards.length > 1 && cards.every(c => c.rank === cards[0].rank);
    if (allSameRank) {
      const singleValue = cardValues[0];
      if (handValues.has(singleValue) && !opts.includes(singleValue)) {
        opts.push(singleValue);
      }
    }
    
    // Sort descending
    return opts.sort((a, b) => b - a);
  }, [cards, playerHand]);

  const hasOptions = options.length > 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <Text style={styles.title}>Build Options</Text>
          
          {/* Show options or "cannot accept" message */}
          {hasOptions ? (
            <>
              <Text style={styles.subtitle}>Select build value:</Text>
              {options.map((value) => (
                <TouchableOpacity 
                  key={value}
                  style={styles.optionButton}
                  onPress={() => onConfirm(value)}
                >
                  <Text style={styles.optionText}>Build {value}</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <View style={styles.noOptions}>
              <Text style={styles.noOptionsText}>No matching cards</Text>
              <Text style={styles.noOptionsSubtext}>Cannot accept this build</Text>
            </View>
          )}
          
          {/* Cancel */}
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a472a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2e7d32',
    padding: 24,
    minWidth: 220,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  optionButton: {
    backgroundColor: '#28a745',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#34d058',
    width: '100%',
  },
  optionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  noOptions: {
    paddingVertical: 16,
    marginBottom: 12,
  },
  noOptionsText: {
    fontSize: 16,
    color: '#f87171',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  noOptionsSubtext: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },
  cancelButton: {
    backgroundColor: '#374151',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    width: '100%',
  },
  cancelText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default PlayOptionsModal;
