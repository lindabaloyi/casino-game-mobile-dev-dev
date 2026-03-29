/**
 * StealBuildModal
 * Confirmation dialog for stealing an opponent's build.
 * 
 * Style: Green theme per casino-noir spec
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ModalSurface } from './ModalSurface';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../types';

interface StealBuildModalProps {
  visible: boolean;
  handCard: Card;
  buildCards: Card[];
  buildValue: number;
  buildOwner: number;
  playerNumber: number;
  onConfirm: () => void;
  onCancel: () => void;
  onPlayButtonSound?: () => void;
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
  onPlayButtonSound,
}: StealBuildModalProps) {
  const handleConfirm = () => {
    onPlayButtonSound?.();
    onConfirm();
  };

  const newValue = buildValue + handCard.value;

  return (
    <ModalSurface
      visible={visible}
      theme="green"
      title="STEAL Build"
      subtitle="Combined build"
      onClose={onCancel}
      maxWidth="md"
    >
      {/* Table cards row */}
      <View style={styles.tableCards}>
        {buildCards.map((card, index) => (
          <View key={index} style={styles.tableCard}>
            <Text style={styles.cardCornerTL}>{card.rank}</Text>
            <Text style={[styles.cardSuit, card.suit === '♥' || card.suit === '♦' ? styles.redSuit : styles.blackSuit]}>
              {card.suit}
            </Text>
            <Text style={styles.cardCornerBR}>{card.rank}</Text>
          </View>
        ))}
        <Text style={styles.plusSign}>+</Text>
        <View style={styles.tableCard}>
          <Text style={styles.cardCornerTL}>{handCard.rank}</Text>
          <Text style={[styles.cardSuit, handCard.suit === '♥' || handCard.suit === '♦' ? styles.redSuit : styles.blackSuit]}>
            {handCard.suit}
          </Text>
          <Text style={styles.cardCornerBR}>{handCard.rank}</Text>
        </View>
      </View>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoMain}>New Value: {newValue}</Text>
      </View>

      {/* Owner tag */}
      <View style={styles.ownerTag}>
        <Text style={styles.ownerText}>Build will belong to you!</Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity style={styles.btnGreen} onPress={handleConfirm}>
        <Text style={styles.btnText}>✓ Confirm</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnGhost} onPress={onCancel}>
        <Text style={styles.btnGhostText}>Cancel</Text>
      </TouchableOpacity>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  // Table cards row
  tableCards: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  tableCard: {
    width: 60,
    height: 84,
    backgroundColor: '#faf7f0',
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#bbb',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardCornerTL: {
    position: 'absolute',
    top: 3,
    left: 4,
    fontSize: 9,
    fontWeight: '900',
  },
  cardSuit: {
    fontSize: 22,
    fontWeight: '900',
  },
  cardCornerBR: {
    position: 'absolute',
    bottom: 3,
    right: 4,
    fontSize: 9,
    fontWeight: '900',
    transform: 'rotate(180deg)',
  },
  redSuit: {
    color: '#c0392b',
  },
  blackSuit: {
    color: '#1c1c1c',
  },
  plusSign: {
    fontSize: 20,
    fontWeight: '900',
    color: '#5a8a68',
  },

  // Info box
  infoBox: {
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  infoMain: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#fde68a',
  },

  // Owner tag
  ownerTag: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: '#4a9a60',
    marginBottom: 16,
    padding: 6,
    backgroundColor: 'rgba(40,167,69,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(40,167,69,0.2)',
    borderRadius: 9,
    width: '100%',
    alignItems: 'center',
  },
  ownerText: {
    color: '#4a9a60',
  },

  // Buttons
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
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#c8e6c9',
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

export default StealBuildModal;
