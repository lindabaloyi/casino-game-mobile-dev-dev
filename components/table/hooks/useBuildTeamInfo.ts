/**
 * Build Team Info Hook
 * Derives team, colors, owner label based on mode.
 */

import { useMemo } from 'react';
import { 
  getTeamFromIndex, 
  getPlayerTag,
  getPlayerPositionLabel
} from '../../../shared/game/team';
import { 
  TEAM_A_COLORS,
  TEAM_B_COLORS,
  getPlayerColors,
  type TeamId,
  type TeamColors 
} from '../../../constants/teamColors';

// Canonical purple from Team B colors
export const CANONICAL_PURPLE = TEAM_B_COLORS.primary;

// Gold color for Player 1 (2-player mode)
export const PLAYER_1_GOLD = '#FF9800';

// Purple for Player 2 (2-player mode)
export const PLAYER_2_PURPLE = TEAM_B_COLORS.primary;

// Blue for Player 3 (3-player mode)
export const PLAYER_3_BLUE = '#2196F3';

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
  
  const { ownerTeam, ownerTag, ownerPosition, colors } = useMemo(() => {
    const team = getTeamFromIndex(owner) as TeamId;
    const tag = getPlayerTag(owner);
    const position = getPlayerPositionLabel(owner);
    
    // Get team colors based on party mode and team
    let teamColors: TeamColors;
    
    if (isPartyMode) {
      // Party mode (4-player): use team-specific colors
      teamColors = team === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
    } else if (isThreePlayerMode) {
      // 3-player mode: use player-specific colors with playerCount
      teamColors = getPlayerColors(owner, playerCount);
    } else {
      // 2-player mode: use gold for P1, purple for P2
      teamColors = owner === 0 
        ? { ...TEAM_B_COLORS, primary: PLAYER_1_GOLD, accent: '#B8860B' }  // Gold for P1
        : TEAM_B_COLORS;  // Purple for P2
    }
    
    return { 
      ownerTeam: team, 
      ownerTag: tag, 
      ownerPosition: position,
      colors: teamColors,
    };
  }, [owner, isPartyMode, isThreePlayerMode, playerCount]);

  // Badge color: accent while incomplete (effectiveSum !== 0), team color when complete
  // Capture uses same colors as extension (team-based, not red)
  const badgeColor = useMemo(() => {
    // Helper function to get player color based on owner and playerCount
    const getPlayerColor = (playerIndex: number, count: number): string => {
      if (count === 3) {
        // 3-player mode: P1=gold, P2=purple, P3=blue
        switch (playerIndex) {
          case 0: return PLAYER_1_GOLD;
          case 1: return PLAYER_2_PURPLE;
          case 2: return PLAYER_3_BLUE;
          default: return PLAYER_2_PURPLE;
        }
      }
      // 2-player mode
      return playerIndex === 0 ? PLAYER_1_GOLD : PLAYER_2_PURPLE;
    };
    
    if (isExtending || isCapturing) {
      if (effectiveSum !== 0) {
        return colors.accent; // incomplete - show accent
      } else {
        // complete – use team color
        return isPartyMode 
          ? (ownerTeam === 'B' ? CANONICAL_PURPLE : PLAYER_1_GOLD)
          : getPlayerColor(owner, playerCount);
      }
    } else {
      // Not extending/capturing – normal team color
      return isPartyMode 
        ? (ownerTeam === 'B' ? CANONICAL_PURPLE : PLAYER_1_GOLD)
        : getPlayerColor(owner, playerCount);
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
