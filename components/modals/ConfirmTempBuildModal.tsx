/**
 * ConfirmTempBuildModal
 * Confirmation dialog for setting a temp stack's base value.
 * 
 * Shows when player double-taps a temp stack to set its base value.
 * Displays stack info and requires explicit confirmation.
 * 
 * Style: Green/orange casino theme (matches PlayOptionsModal)
 */

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../types';

interface TempStackInfo {
  stackId: string;
  value: number;
  cards: Card[];
}

interface ConfirmTempBuildModalProps {
  visible: boolean;
  stack: TempStackInfo | null;
  onConfirm: (value: number) => void;
  onCancel: () => void;
}

export function ConfirmTempBuildModal({
  visible,
  stack,
  onConfirm,
  onCancel,
}: ConfirmTempBuildModalProps) {
  if (!stack) return null;

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
          <Text style={styles.title}>Confirm Build</Text>
          
          {/* Subtitle */}
          <Text style={styles.subtitle}>Double-tap detected on temp stack</Text>
          
          {/* Stack info */}
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Stack ID:</Text>
            <Text style={styles.infoValue}>{stack.stackId}</Text>
          </View>
          
          {/* Cards preview */}
          <View style={styles.cardsSection}>
            <View style={styles.cardsRow}>
              {stack.cards?.map((card, index) => (
                <View key={index} style={styles.cardWrapper}>
                  <PlayingCard rank={card.rank} suit={card.suit} />
                </View>
              ))}
            </View>
            <Text style={styles.buildValue}>
              Proposed Base Value: {stack.value}
            </Text>
          </View>
          
          {/* Instructions */}
          <Text style={styles.instructions}>
            Confirm to set this as the permanent build value
          </Text>
          
          {/* Buttons */}
          <View style={styles.buttonSection}>
            <TouchableOpacity 
              style={[styles.button, styles.confirmButton]} 
              onPress={() => onConfirm(stack.value)}
            >
              <Text style={styles.buttonText}>Confirm</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={onCancel}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
    maxWidth: 280,
    alignItems: 'center',
    zIndex: 2001,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginRight: 6,
  },
  infoValue: {
    fontSize: 14,
    color: '#fbbf24',
    fontWeight: 'bold',
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
  buildValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginTop: 8,
  },
  instructions: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#27AE60',
    borderColor: '#34d058',
  },
  cancelButton: {
    backgroundColor: '#E74C3C',
    borderColor: '#E74C3C',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default ConfirmTempBuildModal;
