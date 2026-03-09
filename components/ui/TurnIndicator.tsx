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
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getTeamFromIndex, areTeammates, getPlayerPositionLabel } from '../../shared/game/team';
import { getTeamColors, getPlayerColors, TEAM_A_COLORS, TEAM_B_COLORS, type TeamColors } from '../../constants/teamColors';

// Team ID type
type TeamId = 'A' | 'B';

interface TurnIndicatorProps {
  /** Current player index (the one whose turn it is) */
  currentPlayerIndex: number;
  /** This player's index (the local player) */
  playerIndex: number;
  /** Whether this is party mode (4-player) */
  isPartyMode?: boolean;
  /** Optional custom styles */
  style?: object;
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
  style
}: TurnIndicatorProps) {
  // Determine turn type and colors
  const { text, colors, isCurrentPlayer } = useMemo(() => {
    const isMyTurn = currentPlayerIndex === playerIndex;
    const currentTeam = getTeamFromIndex(currentPlayerIndex) as TeamId;
    
    // Get colors based on mode: party mode uses team colors, 2-player uses player colors
    let teamColors: TeamColors;
    if (isPartyMode) {
      teamColors = currentTeam === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
    } else {
      // 2-player mode: use player-specific colors (P1=blue, P2=green)
      teamColors = getPlayerColors(currentPlayerIndex);
    }
    
    let turnText: string;
    
    if (isMyTurn) {
      turnText = 'Your Turn';
    } else if (isPartyMode) {
      // Party mode: show P1, P2, P3, P4 based on position within team
      turnText = getPlayerPositionLabel(currentPlayerIndex);
    } else {
      // 2-player mode: show P1 or P2
      turnText = `P${currentPlayerIndex + 1}`;
    }
    
    return {
      text: turnText,
      colors: teamColors,
      isCurrentPlayer: isMyTurn
    };
  }, [currentPlayerIndex, playerIndex, isPartyMode]);
  
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
