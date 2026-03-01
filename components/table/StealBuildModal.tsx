/**
 * StealBuildModal
 * Confirmation dialog for stealing an opponent's build.
 * 
 * Style: Green/orange casino theme
 * Shows: Combined card preview in one row with + indicator
 */

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from './types';

interface StealBuildModalProps {
  visible: boolean;
  handCard: Card;          // Card from player's hand
  buildCards: Card[];      // Cards in the opponent's build
  buildValue: number;      // Current build value
  buildOwner: number;     // Owner player number (opponent)
  playerNumber: number;   // Current player number
  onConfirm: () => void;
  onCancel: () => void;
}

export function StealBuildModal({
  visible,
  handCard,
  buildCards,
  buildValue,
  buildOwner,
  playerNumber,
  onConfirm,
  onCancel,
}: StealBuildModalProps) {
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
          <Text style={styles.title}>STEAL Build</Text>
          
          {/* Combined card preview - all cards in one row */}
          <View style={styles.cardsSection}>
            <Text style={styles.label}>Combined Build:</Text>
            <View style={styles.cardsRow}>
              {buildCards.map((card, index) => (
                <View key={index} style={styles.cardWrapper}>
                  <PlayingCard rank={card.rank} suit={card.suit} />
                </View>
              ))}
              {/* + indicator */}
              <Text style={styles.plusSign}>+</Text>
              {/* Card being added */}
              <View style={styles.cardWrapper}>
                <PlayingCard rank={handCard.rank} suit={handCard.suit} />
              </View>
            </View>
            <Text style={styles.buildValue}>New Value: {buildValue + handCard.value}</Text>
          </View>
          
          {/* Result preview */}
          <View style={styles.resultSection}>
            <Text style={styles.resultText}>
              Build will belong to you!
            </Text>
          </View>
          
          {/* Confirm button */}
          <TouchableOpacity 
            style={styles.confirmButton} 
            onPress={onConfirm}
          >
            <Text style={styles.confirmButtonText}>✓ Confirm</Text>
          </TouchableOpacity>
          
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
  },
  cardsSection: {
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
  resultSection: {
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 13,
    color: '#28a745',
    fontWeight: 'bold',
  },
  confirmButton: {
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
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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

export default StealBuildModal;
