/**
 * ExtendBuildModal
 * Modal for confirming a build extension.
 * 
 * Style: Green theme per casino-noir spec
 * Matches PlayOptionsModal/StealBuildModal styling
 * Card preview in single horizontal row, full-width buttons with pulse animation.
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
import { Card, BuildStack } from '../../types';

interface ExtendBuildModalProps {
  visible: boolean;
  buildStack: BuildStack;
  playerHand: Card[];
  onConfirm: () => void;
  onCancel: () => void;
  onPlayButtonSound?: () => void;
}

export function ExtendBuildModal({
  visible,
  buildStack,
  playerHand,
  onConfirm,
  onCancel,
  onPlayButtonSound,
}: ExtendBuildModalProps) {
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

  const pendingExtension = buildStack?.pendingExtension;
  const pendingCards = pendingExtension?.cards || [];

  if (!pendingExtension) {
    return null;
  }

  return (
    <ModalSurface
      visible={visible}
      theme="green"
      title="Confirm Extension"
      onClose={onCancel}
      maxWidth="md"
    >
      {/* Card row - show pending extension cards */}
      <View style={styles.cardsRow}>
        {pendingCards.map((item, index) => (
          <PlayingCard
            key={`pending-${index}`}
            rank={item.card.rank}
            suit={item.card.suit}
            width={36}
            height={48}
          />
        ))}
      </View>

      {/* Confirm button - green with pulsing glow */}
      <Animated.View style={[styles.glowWrapper, { opacity: glowOpacity }]}>
        <TouchableOpacity 
          style={styles.btnGreen} 
          onPress={handleConfirm}
          activeOpacity={0.82}
        >
          <Text style={styles.btnText}>Confirm Extension</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Cancel button - ghost style */}
      <TouchableOpacity style={styles.btnGhost} onPress={onCancel}>
        <Text style={styles.btnGhostText}>Cancel</Text>
      </TouchableOpacity>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  // Card row - single horizontal line
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 4,
  },

  // Pulsing glow wrapper
  glowWrapper: {
    width: '100%',
    marginBottom: 7,
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 13,
  },

  // Primary button - green theme
  btnGreen: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: '#1e7d3a',
    borderWidth: 1.5,
    borderColor: '#28a745',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // Cancel ghost button - green themed
  btnGhost: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(40, 167, 69, 0.3)',
    alignItems: 'center',
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6b8a72',
  },
});

export default ExtendBuildModal;