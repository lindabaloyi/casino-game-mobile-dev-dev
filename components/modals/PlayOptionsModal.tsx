/**
 * PlayOptionsModal
 * Shows build options when accepting a temp stack.
 * 
 * Style: Green theme matching StealBuildModal styling
 * Card preview in single horizontal row, full-width buttons with pulse animation.
 */

import React, { useMemo, useEffect, useRef } from 'react';
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
  // Pulsing glow animation on the build buttons
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
    const matchingTeamBuilds = myTeamBuilds.filter(build => {
      if (!possibleBuildValues.includes(build.value)) return false;
      return true;
    });
    return matchingTeamBuilds;
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

  // Build button component with pulsing animation
  const BuildButton = ({ value, isTeam = false, onPress }: { value: number; isTeam?: boolean; onPress: () => void }) => (
    <Animated.View style={[styles.glowWrapper, { opacity: glowOpacity }]}>
      <TouchableOpacity 
        style={styles.btnGreen} 
        onPress={onPress}
        activeOpacity={0.82}
      >
        <Text style={styles.btnText}>
          Build {value}{isTeam ? ' (Team)' : ''}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <ModalSurface
      visible={visible}
      theme="green"
      title="Build Options"
      onClose={handleCancel}
      maxWidth="md"
    >
      {/* Card row - single horizontal line like StealBuildModal */}
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

      {/* Build option buttons - stacked full-width with pulsing */}
      {hasTotalMatch && (
        <BuildButton value={totalSum} onPress={() => handleConfirm(totalSum)} />
      )}
      
      {hasDiffMatch && (
        <BuildButton value={buildValue} onPress={() => handleConfirm(buildValue)} />
      )}
      
      {possibleBuildValues.filter(v => v !== totalSum && v !== buildValue).slice(0, 3).map(val => (
        <BuildButton key={val} value={val} onPress={() => handleConfirm(val)} />
      ))}

      {/* Team build options */}
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

      {/* Cancel button - ghost style */}
      <TouchableOpacity style={styles.btnGhost} onPress={handleCancel}>
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
    // Shadow for the glow effect (iOS)
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    // Android elevation keeps it subtle
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
    borderColor: 'rgba(40, 167, 69, 0.3)',   // Green-tinted border
    alignItems: 'center',
    marginTop: 8,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6b8a72',   // Muted green
  },

  // No options message
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
