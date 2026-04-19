/**
 * StealBuildModal
 * Confirmation dialog for stealing an opponent's build.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
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
  playerCount?: number;
  isPartyMode?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onPlayButtonSound?: () => void;
}

const MODAL_BG = '#1a1a1a';
const MODAL_BORDER = '#dc2626';

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
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
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

  const handleCancel = () => {
    onPlayButtonSound?.();
    onCancel();
  };

  const newValue = buildValue + handCard.value;
  const confirmButtonStyle = getTeamButtonStyle(playerNumber, playerCount, isPartyMode);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Steal Build</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.body}>
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

            <Text style={styles.newValueText}>New value: {newValue}</Text>

            <Animated.View style={[styles.glowWrapper, { opacity: glowOpacity }]}>
              <TouchableOpacity
                style={[styles.btnDynamic, confirmButtonStyle, styles.btnDynamicRed]}
                onPress={handleConfirm}
                activeOpacity={0.82}
              >
                <Text style={styles.btnText}>Steal Build</Text>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity style={styles.btnGhost} onPress={handleCancel}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 320,
    backgroundColor: MODAL_BG,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: MODAL_BORDER,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.5)',
  },
  body: {
    padding: 16,
  },
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
  newValueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fbbf24',
    marginBottom: 16,
    textAlign: 'center',
  },
  glowWrapper: {
    width: '100%',
    marginBottom: 7,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 13,
  },
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
  btnGhost: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,100,100,0.15)',
    alignItems: 'center',
    marginTop: 8,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9b5555',
  },
});

export default StealBuildModal;