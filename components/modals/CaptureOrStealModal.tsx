/**
 * CaptureOrStealModal
 * Shows choice when capturing small opponent build - capture or extend/steal.
 * 
 * Style: Red theme per casino-noir spec
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
      title="Choose Action"
      subtitle={`What to do with ${card.rank}${card.suit}`}
      onClose={onCancel}
      maxWidth="md"
    >
      {/* Card display - single card centered */}
      <View style={styles.fanZone}>
        <PlayingCard rank={card.rank} suit={card.suit} />
      </View>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoMain}>Build Value: {buildValue}</Text>
        <Text style={styles.infoSub}>
          After extend: {extendedTarget}
        </Text>
      </View>

      {/* Action buttons */}
      <TouchableOpacity 
        style={styles.btnRed} 
        onPress={handleCapture}
      >
        <Text style={styles.btnText}>Capture {buildValue}</Text>
        <Text style={styles.btnSub}>Take the build</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.btnGreen} 
        onPress={handleExtend}
      >
        <Text style={styles.btnText}>Extend to {extendedTarget}</Text>
        <Text style={styles.btnSub}>Add to build</Text>
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
  // Card fan zone - fixed height for consistency
  fanZone: {
    alignItems: 'center',
    marginBottom: 16,
    height: 96,
    justifyContent: 'flex-end',
  },
  
  // Info box from spec
  infoBox: {
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 16,
    textAlign: 'center',
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  infoMain: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#fde68a',
    marginBottom: 1,
  },
  infoSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a9a60',
  },
  
  // Buttons per spec
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
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  btnSub: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.78,
    marginTop: 2,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6b8a72',
  },
});

export default CaptureOrStealModal;