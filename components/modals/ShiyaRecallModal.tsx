/**
 * ShiyaRecallModal
 * Appears when a teammate captures a build on which the current player activated Shiya.
 * Offers Recall (calls recallBuild) or Leave options.
 * Auto-dismisses after specified duration.
 * 
 * Style: Green/orange casino theme (matches PlayOptionsModal)
 */

import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../types';

interface ShiyaBuildEntry {
  value: number;
  cards: Card[];
  stackId: string;
  shiyaPlayer?: number;
}

interface ShiyaRecallModalProps {
  visible: boolean;
  build: ShiyaBuildEntry | null;
  onRecall: () => void;
  onClose: () => void;
  autoCloseMs?: number;
}

export function ShiyaRecallModal({
  visible,
  build,
  onRecall,
  onClose,
  autoCloseMs = 4000,
}: ShiyaRecallModalProps) {
  const [timeLeft, setTimeLeft] = useState(Math.ceil(autoCloseMs / 1000));

  useEffect(() => {
    if (!visible) return;
    
    setTimeLeft(Math.ceil(autoCloseMs / 1000));
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [visible, autoCloseMs]);

  if (!build) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.clickOutside} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          {/* Header */}
          <Text style={styles.title}>Recall Shiya Build?</Text>
          
          {/* Timer */}
          <Text style={styles.timer}>Auto-closes in {timeLeft}s</Text>
          
          {/* Build cards preview */}
          <View style={styles.cardsSection}>
            <View style={styles.cardsRow}>
              {build.cards?.map((card, index) => (
                <View key={index} style={styles.cardWrapper}>
                  <PlayingCard rank={card.rank} suit={card.suit} />
                </View>
              ))}
            </View>
            <Text style={styles.buildValue}>
              Value: {build.value}
            </Text>
          </View>
          
          {/* Buttons */}
          <View style={styles.buttonSection}>
            <TouchableOpacity 
              style={[styles.button, styles.recallButton]} 
              onPress={onRecall}
            >
              <Text style={styles.buttonText}>Recall</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.leaveButton]} 
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Leave</Text>
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
  timer: {
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
  buildValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginTop: 8,
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
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
  recallButton: {
    backgroundColor: '#27AE60',
    borderColor: '#34d058',
  },
  leaveButton: {
    backgroundColor: '#E74C3C',
    borderColor: '#E74C3C',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default ShiyaRecallModal;
