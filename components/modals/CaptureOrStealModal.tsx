/**
 * CaptureOrStealModal
 * Shows choice when capturing small opponent build - capture or extend/steal.
 * 
 * Now using ModalSurface - thin wrapper with red theme.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ModalSurface } from './ModalSurface';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../types';

interface CaptureOrStealModalProps {
  visible: boolean;
  card: Card;
  buildValue: number;
  buildCards: Card[];
  extendedTarget: number;
  onCapture: () => void;
  onExtend: () => void;
  onCancel: () => void;
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
  const handleCapture = () => {
    onPlayButtonSound?.();
    onCapture();
  };

  const handleExtend = () => {
    onPlayButtonSound?.();
    onExtend();
  };

  return (
    <ModalSurface
      visible={visible}
      theme="red"
      title="Capture or Steal?"
      subtitle={`Play ${card.rank}${card.suit} on build ${buildValue}. Capture now or extend to ${extendedTarget}.`}
      onClose={onCancel}
    >
      {/* Card display */}
      <View style={styles.cardSection}>
        <PlayingCard rank={card.rank} suit={card.suit} />
      </View>

      {/* Build info */}
      <View style={styles.buildInfo}>
        <Text style={styles.buildLabel}>Current build: {buildValue}</Text>
        <View style={styles.cardsRow}>
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

      {/* Action buttons */}
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

      {/* Cancel */}
      <TouchableOpacity 
        style={styles.cancelButton} 
        onPress={onCancel}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  cardSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  buildInfo: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  buildLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  miniCard: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  miniCardText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  extendedLabel: {
    fontSize: 14,
    color: '#34d058',
    marginTop: 8,
  },
  optionsSection: {
    width: '100%',
    marginBottom: 12,
  },
  optionButton: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 10,
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
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  cancelButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});

export default CaptureOrStealModal;