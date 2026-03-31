/**
 * Team Color System
 * Distinct colors for Team A and Team B in party mode (4-player games)
 */

export type TeamId = 'A' | 'B';

export interface TeamColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  border: string;
}

/**
 * Team A colors - Sky Blue theme (matches Player 1 in all modes)
 * Players 0 and 2 belong to Team A
 */
export const TEAM_A_COLORS: TeamColors = {
  primary: '#0284c7',   // Sky Blue
  secondary: '#E0F2FE',
  accent: '#0369A1',
  background: '#E0F2FE',
  text: '#0369A1',
  border: '#38BDF8',
};

/**
 * Team B colors - Amber theme (matches Player 2 in all modes)
 * Players 1 and 3 belong to Team B
 */
export const TEAM_B_COLORS: TeamColors = {
  primary: '#c2410c',   // Amber
  secondary: '#FFF7ED',
  accent: '#9A3412',
  background: '#FFF7ED',
  text: '#9A3412',
  border: '#FB923C',
};

/**
 * Get team colors by team ID
 * @param teamId - 'A' or 'B'
 * @returns TeamColors object for the specified team
 */
export function getTeamColors(teamId: 'A' | 'B'): TeamColors {
  return teamId === 'A' ? TEAM_A_COLORS : TEAM_B_COLORS;
}

/**
 * Player 1 colors - Sky Blue theme for all modes
 * Distinct color to differentiate from Player 2
 */
export const PLAYER_1_COLORS: TeamColors = {
  primary: '#0284c7',   // Sky Blue
  secondary: '#E0F2FE',
  accent: '#0369A1',
  background: '#E0F2FE',
  text: '#0369A1',
  border: '#38BDF8',
};

/**
 * Player 2 colors - Amber theme for all modes
 * Distinct color to differentiate from Player 1
 */
export const PLAYER_2_COLORS: TeamColors = {
  primary: '#c2410c',   // Amber
  secondary: '#FFF7ED',
  accent: '#9A3412',
  background: '#FFF7ED',
  text: '#9A3412',
  border: '#FB923C',
};

/**
 * Player 3 colors - Lime Green for 4-player FFA only
 * Not used in 3-hand mode (uses Fuchsia instead)
 */
export const PLAYER_3_COLORS: TeamColors = {
  primary: '#15803d',   // Lime Green
  secondary: '#DCFCE7',
  accent: '#166534',
  background: '#DCFCE7',
  text: '#166534',
  border: '#4ADE80',
};

/**
 * Player 4 colors - Fuchsia for 4-player FFA and 3-hand mode
 * Used by P4 in 4-player FFA, and P3 in 3-hand mode
 */
export const PLAYER_4_COLORS: TeamColors = {
  primary: '#a21caf',   // Fuchsia
  secondary: '#FCE7F3',
  accent: '#BE185D',
  background: '#FCE7F3',
  text: '#BE185D',
  border: '#F472B6',
};

// Player 1 Sky Blue (for individual player identification)
export const PLAYER_1_GOLD = '#0284c7';

// Player 2 Amber (for individual player identification)
export const PLAYER_2_PURPLE = '#c2410c';

// Player 3 Lime Green (for individual player identification)
export const PLAYER_3_BLUE = '#15803d';

// Player 4 Fuchsia (for individual player identification)
export const PLAYER_4_FUCHSIA = '#a21caf';

/**
 * Get player-specific colors for 2, 3, or 4-player mode
 * @param playerIndex - Player index (0 for P1, 1 for P2, 2 for P3, 3 for P4)
 * @param playerCount - Total number of players (2, 3, or 4)
 * @returns TeamColors object for the specified player
 */
export function getPlayerColors(playerIndex: number, playerCount: number = 2): TeamColors {
  // For 4-player free-for-all mode: P0=SkyBlue, P1=Amber, P2=LimeGreen, P3=Fuchsia
  if (playerCount === 4) {
    switch (playerIndex) {
      case 0: return PLAYER_1_COLORS;   // Sky Blue
      case 1: return PLAYER_2_COLORS;   // Amber
      case 2: return PLAYER_3_COLORS;   // Lime Green
      case 3: return PLAYER_4_COLORS;   // Fuchsia
      default: return NEUTRAL_COLORS;
    }
  }
  // For 3-player mode: P0=SkyBlue, P1=Amber, P2=Fuchsia (NOT Lime!)
  if (playerCount === 3) {
    switch (playerIndex) {
      case 0: return PLAYER_1_COLORS;   // Sky Blue
      case 1: return PLAYER_2_COLORS;   // Amber
      case 2: return PLAYER_4_COLORS;   // Fuchsia (NOT PLAYER_3_COLORS!)
      default: return NEUTRAL_COLORS;
    }
  }
  // For 2-player mode: player 0 = Player 1 (Sky Blue), player 1 = Player 2 (Amber)
  return playerIndex === 0 ? PLAYER_1_COLORS : PLAYER_2_COLORS;
}

/**
 * Get the opposite team's colors
 * @param teamId - 'A' or 'B'
 * @returns TeamColors for the opposite team
 */
export function getOppositeTeamColors(teamId: 'A' | 'B'): TeamColors {
  return teamId === 'A' ? TEAM_B_COLORS : TEAM_A_COLORS;
}

/**
 * Check if a player index belongs to Team A
 * @param playerIndex - Player index (0-3)
 * @returns true if player is on Team A
 */
export function isTeamA(playerIndex: number): boolean {
  return playerIndex < 2;
}

/**
 * Check if a player index belongs to Team B
 * @param playerIndex - Player index (0-3)
 * @returns true if player is on Team B
 */
export function isTeamB(playerIndex: number): boolean {
  return playerIndex >= 2;
}

/**
 * Default neutral colors for 2-player games
 */
export const NEUTRAL_COLORS: TeamColors = {
  primary: '#868E96',
  secondary: '#F8F9FA',
  accent: '#495057',
  background: '#FFFFFF',
  text: '#212529',
  border: '#ADB5BD',
};
