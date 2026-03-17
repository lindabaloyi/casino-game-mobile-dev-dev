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
  const isThreePlayerMode = playerCount === 3;

  const teammateIndex = useMemo(() => {
    if (isThreePlayerMode) {
      // 3-player mode: no teammates
      return -1;
    }
    if (!isPartyMode) return playerNumber === 0 ? 1 : 0; // 2-player fallback
    // Team A: 0↔1, Team B: 2↔3
    if (playerNumber < 2) return playerNumber === 0 ? 1 : 0;
    return playerNumber === 2 ? 3 : 2;
  }, [playerNumber, isPartyMode, isThreePlayerMode]);

  const opponentIndices = useMemo(() => {
    if (isThreePlayerMode) {
      // 3-player mode: all other players are opponents
      return playerCount === 3 
        ? [0, 1, 2, 3].filter(i => i !== playerNumber).slice(0, 2) // Get first 2 opponents
        : [];
    }
    if (!isPartyMode) return [playerNumber === 0 ? 1 : 0];
    return playerNumber < 2 ? [2, 3] : [0, 1];
  }, [playerNumber, isPartyMode, isThreePlayerMode, playerCount]);

  const getPlayerLabel = (idx: number): string => {
    if (isThreePlayerMode) return `P${idx + 1}`;
    if (!isPartyMode) return `P${idx + 1}`;
    const teamPlayer = idx < 2 ? idx + 1 : idx - 1;
    return `P${teamPlayer}`;
  };

  const getPlayerTeamColors = (idx: number): TeamColors => {
    if (isThreePlayerMode) {
      // 3-player mode: use player-specific colors with playerCount
      return getPlayerColors(idx, playerCount);
    }
    if (!isPartyMode) {
      // 2-player mode: use player-specific colors
      return getPlayerColors(idx, 2);
    }
    // Party mode: use team colors
    const team = getTeamFromIndex(idx);
    return team === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
  };

  const isFriendly = (owner: number): boolean => {
    if (owner === playerNumber) return true;
    if (isPartyMode) return areTeammates(playerNumber, owner);
    if (isThreePlayerMode) return false; // No friendly in 3-player
    return false;
  };

  const isTeammate = (idx: number): boolean => {
    if (isThreePlayerMode) return false; // No teammates in 3-player
    return isPartyMode && areTeammates(playerNumber, idx) && idx !== playerNumber;
  };
  
  const isOpponent = (idx: number): boolean => {
    if (isThreePlayerMode) return idx !== playerNumber;
    return !isFriendly(idx);
  };

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
