/**
 * ConfirmTempBuildModal
 * Confirmation dialog for setting a temp stack's base value.
 * 
 * Style: Green theme per casino-noir spec
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ModalSurface } from './ModalSurface';
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
    <ModalSurface
      visible={visible}
      theme="green"
      title="Confirm Build"
      subtitle="Finalise — opponents can still steal!"
      onClose={onCancel}
      maxWidth="md"
    >
      {/* Card fan */}
      <View style={styles.fanZone}>
        <View style={styles.cardsRow}>
          {stack.cards?.map((card, index) => (
            <View key={index} style={styles.cardWrapper}>
              <PlayingCard rank={card.rank} suit={card.suit} />
            </View>
          ))}
        </View>
      </View>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoMain}>Build Value: {stack.value}</Text>
        <Text style={styles.infoSub}>{stack.cards?.length || 0} cards in build</Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity style={styles.btnGold} onPress={() => onConfirm(stack.value)}>
        <Text style={styles.btnText}>✓ Confirm</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnGhost} onPress={onCancel}>
        <Text style={styles.btnGhostText}>Cancel</Text>
      </TouchableOpacity>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  // Card fan
  fanZone: {
    position: 'relative',
    height: 96,
    marginBottom: 16,
    paddingHorizontal: 28,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    marginHorizontal: -4,
  },

  // Info box
  infoBox: {
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  infoMain: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#fde68a',
  },
  infoSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a9a60',
  },

  // Buttons
  btnGold: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: '#c8a84b',
    borderWidth: 0,
    alignItems: 'center',
    marginBottom: 7,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a0a00',
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
  btnGhostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6b8a72',
  },
});

export default ConfirmTempBuildModal;
