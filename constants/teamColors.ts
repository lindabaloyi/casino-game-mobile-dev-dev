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
 * Team A colors - Red theme (rgb(244, 67, 54))
 * Players 0 and 1 belong to Team A
 */
export const TEAM_A_COLORS: TeamColors = {
  primary: '#F44336',
  secondary: '#FFEBEE',
  accent: '#C62828',
  background: '#FFEBEE',
  text: '#B71C1C',
  border: '#EF5350',
};

/**
 * Team B colors - Purple/Violet theme
 * Players 2 and 3 belong to Team B
 * Using the canonical purple #9C27B0 from the design system
 */
export const TEAM_B_COLORS: TeamColors = {
  primary: '#9C27B0',
  secondary: '#F3E5F5',
  accent: '#7B1FA2',
  background: '#F3E5F5',
  text: '#4A148C',
  border: '#BA68C8',
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
