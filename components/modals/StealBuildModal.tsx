/**
 * StealBuildModal
 * Confirmation dialog for stealing an opponent's build.
 * 
 * Style: Red theme with pulsing confirm button.
 * Buttons dynamically colored based on player's team.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ModalSurface } from './ModalSurface';
import { PlayingCard } from '../cards/PlayingCard';
import { Card } from '../../types';
import { getTeamButtonStyle } from './ModalDesignSystem';

interface StealBuildModalProps {
  visible: boolean;
  handCard: Card;
  buildCards: Card[];
  buildValue: number;
  buildOwner: number;
  playerNumber: number;
  /** Total player count */
  playerCount?: number;
  /** Whether party mode is enabled */
  isPartyMode?: boolean;
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
  playerCount = 2,
  isPartyMode = false,
  onConfirm,
  onCancel,
  onPlayButtonSound,
}: StealBuildModalProps) {
  // Pulsing glow animation on the confirm button
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible, glowAnim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  const handleConfirm = () => {
    onPlayButtonSound?.();
    onConfirm();
  };

  const newValue = buildValue + handCard.value;

  // Team-colored confirm button — same system, now layered over red theme
  const confirmButtonStyle = getTeamButtonStyle(playerNumber, playerCount, isPartyMode);

  return (
    <ModalSurface
      visible={visible}
      theme="red"
      title="Steal Build"
      onClose={onCancel}
      maxWidth="md"
    >
      {/* Card row */}
      <View style={styles.cardsRow}>
        {buildCards.map((card, index) => (
          <PlayingCard
            key={`build-${index}`}
            rank={card.rank}
            suit={card.suit}
            width={36}
            height={48}
          />
        ))}

        <Text style={styles.plusSign}>+</Text>

        <PlayingCard
          rank={handCard.rank}
          suit={handCard.suit}
          width={36}
          height={48}
        />
      </View>

      {/* New value display */}
      <Text style={styles.newValueText}>New value: {newValue}</Text>

      {/* Confirm — pulsing glow */}
      <Animated.View style={[styles.glowWrapper, { opacity: glowOpacity }]}>
        <TouchableOpacity
          style={[styles.btnDynamic, confirmButtonStyle, styles.btnDynamicRed]}
          onPress={handleConfirm}
          activeOpacity={0.82}
        >
          <Text style={styles.btnText}>Steal Build</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Cancel */}
      <TouchableOpacity style={styles.btnGhost} onPress={onCancel}>
        <Text style={styles.btnGhostText}>Cancel</Text>
      </TouchableOpacity>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  // Card row
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

  // New value text - single line
  newValueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fbbf24',   // Gold matching modal theme
    marginBottom: 16,
    textAlign: 'center',
  },

  // Pulsing glow wrapper
  glowWrapper: {
    width: '100%',
    marginBottom: 7,
    // Shadow for the glow effect (iOS)
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    // Android elevation keeps it subtle
    elevation: 8,
    borderRadius: 13,
  },

  // Dynamic confirm button — red override on top of team style
  btnDynamic: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  btnDynamicRed: {
    backgroundColor: '#b91c1c',
    borderColor: '#ef4444',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // Cancel ghost button
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
  btnGhostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9b5555',
  },
});

export default StealBuildModal;
