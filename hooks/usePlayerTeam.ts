/**
 * usePlayerTeam
 * Custom hook for team and player utilities.
 * Provides team-related logic for party mode (4-player) and 2-player modes.
 */

import { useMemo } from 'react';
import { getTeamFromIndex, areTeammates } from '../shared/game/team';
import { TEAM_A_COLORS, TEAM_B_COLORS, getPlayerColors, type TeamColors } from '../constants/teamColors';

export function usePlayerTeam(playerNumber: number, playerCount: number) {
  const isPartyMode = playerCount === 4;

  const teammateIndex = useMemo(() => {
    if (!isPartyMode) return playerNumber === 0 ? 1 : 0; // 2-player fallback
    // Team A: 0↔1, Team B: 2↔3
    if (playerNumber < 2) return playerNumber === 0 ? 1 : 0;
    return playerNumber === 2 ? 3 : 2;
  }, [playerNumber, isPartyMode]);

  const opponentIndices = useMemo(() => {
    if (!isPartyMode) return [playerNumber === 0 ? 1 : 0];
    return playerNumber < 2 ? [2, 3] : [0, 1];
  }, [playerNumber, isPartyMode]);

  const getPlayerLabel = (idx: number): string => {
    if (!isPartyMode) return `P${idx + 1}`;
    const teamPlayer = idx < 2 ? idx + 1 : idx - 1;
    return `P${teamPlayer}`;
  };

  const getPlayerTeamColors = (idx: number): TeamColors => {
    if (!isPartyMode) {
      // 2-player mode: use player-specific colors (P1=blue, P2=green)
      return getPlayerColors(idx);
    }
    // Party mode: use team colors
    const team = getTeamFromIndex(idx);
    return team === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
  };

  const isFriendly = (owner: number): boolean => {
    if (owner === playerNumber) return true;
    if (isPartyMode) return areTeammates(playerNumber, owner);
    return false;
  };

  const isTeammate = (idx: number): boolean => 
    isPartyMode && areTeammates(playerNumber, idx) && idx !== playerNumber;
  
  const isOpponent = (idx: number): boolean => !isFriendly(idx);

  return {
    isPartyMode,
    teammateIndex,
    opponentIndices,
    getPlayerLabel,
    getPlayerTeamColors,
    isFriendly,
    isTeammate,
    isOpponent,
  };
}

export default usePlayerTeam;
