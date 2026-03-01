/**
 * PlayOptionsModal
 * Shows build options when accepting a temp stack.
 * 
 * Style: Green/orange casino theme
 * Shows: Combined card preview with + indicator for card being added
 */

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
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
  const buildValue = cards.reduce((sum, c) => sum + c.value, 0);
  
  // Check: total sum (e.g., [5,3] → 8)
  const hasTotalMatch = playerHand.some(c => c.value === buildValue);
  
  // Check for pairs: if all cards have same rank, also allow single card value
  const allSameRank = cards.length > 1 && cards.every(c => c.rank === cards[0].rank);
  const singleValue = allSameRank ? cards[0].value : null;
  const hasSingleMatch = singleValue && playerHand.some(c => c.value === singleValue);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.clickOutside} 
          activeOpacity={1} 
          onPress={onCancel}
        />
        <View style={styles.modalContent}>
          {/* Header */}
          <Text style={styles.title}>Build Options</Text>
          
          {/* Description */}
          <Text style={styles.subtitle}>Use stack to build the following:</Text>
          
          {/* Combined card preview - all cards in one row with + indicator */}
          <View style={styles.cardsSection}>
            <View style={styles.cardsRow}>
              {cards.map((card, index) => (
                <View key={index} style={styles.cardWrapper}>
                  <PlayingCard rank={card.rank} suit={card.suit} />
                </View>
              ))}
              {/* + indicator */}
              <Text style={styles.plusSign}>+</Text>
              {/* Placeholder for card to be added - will be shown by user selecting */}
            </View>
            <Text style={styles.buildValue}>Total: {buildValue}</Text>
          </View>
          
          {/* Options - show multiple options */}
          <View style={styles.optionsSection}>
            {hasTotalMatch && (
              <TouchableOpacity 
                style={styles.optionButton} 
                onPress={() => onConfirm(buildValue)}
              >
                <Text style={styles.optionText}>Build {buildValue}</Text>
              </TouchableOpacity>
            )}
            
            {hasSingleMatch && singleValue !== buildValue && (
              <TouchableOpacity 
                style={styles.optionButton} 
                onPress={() => onConfirm(singleValue!)}
              >
                <Text style={styles.optionText}>Build {singleValue}</Text>
              </TouchableOpacity>
            )}
            
            {!hasTotalMatch && !hasSingleMatch && (
              <View style={styles.noOptions}>
                <Text style={styles.noOptionsText}>No matching cards</Text>
              </View>
            )}
          </View>
          
          {/* Cancel button */}
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  clickOutside: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#1a472a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#28a745',
    padding: 16,
    width: '75%',
    maxWidth: 260,
    alignItems: 'center',
    zIndex: 2001,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
  },
  cardsSection: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  cardWrapper: {
    marginHorizontal: -4,
  },
  plusSign: {
    fontSize: 20,
    color: '#f59e0b',
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  buildValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginTop: 8,
  },
  optionsSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#34d058',
    width: '100%',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  noOptions: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  noOptionsText: {
    fontSize: 14,
    color: '#f87171',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#374151',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    color: '#9ca3af',
  },
});

export default PlayOptionsModal;
