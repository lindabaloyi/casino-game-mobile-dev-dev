/**
 * TurnIndicator Component
 * Displays whose turn it is in multiplayer games
 * 
 * Shows compact player labels:
 * - "Your Turn" when it's the current player's turn
 * - "P1", "P2", "P3", "P4" for other players
 * 
 * Uses team colors:
 * - Team A: Sky Blue (#0284c7)
 * - Team B: Amber (#c2410c)
 * 
 * For free-for-all (3 or 4 players):
 * - Player 0: Sky Blue (#0284c7)
 * - Player 1: Amber (#c2410c)
 * - Player 2: Fuchsia (#a21caf) for 3-player, Lime Green (#15803d) for 4-player
 * - Player 3: Fuchsia (#a21caf) for 4-player
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getTeamFromIndex, getPlayerPositionLabel } from '../../shared/game/team';
import { getTeamColors, getPlayerColors, TEAM_A_COLORS, TEAM_B_COLORS, type TeamColors, type TeamId } from '../../constants/teamColors';

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
    const currentTeam = getTeamFromIndex(currentPlayerIndex);
    
    // Get colors based on mode and player count
    let teamColors: TeamColors;
    
    if (isPartyMode) {
      // Party mode (4-player with teams): use team colors
      teamColors = (currentTeam as TeamId) === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
    } else if (playerCount >= 3) {
      // Free-for-all mode (3 or 4 players): use getPlayerColors for correct colors
      teamColors = getPlayerColors(currentPlayerIndex, playerCount);
    } else {
      // 2-player mode: use player-specific colors
      teamColors = getPlayerColors(currentPlayerIndex, playerCount);
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
