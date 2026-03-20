/**
 * usePlayerTeam
 * Custom hook for team and player utilities.
 * Provides team-related logic for party mode (4-player with teams), free-for-all (4-player without teams), and 2/3-player modes.
 */

import { useMemo } from 'react';
import { getTeamFromIndex, areTeammates } from '../shared/game/team';
import { TEAM_A_COLORS, TEAM_B_COLORS, getPlayerColors, type TeamColors } from '../constants/teamColors';

type GameMode = 'two-hands' | 'three-hands' | 'party' | 'four-hands' | 'freeforall' | 'tournament' | undefined;

export function usePlayerTeam(playerNumber: number, playerCount: number, gameMode?: GameMode) {
  // Free-for-all mode: 4-player without teams
  const isFreeForAll = gameMode === 'freeforall' || (playerCount === 4 && gameMode !== 'party');
  const isPartyMode = gameMode === 'party' || (playerCount === 4 && !isFreeForAll);
  // Fix: 'two-hands' is 2-player mode, not 3-player mode
  const isThreePlayerMode = gameMode === 'three-hands' || playerCount === 3;

  const teammateIndex = useMemo(() => {
    if (isThreePlayerMode || isFreeForAll) {
      // 3-player mode and free-for-all: no teammates
      return -1;
    }
    if (!isPartyMode) return playerNumber === 0 ? 1 : 0; // 2-player fallback
    // Team A: 0↔1, Team B: 2↔3
    if (playerNumber < 2) return playerNumber === 0 ? 1 : 0;
    return playerNumber === 2 ? 3 : 2;
  }, [playerNumber, isPartyMode, isThreePlayerMode, isFreeForAll]);

  const opponentIndices = useMemo(() => {
    if (isThreePlayerMode || isFreeForAll) {
      // 3-player mode or free-for-all: all other players are opponents
      if (playerCount === 4 && isFreeForAll) {
        // 4-player free-for-all: return all other players
        return [0, 1, 2, 3].filter(i => i !== playerNumber);
      }
      return playerCount === 3 
        ? [0, 1, 2, 3].filter(i => i !== playerNumber).slice(0, 2) // Get first 2 opponents for 3-player
        : [];
    }
    if (!isPartyMode) return [playerNumber === 0 ? 1 : 0];
    return playerNumber < 2 ? [2, 3] : [0, 1];
  }, [playerNumber, isPartyMode, isThreePlayerMode, isFreeForAll, playerCount]);

  const getPlayerLabel = (idx: number): string => {
    if (isThreePlayerMode || isFreeForAll) return `P${idx + 1}`;
    if (!isPartyMode) return `P${idx + 1}`;
    const teamPlayer = idx < 2 ? idx + 1 : idx - 1;
    return `P${teamPlayer}`;
  };

  const getPlayerTeamColors = (idx: number): TeamColors => {
    if (isThreePlayerMode || isFreeForAll) {
      // 3-player or free-for-all mode: use player-specific colors with playerCount
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
    if (isThreePlayerMode || isFreeForAll) return false; // No friendly in 3-player or free-for-all
    return false;
  };

  const isTeammate = (idx: number): boolean => {
    if (isThreePlayerMode || isFreeForAll) return false; // No teammates in 3-player or free-for-all
    return isPartyMode && areTeammates(playerNumber, idx) && idx !== playerNumber;
  };
  
  const isOpponent = (idx: number): boolean => {
    if (isThreePlayerMode || isFreeForAll) return idx !== playerNumber;
    return !isFriendly(idx);
  };

  return {
    isPartyMode,
    isFreeForAll,
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
