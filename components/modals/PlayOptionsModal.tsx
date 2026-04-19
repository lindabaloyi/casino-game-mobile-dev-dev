/**
 * PlayOptionsModal
 * Shows build options when accepting a temp stack.
 */

import React, { useMemo, useEffect, useRef } from 'react';
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
import { getBuildHint, canPartitionConsecutively } from '../../shared/game/buildCalculator';

interface PlayOptionsModalProps {
  visible: boolean;
  cards: Card[];
  playerHand: Card[];
  teamCapturedBuilds?: { [playerIndex: number]: { value: number; originalOwner: number; capturedBy: number; stackId: string; cards: any[] }[] };
  playerNumber: number;
  players?: { captures: Card[] }[];
  onConfirm: (buildValue: number, originalOwner?: number) => void;
  onCancel: () => void;
  onPlayButtonSound?: () => void;
}

const MODAL_BG = '#1a1a1a';
const MODAL_BORDER = '#28a745';
const BTN_GREEN = '#1e7d3a';
const BTN_GREEN_BORDER = '#28a745';

export function PlayOptionsModal({
  visible,
  cards,
  playerHand,
  teamCapturedBuilds,
  playerNumber,
  players,
  onConfirm,
  onCancel,
  onPlayButtonSound,
}: PlayOptionsModalProps) {
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

  const handleConfirm = (buildValue: number, originalOwner?: number) => {
    onPlayButtonSound?.();
    onConfirm(buildValue, originalOwner);
  };

  const handleCancel = () => {
    onPlayButtonSound?.();
    onCancel();
  };

  const cardValues = cards?.map(c => c.value) ?? [];
  const totalSum = cards?.reduce((sum, c) => sum + c.value, 0) ?? 0;
  
  const hint = useMemo(() => getBuildHint(cardValues), [cardValues]);
  
  const possibleBuildValues = useMemo(() => {
    const values = new Set<number>();
    for (let target = 1; target <= 10; target++) {
      if (canPartitionConsecutively(cardValues, target)) {
        values.add(target);
      }
    }
    const allSameRank = cards && cards.length > 1 && cards.every(c => c.rank === cards[0].rank);
    if (allSameRank && cardValues[0] <= 10) {
      values.add(cardValues[0]);
    }
    return Array.from(values).sort((a, b) => a - b);
  }, [cardValues, cards]);
  
  const teamBuildOptions = useMemo(() => {
    if (!teamCapturedBuilds || playerNumber === undefined) return [];
    const myTeamBuilds = teamCapturedBuilds[playerNumber] ?? [];
    return myTeamBuilds.filter(build => possibleBuildValues.includes(build.value));
  }, [teamCapturedBuilds, playerNumber, possibleBuildValues]);
  
  const matchingOptions = useMemo(() => {
    if (teamBuildOptions.length > 0) return [];
    return possibleBuildValues.filter(val => 
      (playerHand ?? []).some(card => card.value === val)
    );
  }, [possibleBuildValues, playerHand, teamBuildOptions]);

  const buildValue = (cards || []).sort((a, b) => b.value - a.value)[0]?.value ?? 0;
  const hasTotalMatch = matchingOptions.includes(totalSum);
  const hasDiffMatch = matchingOptions.includes(buildValue);

  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return null;
  }

  const BuildButton = ({ value, isTeam = false, onPress }: { value: number; isTeam?: boolean; onPress: () => void }) => (
    <Animated.View style={[styles.btnWrapper, { opacity: glowOpacity }]}>
      <TouchableOpacity 
        style={styles.btnGreen} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>
          Build {value}{isTeam ? ' (Team)' : ''}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

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
            <Text style={styles.title}>Build Options</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.body}>
            <View style={styles.cardsRow}>
              {cards.map((card, index) => (
                <PlayingCard 
                  key={index}
                  rank={card.rank} 
                  suit={card.suit}
                  width={36}
                  height={48}
                />
              ))}
            </View>

            {hasTotalMatch && (
              <BuildButton value={totalSum} onPress={() => handleConfirm(totalSum)} />
            )}
            
            {hasDiffMatch && (
              <BuildButton value={buildValue} onPress={() => handleConfirm(buildValue)} />
            )}
            
            {possibleBuildValues.filter(v => v !== totalSum && v !== buildValue).slice(0, 3).map(val => (
              <BuildButton key={val} value={val} onPress={() => handleConfirm(val)} />
            ))}

            {teamBuildOptions.map((build, index) => (
              <BuildButton 
                key={`team-${index}`}
                value={build.value}
                isTeam={true}
                onPress={() => handleConfirm(build.value, build.originalOwner)}
              />
            ))}

            {!hasTotalMatch && !hasDiffMatch && teamBuildOptions.length === 0 && (
              <View style={styles.noOptions}>
                <Text style={styles.noOptionsText}>No matching cards</Text>
              </View>
            )}

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
  noOptions: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  noOptionsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f87171',
  },
});

export default PlayOptionsModal;