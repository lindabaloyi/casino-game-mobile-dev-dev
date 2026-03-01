/**
 * CaptureOrAddModal
 * Shown when player drags a card onto their own build.
 * 
 * Options:
 * - Add to Build: Add the card to the build (asserting dominance)
 * - Capture: Capture the build with the card
 */

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from './types';

interface CaptureOrAddModalProps {
  visible: boolean;
  card: Card;           // The card being dragged
  buildValue: number;   // The build's current value
  onAddToBuild: () => void;
  onCapture: () => void;
  onCancel: () => void;
}

export function CaptureOrAddModal({
  visible,
  card,
  buildValue,
  onAddToBuild,
  onCapture,
  onCancel,
}: CaptureOrAddModalProps) {
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
          <Text style={styles.title}>Build {buildValue}</Text>
          
          {/* Card being dragged */}
          <View style={styles.cardSection}>
            <Text style={styles.label}>Card:</Text>
            <View style={styles.cardWrapper}>
              <PlayingCard rank={card.rank} suit={card.suit} />
            </View>
          </View>
          
          {/* Options */}
          <Text style={styles.question}>What to do?</Text>
          
          {/* Add to Build button */}
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={onAddToBuild}
          >
            <Text style={styles.addButtonText}>+ Add to Build</Text>
            <Text style={styles.addButtonSub}>Augment your build</Text>
          </TouchableOpacity>
          
          {/* Capture button */}
          <TouchableOpacity 
            style={styles.captureButton} 
            onPress={onCapture}
          >
            <Text style={styles.captureButtonText}>✓ Capture</Text>
            <Text style={styles.captureButtonSub}>Take the build</Text>
          </TouchableOpacity>
          
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
    minWidth: 260,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 16,
  },
  cardSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  cardWrapper: {
    transform: [{ rotate: '-5deg' }],
  },
  question: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#a78bfa',
    width: '100%',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButtonSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  captureButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#34d399',
    width: '100%',
    alignItems: 'center',
  },
  captureButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  captureButtonSub: {
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

export default CaptureOrAddModal;
