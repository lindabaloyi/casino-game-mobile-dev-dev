/**
 * Build Team Info Hook
 * Derives team, colors, owner label based on mode.
 * Now uses constants/teamColors.ts for consistent player colors.
 */

import { useMemo } from 'react';
import { 
  getTeamFromIndex, 
  getPlayerTag,
  getPlayerPositionLabel
} from '../../shared/game/team';
import { 
  TEAM_A_COLORS,
  TEAM_B_COLORS,
  getPlayerColors,
  type TeamId,
  type TeamColors 
} from '../../constants/teamColors';


interface UseBuildTeamInfoProps {
  /** Owner player index */
  owner: number;
  /** Whether party mode is enabled (4-player) */
  isPartyMode: boolean;
  /** Total player count (2, 3, or 4) */
  playerCount?: number;
  /** Whether there's a pending extension */
  isExtending: boolean;
  /** Whether there's a pending capture (opponent building to capture) */
  isCapturing?: boolean;
  /** Current effective sum of pending cards */
  effectiveSum?: number;
}

interface UseBuildTeamInfoResult {
  /** Team identifier (A or B) */
  ownerTeam: TeamId;
  /** Player tag (e.g., "P1") */
  ownerTag: string;
  /** Position label */
  ownerPosition: string;
  /** Team colors based on mode */
  colors: TeamColors;
  /** Badge color based on extension state */
  badgeColor: string;
  /** Owner text color */
  ownerTextColor: string;
}

export function useBuildTeamInfo({
  owner,
  isPartyMode,
  playerCount = 2,
  isExtending,
  isCapturing = false,
  effectiveSum = 0,
}: UseBuildTeamInfoProps): UseBuildTeamInfoResult {
  const isThreePlayerMode = playerCount === 3;
  const isFourPlayerFreeForAll = playerCount === 4 && !isPartyMode;
  
  const { ownerTeam, ownerTag, ownerPosition, colors } = useMemo(() => {
    const team = getTeamFromIndex(owner) as TeamId;
    const tag = getPlayerTag(owner);
    const position = getPlayerPositionLabel(owner);
    
    // Get team colors based on party mode and team
    let teamColors: TeamColors;
    
    if (isPartyMode) {
      // Party mode (4-player): use team-specific colors
      teamColors = team === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
    } else if (isFourPlayerFreeForAll) {
      // 4-player free-for-all: use individual player colors
      teamColors = getPlayerColors(owner, 4);
    } else if (isThreePlayerMode) {
      // 3-player mode: use player-specific colors with playerCount
      teamColors = getPlayerColors(owner, playerCount);
    } else {
      // 2-player mode: use player-specific colors
      teamColors = getPlayerColors(owner, 2);
    }
    
    return { 
      ownerTeam: team, 
      ownerTag: tag, 
      ownerPosition: position,
      colors: teamColors,
    };
  }, [owner, isPartyMode, isThreePlayerMode, isFourPlayerFreeForAll, playerCount]);

  // Badge color: accent while incomplete (effectiveSum !== 0), team color when complete
  // Capture uses same colors as extension (team-based, not red)
  const badgeColor = useMemo(() => {
    // Use centralized getPlayerColors() for consistent player colors
    const getPlayerColor = (playerIndex: number, count: number): string => {
      const playerColors = getPlayerColors(playerIndex, count);
      return playerColors.primary;
    };
    
    if (isExtending || isCapturing) {
      if (effectiveSum !== 0) {
        return colors.accent; // incomplete - show accent
      } else {
        // complete – use player color
        return isPartyMode 
          ? (ownerTeam === 'B' ? TEAM_B_COLORS.primary : TEAM_A_COLORS.primary)
          : getPlayerColors(owner, playerCount).primary;
      }
    } else {
      // Not extending/capturing – normal player color
      return isPartyMode 
        ? (ownerTeam === 'B' ? TEAM_B_COLORS.primary : TEAM_A_COLORS.primary)
        : getPlayerColors(owner, playerCount).primary;
    }
  }, [isExtending, isCapturing, effectiveSum, colors, isPartyMode, ownerTeam, owner, playerCount]);

  // Owner label color - use WHITE for consistency with party mode
  const ownerTextColor = isPartyMode ? colors.text : '#FFFFFF';

  return {
    ownerTeam,
    ownerTag,
    ownerPosition,
    colors,
    badgeColor,
    ownerTextColor,
  };
}

export default useBuildTeamInfo;
