/**
 * ExtendBuildModal
 * Modal for confirming a build extension.
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
import { Card, BuildStack } from '../../types';

interface ExtendBuildModalProps {
  visible: boolean;
  buildStack: BuildStack;
  playerHand: Card[];
  onConfirm: () => void;
  onCancel: () => void;
  onPlayButtonSound?: () => void;
}

const MODAL_BG = '#1a1a1a';
const MODAL_BORDER = '#28a745';
const BTN_GREEN = '#1e7d3a';
const BTN_GREEN_BORDER = '#28a745';

export function ExtendBuildModal({
  visible,
  buildStack,
  playerHand,
  onConfirm,
  onCancel,
  onPlayButtonSound,
}: ExtendBuildModalProps) {
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

  const pendingExtension = buildStack?.pendingExtension;
  const pendingCards = pendingExtension?.cards || [];

  if (!pendingExtension) {
    return null;
  }

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
            <Text style={styles.title}>Confirm Extension</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.body}>
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

            <Animated.View style={[styles.btnWrapper, { opacity: glowOpacity }]}>
              <TouchableOpacity 
                style={styles.btnGreen} 
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.btnText}>Confirm Extension</Text>
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
  btnWrapper: {
    width: '100%',
    marginBottom: 7,
    borderRadius: 13,
  },
  btnGreen: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: BTN_GREEN,
    borderWidth: 1.5,
    borderColor: BTN_GREEN_BORDER,
    alignItems: 'center',
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
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(40, 167, 69, 0.3)',
    alignItems: 'center',
    marginTop: 8,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6b8a72',
  },
});

export default ExtendBuildModal;