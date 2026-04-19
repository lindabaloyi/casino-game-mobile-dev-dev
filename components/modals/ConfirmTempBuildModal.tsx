/**
 * ConfirmTempBuildModal
 * Confirmation dialog for setting a temp stack's base value.
 */

import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
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

const MODAL_BG = '#1a1a1a';
const MODAL_BORDER = '#28a745';

export function ConfirmTempBuildModal({
  visible,
  stack,
  onConfirm,
  onCancel,
}: ConfirmTempBuildModalProps) {
  const handleCancel = () => {
    onCancel();
  };

  if (!stack) return null;

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
            <Text style={styles.title}>Confirm Build</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.body}>
            <Text style={styles.subtitle}>Finalise — opponents can still steal!</Text>
          
            <View style={styles.fanZone}>
              <View style={styles.cardsRow}>
                {stack.cards?.map((card, index) => (
                  <View key={index} style={styles.cardWrapper}>
                    <PlayingCard rank={card.rank} suit={card.suit} />
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoMain}>Build Value: {stack.value}</Text>
              <Text style={styles.infoSub}>{stack.cards?.length || 0} cards in build</Text>
            </View>

            <TouchableOpacity style={styles.btnGold} onPress={() => onConfirm(stack.value)}>
              <Text style={styles.btnText}>✓ Confirm</Text>
            </TouchableOpacity>

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
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
    textAlign: 'center',
  },
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
    fontSize: 16,
    fontWeight: '700',
    color: '#fde68a',
  },
  infoSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a9a60',
  },
  btnGold: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: '#c8a84b',
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