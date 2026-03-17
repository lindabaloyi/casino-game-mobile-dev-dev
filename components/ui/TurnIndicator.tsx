/**
 * TurnIndicator Component
 * Displays whose turn it is in multiplayer games
 * 
 * Shows compact player labels:
 * - "Your Turn" when it's the current player's turn
 * - "P1", "P2", "P3", "P4" for other players
 * 
 * Uses team colors:
 * - Red (#F44336) for Team A
 * - Purple (#9C27B0) for Team B
 * 
 * For free-for-all (3 or 4 players):
 * - Player 0: Gold
 * - Player 1: Purple
 * - Player 2: Blue
 * - Player 3: Burgundy (4-player only)
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getTeamFromIndex, areTeammates, getPlayerPositionLabel } from '../../shared/game/team';
import { getTeamColors, getPlayerColors, TEAM_A_COLORS, TEAM_B_COLORS, type TeamColors, PLAYER_1_GOLD, PLAYER_2_PURPLE, PLAYER_3_BLUE, PLAYER_4_BURGUNDY } from '../../constants/teamColors';

// Team ID type
type TeamId = 'A' | 'B';

interface TurnIndicatorProps {
  /** Current player index (the one whose turn it is) */
  currentPlayerIndex: number;
  /** This player's index (the local player) */
  playerIndex: number;
  /** Whether this is party mode (4-player with teams) */
  isPartyMode?: boolean;
  /** Total player count (2, 3, or 4) */
  playerCount?: number;
  /** Optional custom styles */
  style?: object;
}

/**
 * Get colors for individual player in free-for-all mode
 */
function getFreeForAllColors(playerIndex: number, playerCount: number): TeamColors {
  if (playerCount === 4) {
    // 4-player free-for-all: P0=purple, P1=gold, P2=blue, P3=burgundy
    switch (playerIndex) {
      case 0: return {
        primary: PLAYER_2_PURPLE,
        secondary: '#F3E5F5',
        accent: '#7B1FA2',
        background: '#F3E5F5',
        text: '#4A148C',
        border: '#BA68C8',
      };
      case 1: return {
        primary: PLAYER_1_GOLD,
        secondary: '#FFF3E0',
        accent: '#E65100',
        background: '#FFF3E0',
        text: '#E65100',
        border: '#FFB74D',
      };
      case 2: return {
        primary: PLAYER_3_BLUE,
        secondary: '#E3F2FD',
        accent: '#1565C0',
        background: '#E3F2FD',
        text: '#0D47A1',
        border: '#64B5F6',
      };
      case 3: return {
        primary: PLAYER_4_BURGUNDY,
        secondary: '#F5E6E8',
        accent: '#5C0018',
        background: '#F5E6E8',
        text: '#5C0018',
        border: '#B76E84',
      };
      default: return {
        primary: PLAYER_2_PURPLE,
        secondary: '#F3E5F5',
        accent: '#7B1FA2',
        background: '#F3E5F5',
        text: '#4A148C',
        border: '#BA68C8',
      };
    }
  }
  // 3-player mode: P0=gold, P1=purple, P2=blue
  switch (playerIndex) {
    case 0: return {
      primary: PLAYER_1_GOLD,
      secondary: '#FFF3E0',
      accent: '#E65100',
      background: '#FFF3E0',
      text: '#E65100',
      border: '#FFB74D',
    };
    case 1: return {
      primary: PLAYER_2_PURPLE,
      secondary: '#F3E5F5',
      accent: '#7B1FA2',
      background: '#F3E5F5',
      text: '#4A148C',
      border: '#BA68C8',
    };
    case 2: return {
      primary: PLAYER_3_BLUE,
      secondary: '#E3F2FD',
      accent: '#1565C0',
      background: '#E3F2FD',
      text: '#0D47A1',
      border: '#64B5F6',
    };
    default: return {
      primary: PLAYER_2_PURPLE,
      secondary: '#F3E5F5',
      accent: '#7B1FA2',
      background: '#F3E5F5',
      text: '#4A148C',
      border: '#BA68C8',
    };
  }
}

/**
 * Get team colors based on player index
 */
function getPlayerTeamColors(playerIndex: number): TeamColors {
  const team = getTeamFromIndex(playerIndex) as TeamId;
  return getTeamColors(team);
}

/**
 * TurnIndicator - displays whose turn it is with team colors
 */
export function TurnIndicator({
  currentPlayerIndex,
  playerIndex,
  isPartyMode = false,
  playerCount = 2,
  style
}: TurnIndicatorProps) {
  // Determine turn type and colors
  const { text, colors, isCurrentPlayer } = useMemo(() => {
    const isMyTurn = currentPlayerIndex === playerIndex;
    const currentTeam = getTeamFromIndex(currentPlayerIndex) as TeamId;
    
    // Get colors based on mode and player count
    let teamColors: TeamColors;
    
    if (isPartyMode) {
      // Party mode (4-player with teams): use team colors
      teamColors = currentTeam === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
    } else if (playerCount >= 3) {
      // Free-for-all mode (3 or 4 players): use individual player colors
      teamColors = getFreeForAllColors(currentPlayerIndex, playerCount);
    } else {
      // 2-player mode: use player-specific colors
      teamColors = getPlayerColors(currentPlayerIndex);
    }
    
    let turnText: string;
    
    if (isMyTurn) {
      turnText = 'Your Turn';
    } else if (isPartyMode) {
      // Party mode: show P1, P2, P3, P4 based on position within team
      turnText = getPlayerPositionLabel(currentPlayerIndex);
    } else {
      // Free-for-all or 2-player: show P1, P2, P3, P4
      turnText = `P${currentPlayerIndex + 1}`;
    }
    
    return {
      text: turnText,
      colors: teamColors,
      isCurrentPlayer: isMyTurn
    };
  }, [currentPlayerIndex, playerIndex, isPartyMode, playerCount]);
  
  // Background color - subtle for non-current players
  const backgroundColor = isCurrentPlayer ? colors.primary : 'rgba(255, 255, 255, 0.15)';
  const textColor = isCurrentPlayer ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)';
  
  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <Text style={[styles.text, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default TurnIndicator;
