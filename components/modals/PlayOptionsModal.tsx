/**
 * PlayOptionsModal
 * Shows build options when accepting a temp stack.
 * Simplified code, PRESERVED logic.
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
import { canPartitionConsecutively } from '../../shared/game/buildCalculator';

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
  console.log('[Debug] PlayOptionsModal RENDER, visible:', visible, 'cards:', cards?.length);
  
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[Debug] PlayOptionsModal useEffect, visible:', visible);
    if (!visible) {
      console.log('[Debug] PlayOptionsModal useEffect skipping - not visible');
      return;
    }
    console.log('[Debug] PlayOptionsModal useEffect starting pulse');
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

  // === PRESERVED GAME LOGIC ===

  // 1. Get possible build values from temp stack cards
  const possibleBuildValues = useMemo(() => {
    console.log('[Debug] possibleBuildValues computing, cards:', cards?.length);
    if (!cards || cards.length === 0) {
      console.log('[Debug] possibleBuildValues: no cards, returning []');
      return [];
    }
    const values: number[] = [];
    const cardValues = cards.map(c => c.value);
    
    for (let v = 1; v <= 10; v++) {
      if (canPartitionConsecutively(cardValues, v)) {
        values.push(v);
      }
    }
    // Also add single card value if all same rank
    const allSameRank = cards.length > 1 && cards.every(c => c.rank === cards[0].rank);
    if (allSameRank && cardValues[0] <= 10 && !values.includes(cardValues[0])) {
      values.push(cardValues[0]);
    }
    const result = values.sort((a, b) => a - b);
    console.log('[Debug] possibleBuildValues result:', result);
    return result;
  }, [cards]);

  // 2. Get team build options (party mode)
  const teamBuildOptions = useMemo(() => {
    console.log('[Debug] teamBuildOptions computing, playerNumber:', playerNumber);
    if (!teamCapturedBuilds || playerNumber === undefined) {
      console.log('[Debug] teamBuildOptions: no teamBuilds, returning []');
      return [];
    }
    const myTeamBuilds = teamCapturedBuilds[playerNumber] ?? [];
    const result = myTeamBuilds.filter(b => possibleBuildValues.includes(b.value));
    console.log('[Debug] teamBuildOptions result:', result.length);
    return result;
  }, [teamCapturedBuilds, playerNumber, possibleBuildValues]);

  // 3. Filter to values player can actually play from hand
  const playableValues = useMemo(() => {
    console.log('[Debug] playableValues computing, possibleBuildValues:', possibleBuildValues?.length);
    if (teamBuildOptions.length > 0) {
      console.log('[Debug] playableValues: has team builds, returning []');
      return [];
    }
    if (!playerHand || playerHand.length === 0) {
      console.log('[Debug] playableValues: no playerHand, returning []');
      return [];
    }
    const result = possibleBuildValues.filter(v => 
      playerHand.some(card => card.value === v)
    );
    console.log('[Debug] playableValues result:', result.length);
    return result;
  }, [possibleBuildValues, playerHand, teamBuildOptions]);

  // 4. Calculate display values - prefer playable, fallback to all possible
  const totalSum = cards?.reduce((sum, c) => sum + (c?.value ?? 0), 0) ?? 0;
  const highestCard = cards?.sort((a, b) => b.value - a.value)[0]?.value ?? 0;
  
  const displayValues: { value: number; label?: string }[] = [];
  const usedValues = new Set<number>();

  // Add playable values first
  playableValues.forEach(v => {
    displayValues.push({ value: v });
    usedValues.add(v);
  });

  // Add total sum if not already shown and player has matching card
  if (totalSum > 0 && !usedValues.has(totalSum) && 
      playableValues.includes(totalSum)) {
    displayValues.push({ value: totalSum, label: `Total (${totalSum})` });
    usedValues.add(totalSum);
  }

  // Add highest card value if not shown
  if (highestCard > 0 && !usedValues.has(highestCard) &&
      playableValues.includes(highestCard)) {
    displayValues.push({ value: highestCard, label: `Single (${highestCard})` });
    usedValues.add(highestCard);
  }

  // If no playable values, show all possible as fallback
  if (displayValues.length === 0 && possibleBuildValues.length > 0) {
    possibleBuildValues.slice(0, 3).forEach(v => {
      if (!usedValues.has(v)) {
        displayValues.push({ value: v });
        usedValues.add(v);
      }
    });
  }

  // Build button component
  const BuildButton = ({ value, isTeam, onPress, label }: { 
    value: number; 
    isTeam?: boolean; 
    onPress: () => void;
    label?: string;
  }) => (
    <Animated.View style={[styles.btnWrapper, { opacity: glowOpacity }]}>
      <TouchableOpacity 
        style={styles.btnGreen} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>
          {label ?? `Build ${value}`}{isTeam ? ' (Team)' : ''}
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
            {/* Show cards */}
            <View style={styles.cardsRow}>
              {cards?.map((card, index) => (
                <PlayingCard 
                  key={index}
                  rank={card.rank} 
                  suit={card.suit}
                  width={36}
                  height={48}
                />
              ))}
            </View>

            {/* Team build options */}
            {teamBuildOptions.map((build, index) => (
              <BuildButton 
                key={`team-${index}`}
                value={build.value}
                isTeam={true}
                onPress={() => handleConfirm(build.value, build.originalOwner)}
                label={`Build ${build.value}`}
              />
            ))}

            {/* Player playable options */}
            {displayValues.map((item, index) => (
              <BuildButton 
                key={item.value}
                value={item.value}
                onPress={() => handleConfirm(item.value)}
                label={item.label}
              />
            ))}

            {/* No options message */}
            {displayValues.length === 0 && teamBuildOptions.length === 0 && (
              <View style={styles.noOptions}>
                <Text style={styles.noOptionsText}>No matching cards</Text>
              </View>
            )}

            {/* Cancel */}
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