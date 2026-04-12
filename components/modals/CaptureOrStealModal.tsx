/**
 * CaptureOrStealModal
 * Shows choice when capturing small opponent build - capture or extend/steal.
 * 
 * Style: Red theme per casino-noir spec - refactored to match StealBuildModal
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ModalSurface } from './ModalSurface';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../types';
import { getTeamButtonStyle } from './ModalDesignSystem';

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

  // Calculate new value after extending
  const newValue = buildValue + card.value;

  return (
    <ModalSurface
      visible={visible}
      theme="red"
      title="Choose Action"
      onClose={onCancel}
      maxWidth="md"
    >
      {/* Card row - show build cards + hand card */}
      <View style={styles.cardsRow}>
        {buildCards.map((c, index) => (
          <PlayingCard
            key={`build-${index}`}
            rank={c.rank}
            suit={c.suit}
            width={36}
            height={48}
          />
        ))}

        <Text style={styles.plusSign}>+</Text>

        <PlayingCard
          rank={card.rank}
          suit={card.suit}
          width={36}
          height={48}
        />
      </View>

      {/* New value display */}
      <Text style={styles.newValueText}>
        After extend: {newValue}
      </Text>

      {/* Action buttons - cleaner text like StealBuildModal */}
      <TouchableOpacity 
        style={styles.btnRed} 
        onPress={handleCapture}
        activeOpacity={0.82}
      >
        <Text style={styles.btnText}>Capture {buildValue}</Text>
      </TouchableOpacity>
       
      <TouchableOpacity 
        style={styles.btnGreen} 
        onPress={handleExtend}
        activeOpacity={0.82}
      >
        <Text style={styles.btnText}>Steal Build</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.btnGhost} 
        onPress={onCancel}
      >
        <Text style={styles.btnGhostText}>Cancel</Text>
      </TouchableOpacity>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  // Card row - matches StealBuildModal
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 4,
  },
  plusSign: {
    fontSize: 18,
    fontWeight: '900',
    color: '#c0392b',
    marginHorizontal: 4,
  },

  // New value text - clean single line
  newValueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fbbf24',  // Gold matching modal theme
    marginBottom: 16,
    textAlign: 'center',
  },
   
  // Buttons - matching StealBuildModal
  btnRed: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: '#c0392b',
    alignItems: 'center',
    marginBottom: 7,
    borderWidth: 0,
  },
  btnGreen: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: '#1e7d3a',
    borderWidth: 1.5,
    borderColor: '#28a745',
    alignItems: 'center',
    marginBottom: 7,
  },
  btnGhost: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,100,100,0.15)',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9b5555',
  },
});

export default CaptureOrStealModal;
