/**
 * OwnerIndicator
 * Renders either PlayerIcon (party mode) or simple P1/P2 badge.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlayerIcon } from '../../ui/PlayerIcon';
import { useBuildTeamInfo, PLAYER_1_GOLD, PLAYER_2_PURPLE, PLAYER_3_BLUE, PLAYER_4_BURGUNDY } from '../hooks/useBuildTeamInfo';

interface OwnerIndicatorProps {
  /** Owner player index */
  owner: number;
  /** Whether party mode is enabled */
  isPartyMode: boolean;
  /** Total player count (2, 3, or 4) */
  playerCount?: number;
}

export function OwnerIndicator({ owner, isPartyMode, playerCount }: OwnerIndicatorProps) {
  // Use the hook to get colors
  const { colors } = useBuildTeamInfo({
    owner,
    isPartyMode,
    playerCount,
    isExtending: false,
    effectiveSum: 0,
  });

  // Get player color based on playerCount
  const getPlayerColor = (playerIndex: number, count: number): string => {
    if (count === 4) {
      // 4-player free-for-all: P0=purple, P1=gold, P2=blue, P3=burgundy
      switch (playerIndex) {
        case 0: return PLAYER_2_PURPLE;  // Purple
        case 1: return PLAYER_1_GOLD;    // Gold
        case 2: return PLAYER_3_BLUE;    // Blue
        case 3: return PLAYER_4_BURGUNDY; // Burgundy
        default: return PLAYER_2_PURPLE;
      }
    }
    if (count === 3) {
      switch (playerIndex) {
        case 0: return PLAYER_1_GOLD;
        case 1: return PLAYER_2_PURPLE;
        case 2: return PLAYER_3_BLUE;
        default: return PLAYER_2_PURPLE;
      }
    }
    return playerIndex === 0 ? PLAYER_1_GOLD : PLAYER_2_PURPLE;
  };

  if (isPartyMode) {
    return (
      <View style={styles.ownerBadgeContainer}>
        <PlayerIcon 
          playerIndex={owner} 
          size="small" 
        />
      </View>
    );
  }

  const playerColor = getPlayerColor(owner, playerCount || 2);

  return (
    <View style={styles.ownerBadgeContainer}>
      <View style={[
        styles.ownerBadge, 
        { 
          backgroundColor: playerColor,
          borderColor: '#FFFFFF',
          borderWidth: 2,
        }
      ]}>
        <Text style={[styles.ownerText, { color: '#FFFFFF' }]}>P{owner + 1}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ownerBadgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    alignItems: 'center',
  },
  ownerBadge: {
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  ownerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
});

export default OwnerIndicator;
