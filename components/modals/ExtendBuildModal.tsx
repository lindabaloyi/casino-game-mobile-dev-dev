/**
 * ExtendBuildModal
 * Modal for extending a player's own build.
 * 
 * Shows:
 * - Current build cards
 * - Locked loose card being added
 * - Player's hand cards to choose from
 * - Accept/Cancel buttons
 * 
 * Style: Green/orange casino theme
 */

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { Card, BuildStack } from '../../types';

interface ExtendBuildModalProps {
  visible: boolean;
  buildStack: BuildStack;      // The build being extended
  playerHand: Card[];          // Player's available hand cards
  onAccept: (handCard: Card) => void;  // Player selects hand card to add
  onCancel: () => void;        // Cancel the extension
}

export function ExtendBuildModal({
  visible,
  buildStack,
  playerHand,
  onAccept,
  onCancel,
}: ExtendBuildModalProps) {
  const looseCard = buildStack.pendingExtension?.looseCard;
  
  if (!looseCard) {
    return null;
  }

  // Calculate potential new build values with each hand card
  const getPotentialValue = (handCard: Card): number => {
    const total = buildStack.value + looseCard.value + handCard.value;
    if (total <= 10) {
      return total;
    }
    // For diff builds, return the base value (largest card)
    const sorted = [buildStack.value, looseCard.value, handCard.value].sort((a, b) => b - a);
    return sorted[0];
  };

  // Filter hand cards that could potentially create valid builds
  const validHandCards = playerHand.filter(card => {
    const potential = getPotentialValue(card);
    return potential > 0;
  });

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
          <Text style={styles.title}>EXTEND Build</Text>
          
          {/* Current Build */}
          <View style={styles.section}>
            <Text style={styles.label}>Current Build:</Text>
            <View style={styles.cardsRow}>
              {buildStack.cards.map((card, index) => (
                <View key={index} style={styles.cardWrapper}>
                  <PlayingCard rank={card.rank} suit={card.suit} />
                </View>
              ))}
            </View>
            <Text style={styles.buildValue}>Value: {buildStack.value}</Text>
          </View>

          {/* Locked Loose Card */}
          <View style={styles.section}>
            <Text style={styles.label}>Adding from table:</Text>
            <View style={styles.cardsRow}>
              <View style={styles.cardWrapper}>
                <PlayingCard rank={looseCard.rank} suit={looseCard.suit} />
              </View>
            </View>
            <Text style={styles.plusSign}>+</Text>
          </View>

          {/* Hand Card Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Select card from hand to add:</Text>
            {validHandCards.length > 0 ? (
              <View style={styles.handCardsGrid}>
                {validHandCards.map((card, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.handCardButton}
                    onPress={() => onAccept(card)}
                  >
                    <PlayingCard rank={card.rank} suit={card.suit} />
                    <Text style={styles.handCardValue}>{card.value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noOptions}>
                <Text style={styles.noOptionsText}>No valid cards in hand</Text>
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
    width: '85%',
    maxWidth: 300,
    alignItems: 'center',
    zIndex: 2001,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 8,
  },
  section: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  label: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    marginHorizontal: -4,
  },
  plusSign: {
    fontSize: 20,
    color: '#f59e0b',
    fontWeight: 'bold',
    marginVertical: 4,
  },
  buildValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginTop: 4,
  },
  handCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  handCardButton: {
    alignItems: 'center',
    padding: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4a7c59',
  },
  handCardValue: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
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
    marginTop: 8,
  },
  cancelText: {
    fontSize: 13,
    color: '#9ca3af',
  },
});

export default ExtendBuildModal;
