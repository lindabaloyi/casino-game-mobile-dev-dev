/**
 * StealBuildModal
 * Confirmation dialog for stealing an opponent's build.
 * 
 * Shows:
 * - Card from player's hand being used
 * - Opponent's build being stolen
 * - Confirm and Cancel buttons
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
          <Text style={styles.subtitle}>Take ownership of opponent&apos;s build</Text>
          
          {/* Build being stolen */}
          <View style={styles.section}>
            <Text style={styles.label}>Opponent&apos;s Build:</Text>
            <View style={styles.buildCards}>
              {buildCards.map((card, index) => (
                <View key={index} style={styles.miniCard}>
                  <PlayingCard rank={card.rank} suit={card.suit} style={{ transform: [{ scale: 0.5 }] }} />
                </View>
              ))}
            </View>
            <Text style={styles.buildValue}>Value: {buildValue}</Text>
            <Text style={styles.ownerText}>Owner: Player {buildOwner}</Text>
          </View>
          
          {/* Arrow indicator */}
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>+</Text>
          </View>
          
          {/* Card being used */}
          <View style={styles.section}>
            <Text style={styles.label}>Your Card:</Text>
            <View style={styles.cardWrapper}>
              <PlayingCard rank={handCard.rank} suit={handCard.suit} />
            </View>
            <Text style={styles.cardValue}>Value: {handCard.value}</Text>
          </View>
          
          {/* Result preview */}
          <View style={styles.resultSection}>
            <Text style={styles.resultText}>
              New build will belong to you!
            </Text>
          </View>
          
          {/* Confirm button */}
          <TouchableOpacity 
            style={styles.confirmButton} 
            onPress={onConfirm}
          >
            <Text style={styles.confirmButtonText}>✓ Confirm</Text>
            <Text style={styles.confirmButtonSub}>Steal this build</Text>
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
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e94560',
    padding: 24,
    minWidth: 300,
    alignItems: 'center',
    zIndex: 2001,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 20,
  },
  section: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  label: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buildCards: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  miniCard: {
    transform: [{ scale: 0.5 }],
    marginHorizontal: -12,
  },
  buildValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginTop: 8,
  },
  ownerText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  arrowContainer: {
    marginVertical: 8,
  },
  arrow: {
    fontSize: 24,
    color: '#e94560',
    fontWeight: 'bold',
  },
  cardWrapper: {
    transform: [{ rotate: '-5deg' }],
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginTop: 8,
  },
  resultSection: {
    backgroundColor: 'rgba(233, 69, 96, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 14,
    color: '#e94560',
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ff6b8a',
    width: '100%',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  confirmButtonSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  cancelButton: {
    backgroundColor: '#374151',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});

export default StealBuildModal;
