/**
 * ExtendBuildModal
 * Modal for extending a player's own build.
 * 
 * Style: Green theme per casino-noir spec
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ModalSurface } from './ModalSurface';
import { PlayingCard } from '../cards/PlayingCard';
import { Card, BuildStack } from '../../types';

interface ExtendBuildModalProps {
  visible: boolean;
  buildStack: BuildStack;
  playerHand: Card[];
  onAccept: (handCard: Card) => void;
  onCancel: () => void;
}

export function ExtendBuildModal({
  visible,
  buildStack,
  playerHand,
  onAccept,
  onCancel,
}: ExtendBuildModalProps) {
  const looseCard = buildStack.pendingExtension?.looseCard;
  
  if (!looseCard) {
    return null;
  }

  const getPotentialValue = (handCard: Card): number => {
    const total = buildStack.value + looseCard.value + handCard.value;
    if (total <= 10) return total;
    const sorted = [buildStack.value, looseCard.value, handCard.value].sort((a, b) => b - a);
    return sorted[0];
  };

  const validHandCards = playerHand.filter(card => getPotentialValue(card) > 0);

  return (
    <ModalSurface
      visible={visible}
      theme="green"
      title="Extend Build"
      subtitle="Add your card to the existing build"
      onClose={onCancel}
      maxWidth="md"
    >
      {/* Table cards */}
      <View style={styles.tableCards}>
        <View style={styles.tableCard}>
          <Text style={styles.cardCornerTL}></Text>
          <Text style={[styles.cardSuit, styles.blackSuit]}>
            Cards
          </Text>
        </View>
        <Text style={styles.plusSign}>+</Text>
        <View style={styles.tableCard}>
          <Text style={styles.cardCornerTL}></Text>
          <Text style={[styles.cardSuit, styles.blackSuit]}>
            Table
          </Text>
        </View>
      </View>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoMain}>New Value: 10</Text>
        <Text style={styles.infoSub}>Build extends to 10</Text>
      </View>

      {/* Hand card selection */}
      {validHandCards.length > 0 ? (
        <View style={styles.handCardsGrid}>
          {validHandCards.map((card, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.handCardButton}
              onPress={() => onAccept(card)}
            >
              <PlayingCard rank={card.rank} suit={card.suit} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.noOptions}>
          <Text style={styles.noOptionsText}>No valid cards in hand</Text>
        </View>
      )}

      <TouchableOpacity style={styles.btnGhost} onPress={onCancel}>
        <Text style={styles.btnGhostText}>Cancel</Text>
      </TouchableOpacity>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  // Table cards
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
    fontSize: 16,
    fontWeight: '900',
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

  // Hand cards grid
  handCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  handCardButton: {
    padding: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4a7c59',
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
  noOptions: {
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  noOptionsText: {
    fontSize: 14,
    color: '#f87171',
    fontWeight: 'bold',
  },
});

export default ExtendBuildModal;
