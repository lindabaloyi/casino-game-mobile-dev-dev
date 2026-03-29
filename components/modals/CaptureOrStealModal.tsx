/**
 * CaptureOrStealModal
 * Shows choice when capturing small opponent build - capture or extend/steal.
 * 
 * Style: Red/orange casino theme
 * Shows: Card being played, build info, and two options
 */

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../types';

interface CaptureOrStealModalProps {
  visible: boolean;
  // Card being played
  card: Card;
  // The build being interacted with
  buildValue: number;
  buildCards: Card[];
  // What the build will become if extended
  extendedTarget: number;
  // Callback for capture (take the build)
  onCapture: () => void;
  // Callback for extend/steal (add card to build)
  onExtend: () => void;
  // Cancel callback
  onCancel: () => void;
  /** Optional callback for button click sound */
  onPlayButtonSound?: () => void;
}

export function CaptureOrStealModal({
  visible,
  card,
  buildValue,
  buildCards,
  extendedTarget,
  onCapture,
  onExtend,
  onCancel,
  onPlayButtonSound,
}: CaptureOrStealModalProps) {
  // Handle confirm with optional sound
  const handleCapture = () => {
    if (onPlayButtonSound) {
      onPlayButtonSound();
    }
    onCapture();
  };

  const handleExtend = () => {
    if (onPlayButtonSound) {
      onPlayButtonSound();
    }
    onExtend();
  };

  // Handle cancel with optional sound
  const handleCancel = () => {
    if (onPlayButtonSound) {
      onPlayButtonSound();
    }
    onCancel();
  };

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
          <Text style={styles.title}>Choose Action</Text>
          
          {/* Description */}
          <Text style={styles.subtitle}>What to do with {card.rank}{card.suit}</Text>
          
          {/* Card being played */}
          <View style={styles.cardSection}>
            <PlayingCard rank={card.rank} suit={card.suit} />
          </View>
          
          {/* Build info */}
          <View style={styles.buildInfo}>
            <Text style={styles.buildLabel}>Current build: {buildValue}</Text>
            <View style={styles.buildCardsRow}>
              {buildCards?.map((c, i) => (
                <View key={i} style={styles.miniCard}>
                  <Text style={styles.miniCardText}>{c.rank}{c.suit}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.extendedLabel}>
              After extend: {extendedTarget}
            </Text>
          </View>
          
          {/* Options - Capture or Extend */}
          <View style={styles.optionsSection}>
            <TouchableOpacity 
              style={[styles.optionButton, styles.captureButton]} 
              onPress={handleCapture}
            >
              <Text style={styles.optionText}>Capture {buildValue}</Text>
              <Text style={styles.optionSubtext}>Take the build</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionButton, styles.extendButton]} 
              onPress={handleExtend}
            >
              <Text style={styles.optionText}>Extend to {extendedTarget}</Text>
              <Text style={styles.optionSubtext}>Add to build</Text>
            </TouchableOpacity>
          </View>
          
          {/* Cancel button */}
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
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
    backgroundColor: '#4a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dc2626',
    padding: 16,
    width: '85%',
    maxWidth: 340,
    minWidth: 260,
    alignItems: 'center',
    zIndex: 2001,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
  },
  cardSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  buildInfo: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 8,
    borderRadius: 8,
  },
  buildLabel: {
    fontSize: 14,
    color: '#fbbf24',
    fontWeight: 'bold',
  },
  buildCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 4,
    gap: 2,
  },
  miniCard: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  miniCardText: {
    fontSize: 10,
    color: '#000',
    fontWeight: 'bold',
  },
  extendedLabel: {
    fontSize: 12,
    color: '#34d058',
    marginTop: 4,
  },
  optionsSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: '#dc2626',
    borderColor: '#f87171',
  },
  extendButton: {
    backgroundColor: '#059669',
    borderColor: '#34d058',
  },
  optionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  optionSubtext: {
    fontSize: 11,
    color: '#d1d5db',
    marginTop: 2,
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

export default CaptureOrStealModal;